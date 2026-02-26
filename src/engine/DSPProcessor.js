/**
 * DSPProcessor - процессор для обработки DSP графа
 *
 * Выполняет потоковую обработку аудио данных через
 * скомпилированный граф блоков
 */

import GraphCompiler from './GraphCompiler';
import WavFileService from './WavFileService';
import registry from './PluginRegistry';

const ProcessorState = Object.freeze({
    IDLE: 'IDLE',
    RUNNING_REALTIME: 'RUNNING_REALTIME',
    RUNNING_MANUAL: 'RUNNING_MANUAL',
    RUNNING_FILE: 'RUNNING_FILE',
});

class DSPProcessor {
    constructor() {
        this.state = ProcessorState.IDLE;
        this._manualMode = false;
        this._fileMode = false;
        this.currentSample = 0;
        this.chunkSize = 1024; // Размер обрабатываемого чанка
        this.processingInterval = null;
        this.compiledGraph = null;
        this.blockStates = new Map(); // Состояния блоков (выходные буферы)
        this._nodeTypeMap = new Map(); // Отслеживание типов блоков для обнаружения смены типа (M1)
        this.onProgress = null;
        this.onBlockOutput = null;
        this.onComplete = null;
        this.onError = null;
        this.sampleRate = 48000;

        // Audio playback context
        this.audioContext = null;
        this.nextAudioStartTime = 0;
    }

    /** Обратная совместимость: геттер/сеттер isRunning */
    get isRunning() {
        return this.state !== ProcessorState.IDLE;
    }

    set isRunning(value) {
        if (!value) {
            this.state = ProcessorState.IDLE;
        } else if (this.state === ProcessorState.IDLE) {
            // Определяем состояние на основе текущих конфигурационных флагов
            if (this._fileMode) this.state = ProcessorState.RUNNING_FILE;
            else if (this._manualMode) this.state = ProcessorState.RUNNING_MANUAL;
            else this.state = ProcessorState.RUNNING_REALTIME;
        }
    }

    /** Обратная совместимость: геттер/сеттер isManualMode */
    get isManualMode() {
        return this._manualMode;
    }

    set isManualMode(value) {
        this._manualMode = !!value;
    }

    /** Обратная совместимость: геттер/сеттер isFileMode */
    get isFileMode() {
        return this._fileMode;
    }

    set isFileMode(value) {
        this._fileMode = !!value;
    }

    /**
     * Toggles manual mode
     */
    setManualMode(enabled) {
        this._manualMode = !!enabled;
        if (enabled && this.state === ProcessorState.RUNNING_REALTIME) {
            this.stop(); // Stop real-time interval if switching to manual
        }
    }

