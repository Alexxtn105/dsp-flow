/**
 * DSPProcessor - процессор для обработки DSP графа
 *
 * Выполняет потоковую обработку аудио данных через
 * скомпилированный граф блоков
 */

import GraphCompiler from './GraphCompiler';
import WavFileService from './WavFileService';
import MicrophoneService from './MicrophoneService';
import registry from './PluginRegistry';
import i18n from '../locales/i18n';
import {
    ProcessorState,
    isStatefulProcessor,
} from './types';
import type {
    DSPNode,
    DSPEdge,
    ExecutionBlock,
    BlockOutput,
    BlockState,
    CompilationResult,
    ProcessingProgress,
    ProcessorStateValue,
} from './types';

const t = (key: string, options?: Record<string, unknown>): string =>
    i18n.t(key, { ns: 'validation', ...options }) as string;

/** Проверяет, является ли выход множественным */
function isMultiOutput(output: BlockOutput): output is { outputs: Float32Array[] } {
    return output !== null && typeof output === 'object' && 'outputs' in output;
}

/** Извлекает primary Float32Array из любого BlockOutput */
function getPrimaryOutput(output: BlockOutput): Float32Array | null {
    if (output instanceof Float32Array) return output;
    if (isMultiOutput(output)) return output.outputs[0] ?? null;
    return null; // { channels } — visualization, нет primary
}

class DSPProcessor {
    state: ProcessorStateValue = ProcessorState.IDLE;
    private _manualMode = false;
    private _fileMode = false;
    currentSample = 0;
    chunkSize = 1024;
    processingInterval: ReturnType<typeof setInterval> | null = null;
    compiledGraph: ExecutionBlock[] | null = null;
    blockStates: Map<string, BlockState> = new Map();
    private _nodeTypeMap: Map<string, string> = new Map();
    onProgress: ((progress: ProcessingProgress) => void) | null = null;
    onBlockOutput: ((nodeId: string, output: BlockOutput) => void) | null = null;
    onComplete: (() => void) | null = null;
    onError: ((error: Error) => void) | null = null;
    sampleRate = 48000;

    // Audio playback context
    audioContext: AudioContext | null = null;
    private nextAudioStartTime = 0;

    /** Обратная совместимость: геттер/сеттер isRunning */
    get isRunning(): boolean {
        return this.state !== ProcessorState.IDLE;
    }

    set isRunning(value: boolean) {
        if (!value) {
            this.state = ProcessorState.IDLE;
        } else if (this.state === ProcessorState.IDLE) {
            if (this._manualMode) this.state = ProcessorState.RUNNING_MANUAL;
            else if (this._fileMode) this.state = ProcessorState.RUNNING_FILE;
            else this.state = ProcessorState.RUNNING_REALTIME;
        }
    }

    /** Обратная совместимость: геттер/сеттер isManualMode */
    get isManualMode(): boolean {
        return this._manualMode;
    }

    set isManualMode(value: boolean) {
        this._manualMode = !!value;
    }

    /** Обратная совместимость: геттер/сеттер isFileMode */
    get isFileMode(): boolean {
        return this._fileMode;
    }

    set isFileMode(value: boolean) {
        this._fileMode = !!value;
    }

    /**
     * Toggles manual mode
     */
    setManualMode(enabled: boolean): void {
        this._manualMode = !!enabled;
        if (enabled && this.state === ProcessorState.RUNNING_REALTIME) {
            this.stop();
        }
    }

    /**
     * Инициализирует процессор с графом
     */
    initialize(nodes: DSPNode[], edges: DSPEdge[]): CompilationResult {
        // Компилируем граф
        const result = GraphCompiler.compile(nodes, edges);

        if (!result.success) {
            return result;
        }

        this.compiledGraph = result.executionOrder;
        this.blockStates.clear();
        this.currentSample = 0;

        // Удаляем состояния для узлов, которых нет в новом графе
        const currentNodeIds = new Set(this.compiledGraph!.map(b => b.nodeId));
        for (const nodeId of this.blockStates.keys()) {
            if (!currentNodeIds.has(nodeId)) {
                this.blockStates.delete(nodeId);
            }
        }
        // Очищаем состояния плагинов для удалённых узлов
        registry.clearStatesForRemovedNodes(currentNodeIds);

        // M1: Очищаем состояния при смене типа блока
        for (const block of this.compiledGraph!) {
            const prevType = this._nodeTypeMap.get(block.nodeId);
            if (prevType && prevType !== block.blockType) {
                const oldProcessor = registry.getProcessor(prevType);
                if (oldProcessor && isStatefulProcessor(oldProcessor)) {
                    oldProcessor.states.delete(block.nodeId);
                }
                this.blockStates.delete(block.nodeId);
            }
            this._nodeTypeMap.set(block.nodeId, block.blockType);
        }
        // Удаляем из _nodeTypeMap узлы, которых больше нет
        for (const nodeId of this._nodeTypeMap.keys()) {
            if (!currentNodeIds.has(nodeId)) {
                this._nodeTypeMap.delete(nodeId);
            }
        }

        // Инициализируем состояния для каждого блока
        for (const block of this.compiledGraph!) {
            const cachedParams = { ...block.params, sampleRate: this.sampleRate };
            this.blockStates.set(block.nodeId, {
                output: null,
                initialized: false,
                cachedParams
            });

            const BlockProcessor = registry.getProcessor(block.blockType);
            if (BlockProcessor && 'init' in BlockProcessor && typeof BlockProcessor.init === 'function') {
                try {
                    (BlockProcessor as { init: (nodeId: string, params: Record<string, unknown>, sampleRate: number) => void })
                        .init(block.nodeId, cachedParams, this.sampleRate);
                } catch (error) {
                    return {
                        success: false,
                        errors: [{
                            type: 'init_error',
                            message: t('processor.initError', { blockType: block.blockType, message: (error as Error).message }),
                            nodeId: block.nodeId
                        }],
                        warnings: result.warnings || [],
                        executionOrder: null
                    };
                }
            }
        }

        return result;
    }

    /**
     * Запускает обработку
     */
    async start(processingSpeed: number | null = null): Promise<void> {
        if (this.isRunning) return;
        if (!this.compiledGraph) {
            console.error(t('processor.graphNotCompiled'));
            return;
        }

        const sampleRate = this._fileMode ? WavFileService.getSampleRate() : this.sampleRate;

        if (!sampleRate || sampleRate <= 0) {
            const error = new Error(t('processor.invalidSampleRate', { rate: sampleRate }));
            if (this.onError) {
                this.onError(error);
            } else {
                console.error(error.message);
            }
            return;
        }

        if (this._manualMode) this.state = ProcessorState.RUNNING_MANUAL;
        else if (this._fileMode) this.state = ProcessorState.RUNNING_FILE;
        else this.state = ProcessorState.RUNNING_REALTIME;

        const effectiveSpeed = processingSpeed || sampleRate;
        const intervalMs = (this.chunkSize / effectiveSpeed) * 1000;

        // Инициализируем AudioContext для воспроизведения
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        WavFileService.init(this.audioContext);
        this.nextAudioStartTime = this.audioContext.currentTime;

        // Запускаем MicrophoneService, если в графе есть microphone-input
        const hasMicrophone = this.compiledGraph!.some(b => b.blockType === 'microphone-input');
        if (hasMicrophone) {
            await MicrophoneService.start(this.audioContext);
        }

        if (this.state !== ProcessorState.RUNNING_MANUAL) {
            this.processingInterval = setInterval(() => {
                this.processNextChunk();
            }, intervalMs);
        }
    }

    /**
     * Выполняет один шаг обработки (только для ручного режима)
     */
    step(numSamples: number): void {
        if (!this.compiledGraph) return;

        const originalChunkSize = this.chunkSize;
        this.chunkSize = numSamples;

        if (this.state === ProcessorState.IDLE) {
            this.state = ProcessorState.RUNNING_MANUAL;
        }
        this.processNextChunk();

        this.chunkSize = originalChunkSize;
    }

    /**
     * Останавливает обработку (пауза)
     */
    stop(): void {
        this.state = ProcessorState.IDLE;
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        if (this.audioContext) {
            this.audioContext.suspend();
        }
    }

    /**
     * Перемотка в начало (сохраняет скомпилированный граф)
     */
    rewind(): void {
        this.stop();
        this.currentSample = 0;
        if (this.audioContext) {
            this.nextAudioStartTime = this.audioContext.currentTime;
        }
        registry.clearAllStates();
        for (const [, state] of this.blockStates) {
            state.output = null;
            state.initialized = false;
        }
    }

    /**
     * Сброс к началу
     */
    reset(): void {
        this.stop();
        this._manualMode = false;
        this._fileMode = false;
        this.currentSample = 0;
        this.blockStates.clear();
        this._nodeTypeMap.clear();

        // Сбрасываем WavFileService ДО закрытия AudioContext,
        // чтобы он не хранил ссылку на закрытый контекст (N2)
        WavFileService.reset();

        // Останавливаем захват микрофона
        MicrophoneService.stop();

        // Закрываем AudioContext, чтобы не копить ресурсы
        if (this.audioContext) {
            try {
                if (this.audioContext.state !== 'closed') {
                    this.audioContext.close();
                }
            } catch {
                // AudioContext already closed — ignore
            }
            this.audioContext = null;
        }

        registry.clearAllStates();
    }