    /**
     * Инициализирует процессор с графом
     * @param {Array} nodes - узлы графа
     * @param {Array} edges - рёбра графа
     */
    initialize(nodes, edges) {
        // Компилируем граф
        const result = GraphCompiler.compile(nodes, edges);

        if (!result.success) {
            return result;
        }

        this.compiledGraph = result.executionOrder;
        this.blockStates.clear();
        this.currentSample = 0;

        // Удаляем состояния для узлов, которых нет в новом графе
        const currentNodeIds = new Set(this.compiledGraph.map(b => b.nodeId));
        for (const nodeId of this.blockStates.keys()) {
            if (!currentNodeIds.has(nodeId)) {
                this.blockStates.delete(nodeId);
            }
        }
        // Очищаем состояния плагинов для удалённых узлов
        registry.clearStatesForRemovedNodes(currentNodeIds);

        // M1: Очищаем состояния при смене типа блока
        for (const block of this.compiledGraph) {
            const prevType = this._nodeTypeMap.get(block.nodeId);
            if (prevType && prevType !== block.blockType) {
                // Тип блока изменился — удаляем старое состояние процессора
                const oldProcessor = registry.getProcessor(prevType);
                if (oldProcessor && oldProcessor.states) {
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
        for (const block of this.compiledGraph) {
            this.blockStates.set(block.nodeId, {
                output: null,
                initialized: false
            });

            // Если у блока есть метод init, вызываем его для предварительного расчета (например, коэффициентов фильтра)
            const BlockProcessor = registry.getProcessor(block.blockType);
            if (BlockProcessor && typeof BlockProcessor.init === 'function') {
                try {
                    const paramsWithSampleRate = { ...block.params, sampleRate: this.sampleRate };
                    BlockProcessor.init(block.nodeId, paramsWithSampleRate, this.sampleRate);
                } catch (error) {
                    return {
                        success: false,
                        errors: [{
                            type: 'init_error',
                            message: `Ошибка инициализации блока "${block.blockType}": ${error.message}`,
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
     * @param {number} processingSpeed - скорость обработки (отсчётов в секунду)
     */
    async start(processingSpeed = null) {
        if (this.isRunning) return;
        if (!this.compiledGraph) {
            console.error('Граф не скомпилирован');
            return;
        }

        // В режиме файла берём sample rate из файла, иначе используем установленный
        const sampleRate = this._fileMode ? WavFileService.getSampleRate() : this.sampleRate;

        if (!sampleRate || sampleRate <= 0) {
            const error = new Error(`Некорректная частота дискретизации: ${sampleRate}`);
            if (this.onError) {
                this.onError(error);
            } else {
                console.error(error.message);
            }
            return;
        }

        // Определяем состояние на основе конфигурационных флагов
        if (this._fileMode) this.state = ProcessorState.RUNNING_FILE;
        else if (this._manualMode) this.state = ProcessorState.RUNNING_MANUAL;
        else this.state = ProcessorState.RUNNING_REALTIME;

        // Рассчитываем интервал обработки
        // По умолчанию обрабатываем в реальном времени
        const effectiveSpeed = processingSpeed || sampleRate;
        const intervalMs = (this.chunkSize / effectiveSpeed) * 1000;

        // Инициализируем AudioContext для воспроизведения (один на всё приложение)
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        // Переиспользуем контекст в WavFileService
        WavFileService.init(this.audioContext);
        this.nextAudioStartTime = this.audioContext.currentTime;

        if (this.state !== ProcessorState.RUNNING_MANUAL) {
            this.processingInterval = setInterval(() => {
                this.processNextChunk();
            }, intervalMs);
        }
    }

    /**
     * Выполняет один шаг обработки (только для ручного режима)
     * @param {number} numSamples - количество отсчетов
     */
    step(numSamples) {
        if (!this.compiledGraph) return;

        // Temporarily set chunkSize to the requested step size
        const originalChunkSize = this.chunkSize;
        this.chunkSize = numSamples;

        if (this.state === ProcessorState.IDLE) {
            this.state = ProcessorState.RUNNING_MANUAL;
        }
        this.processNextChunk();

        // If it was stopped by processNextChunk (e.g. End of File), keep it false
        // Otherwise, in manual mode we usually consider it "running" while waiting for next step?
        // Actually, we'll keep isRunning=true if simulation is active.

        this.chunkSize = originalChunkSize;
    }

    /**
     * Останавливает обработку (пауза)
     */
    stop() {
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
     * Сброс к началу
     */
    reset() {
        this.stop();
        this._manualMode = false;
        this._fileMode = false;
        this.currentSample = 0;
        this.blockStates.clear();
        this._nodeTypeMap.clear();

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

        // Очищаем внутренние состояния всех процессоров через реестр
        registry.clearAllStates();
    }

    /**
     * Обрабатывает следующий чанк данных
     */
    processNextChunk() {
        // Проверяем, не достигнут ли конец файла (только в режиме файла)
        if (this._fileMode && WavFileService.isEndOfFile(this.currentSample)) {
            this.stop();
            if (this.onComplete) {
                this.onComplete();
            }
            return;
        }

        try {
            // Обрабатываем каждый блок в порядке топологической сортировки
            for (const block of this.compiledGraph) {
                const output = this.executeBlock(block);
                this.blockStates.set(block.nodeId, {
                    output,
                    initialized: true
                });
                if (output && this.onBlockOutput) {
                    this.onBlockOutput(block.nodeId, output);
                }

                // Если это Speaker и не замьючен - воспроизводим
                if (block.blockType === 'Динамик' && !block.params.muted && output && this.audioContext) {
                    this.playAudioChunk(output);
                }
            }

            // Обновляем позицию
            this.currentSample += this.chunkSize;

            // Уведомляем о прогрессе
            if (this.onProgress) {
                const totalSamples = this._fileMode ? WavFileService.getTotalSamples() : 0;
                const progress = totalSamples > 0 ? this.currentSample / totalSamples : 0;

                this.onProgress({
                    currentSample: this.currentSample,
                    totalSamples: totalSamples,
                    progress: progress
                });
            }
        } catch (error) {
            console.error('Ошибка обработки:', error);
            this.stop();
            if (this.onError) {
                this.onError(error);
            }
        }
    }

    /**
     * Выполняет один блок
     * @param {Object} block - описание блока из compiledGraph
     * @returns {Float32Array} выходные данные
     */
    executeBlock(block) {
        // Входы уже отсортированы при компиляции графа (GraphCompiler)
        const inputs = [];
        for (const input of block.inputs) {
            const sourceState = this.blockStates.get(input.sourceNodeId);
            if (sourceState?.output) {
                inputs.push(sourceState.output);
            }
        }

        // Получаем процессор для типа блока
        const BlockProcessor = registry.getProcessor(block.blockType);

        if (!BlockProcessor) {
            // Для неизвестных блоков просто пропускаем данные
            return inputs[0] || new Float32Array(this.chunkSize);
        }

        // Для генераторов (Входной сигнал) - читаем из WAV
        if (block.blockType === 'Audio File' && this._fileMode) {
            return WavFileService.readChunk(this.currentSample, this.chunkSize);
        }

        // Передаем nodeId для блоков, которым нужно сохранять состояние (например, генераторы)
        // Добавляем sampleRate в params
        const paramsWithSampleRate = { ...block.params, sampleRate: this.sampleRate };

        // Выполняем блок
        return BlockProcessor.process(inputs, paramsWithSampleRate, this.chunkSize, block.nodeId);
    }

    /**
     * Устанавливает размер чанка
     */
    setChunkSize(size) {
        this.chunkSize = size;
    }

    /**
     * Переход к определённой позиции
     */
    seekTo(sample) {
        if (!this._fileMode) return;
        this.currentSample = Math.max(0, Math.min(sample, WavFileService.getTotalSamples()));
    }

    /**
     * Переход к определённому проценту
     */
    seekToPercent(percent) {
        if (!this._fileMode) return;
        const sample = Math.floor(WavFileService.getTotalSamples() * percent);
        this.seekTo(sample);
    }

    /**
     * Устанавливает частоту дискретизации
     */
    setSampleRate(rate) {
        this.sampleRate = rate;
    }

    /**
     * Устанавливает режим работы (файл или генератор)
     */
    setFileMode(isFile) {
        this._fileMode = !!isFile;
    }

    /**
     * Воспроизводит чанк аудио через Web Audio API
     */
    playAudioChunk(chunkData) {
        if (!this.audioContext) return;
        if (!this.sampleRate || this.sampleRate <= 0) return;

        // Создаем буфер
        const buffer = this.audioContext.createBuffer(1, chunkData.length, this.sampleRate);
        const channelData = buffer.getChannelData(0);

        // Копируем данные
        for (let i = 0; i < chunkData.length; i++) {
            channelData[i] = chunkData[i];
        }

        // Создаем источник
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        // Планируем воспроизведение без разрывов
        const startTime = Math.max(this.audioContext.currentTime, this.nextAudioStartTime);
        source.start(startTime);

        // Обновляем время следующего чанка
        this.nextAudioStartTime = startTime + buffer.duration;
    }
}

const processor = new DSPProcessor();
export { ProcessorState };
export default processor;