    /**
     * Обрабатывает следующий чанк данных
     */
    processNextChunk(): void {
        if (this._fileMode && WavFileService.isEndOfFile(this.currentSample)) {
            this.stop();
            if (this.onComplete) {
                this.onComplete();
            }
            return;
        }

        try {
            for (const block of this.compiledGraph!) {
                const output = this.executeBlock(block);
                const blockState = this.blockStates.get(block.nodeId)!;
                blockState.output = output;
                blockState.initialized = true;

                // NaN/Infinity guard
                if (output instanceof Float32Array) {
                    for (let i = 0; i < output.length; i++) {
                        if (!isFinite(output[i])) output[i] = 0;
                    }
                }
                if (output && this.onBlockOutput) {
                    this.onBlockOutput(block.nodeId, output);
                }

                // Если это Speaker — воспроизводим
                if (block.blockType === 'speaker' && output && this.audioContext) {
                    const speakerData = getPrimaryOutput(output);
                    if (speakerData) {
                        let hasSignal = false;
                        for (let i = 0; i < speakerData.length; i++) {
                            if (speakerData[i] !== 0) { hasSignal = true; break; }
                        }
                        if (hasSignal) {
                            this.playAudioChunk(speakerData);
                        }
                    }
                }
            }

            this.currentSample += this.chunkSize;

            if (this.onProgress) {
                const totalSamples = this._fileMode ? WavFileService.getTotalSamples() : 0;
                const progress = totalSamples > 0 ? this.currentSample / totalSamples : 0;

                this.onProgress({
                    currentSample: this.currentSample,
                    totalSamples,
                    progress
                });
            }
        } catch (error) {
            console.error(t('processor.processingError'), error);
            this.stop();
            if (this.onError) {
                this.onError(error as Error);
            }
        }
    }

    /**
     * Выполняет один блок
     */
    executeBlock(block: ExecutionBlock): BlockOutput {
        const inputs: (Float32Array | null)[] = [];
        for (const input of block.inputs) {
            const sourceState = this.blockStates.get(input.sourceNodeId);
            let sourceData: Float32Array | null = null;
            if (sourceState?.output) {
                const srcHandleMatch = input.sourceHandle?.match(/^output-(\d+)$/);
                if (srcHandleMatch && isMultiOutput(sourceState.output)) {
                    sourceData = sourceState.output.outputs[parseInt(srcHandleMatch[1], 10)] ?? null;
                } else if (isMultiOutput(sourceState.output)) {
                    sourceData = sourceState.output.outputs[0] ?? null;
                } else if (sourceState.output instanceof Float32Array) {
                    sourceData = sourceState.output;
                }
            }

            const handleMatch = input.targetHandle?.match(/^input-(\d+)$/);
            if (handleMatch) {
                const idx = parseInt(handleMatch[1], 10);
                while (inputs.length <= idx) inputs.push(null);
                inputs[idx] = sourceData;
            } else {
                if (sourceData) {
                    inputs.push(sourceData);
                }
            }
        }

        const BlockProcessor = registry.getProcessor(block.blockType);

        if (!BlockProcessor) {
            return inputs[0] ?? new Float32Array(this.chunkSize);
        }

        // Для генераторов (Входной сигнал) - читаем из WAV
        if (block.blockType === 'audio-file' && this._fileMode) {
            return WavFileService.readChunk(this.currentSample, this.chunkSize);
        }

        // Микрофонный вход — читаем из кольцевого буфера MicrophoneService
        if (block.blockType === 'microphone-input' && MicrophoneService.isActive) {
            const gain = (block.params?.gain as number) ?? 1.0;
            return MicrophoneService.readChunk(this.chunkSize, gain);
        }

        // Используем кешированные params (с sampleRate)
        const blockState = this.blockStates.get(block.nodeId);
        let paramsWithSampleRate = blockState?.cachedParams;
        if (!paramsWithSampleRate || paramsWithSampleRate.sampleRate !== this.sampleRate) {
            paramsWithSampleRate = { ...block.params, sampleRate: this.sampleRate };
            if (blockState) blockState.cachedParams = paramsWithSampleRate;
        }

        return BlockProcessor.process(inputs, paramsWithSampleRate, this.chunkSize, block.nodeId);
    }

    setChunkSize(size: number): void {
        this.chunkSize = size;
    }

    seekTo(sample: number): void {
        if (!this._fileMode) return;
        this.currentSample = Math.max(0, Math.min(sample, WavFileService.getTotalSamples()));
        if (this.audioContext) {
            this.nextAudioStartTime = this.audioContext.currentTime;
        }
    }

    seekToPercent(percent: number): void {
        if (!this._fileMode) return;
        const sample = Math.floor(WavFileService.getTotalSamples() * percent);
        this.seekTo(sample);
    }

    setSampleRate(rate: number): void {
        if (!rate || rate <= 0) {
            console.error(t('processor.invalidSampleRate', { rate }));
            return;
        }
        this.sampleRate = rate;
    }

    setFileMode(isFile: boolean): void {
        this._fileMode = !!isFile;
    }

    /**
     * Воспроизводит чанк аудио через Web Audio API
     */
    playAudioChunk(chunkData: Float32Array): void {
        if (!this.audioContext) return;
        if (!this.sampleRate || this.sampleRate <= 0) return;

        const buffer = this.audioContext.createBuffer(1, chunkData.length, this.sampleRate);
        const channelData = buffer.getChannelData(0);

        for (let i = 0; i < chunkData.length; i++) {
            channelData[i] = chunkData[i];
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        const startTime = Math.max(this.audioContext.currentTime, this.nextAudioStartTime);
        source.start(startTime);

        this.nextAudioStartTime = startTime + buffer.duration;
    }
}

const processor = new DSPProcessor();
export { ProcessorState };
export default processor;
