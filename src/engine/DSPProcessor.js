/**
 * DSPProcessor - процессор для обработки DSP графа
 *
 * Выполняет потоковую обработку аудио данных через
 * скомпилированный граф блоков
 */

import GraphCompiler from './GraphCompiler';
import WavFileService from './WavFileService';
import * as DSPBlocks from './blocks';

class DSPProcessor {
    constructor() {
        this.isRunning = false;
        this.currentSample = 0;
        this.chunkSize = 1024; // Размер обрабатываемого чанка
        this.processingInterval = null;
        this.compiledGraph = null;
        this.blockStates = new Map(); // Состояния блоков (выходные буферы)
        this.onProgress = null;
        this.onBlockOutput = null;
        this.onComplete = null;
        this.onError = null;
        this.sampleRate = 48000;
        this.isFileMode = false;
        this.isManualMode = false;

        // Audio playback context
        this.audioContext = null;
        this.nextAudioStartTime = 0;
    }

    /**
     * Toggles manual mode
     */
    setManualMode(enabled) {
        this.isManualMode = enabled;
        if (enabled && this.isRunning) {
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

        // Инициализируем состояния для каждого блока
        for (const block of this.compiledGraph) {
            this.blockStates.set(block.nodeId, {
                output: null,
                initialized: false
            });

            // Если у блока есть метод init, вызываем его для предварительного расчета (например, коэффициентов фильтра)
            const BlockProcessor = this.getBlockProcessor(block.blockType);
            if (BlockProcessor && typeof BlockProcessor.init === 'function') {
                // Передаем params и sampleRate
                const paramsWithSampleRate = { ...block.params, sampleRate: this.sampleRate };
                BlockProcessor.init(block.nodeId, paramsWithSampleRate, this.sampleRate);
            }
        }

        return result;
    }

    /**
     * Запускает обработку
     * @param {number} processingSpeed - скорость обработки (отсчётов в секунду)
     */
    start(processingSpeed = null) {
        if (this.isRunning) return;
        if (!this.compiledGraph) {
            console.error('Граф не скомпилирован');
            return;
        }

        this.isRunning = true;

        // В режиме файла берём sample rate из файла, иначе используем установленный
        const sampleRate = this.isFileMode ? WavFileService.getSampleRate() : this.sampleRate;

        // Рассчитываем интервал обработки
        // По умолчанию обрабатываем в реальном времени
        const effectiveSpeed = processingSpeed || sampleRate;
        const intervalMs = (this.chunkSize / effectiveSpeed) * 1000;

        // Инициализируем AudioContext для воспроизведения
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.nextAudioStartTime = this.audioContext.currentTime;

        if (!this.isManualMode) {
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

        this.isRunning = true;
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
        this.isRunning = false;
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
        this.currentSample = 0;
        this.blockStates.clear();
    }

    /**
     * Обрабатывает следующий чанк данных
     */
    processNextChunk() {
        // Проверяем, не достигнут ли конец файла (только в режиме файла)
        if (this.isFileMode && WavFileService.isEndOfFile(this.currentSample)) {
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
                    // Clone buffer for visualization to avoid mutation issues
                    const outputCopy = new Float32Array(output);
                    this.onBlockOutput(block.nodeId, outputCopy);
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
                const totalSamples = this.isFileMode ? WavFileService.getTotalSamples() : 0;
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
        // Собираем входные данные
        const inputs = [];
        for (const input of block.inputs) {
            const sourceState = this.blockStates.get(input.sourceNodeId);
            if (sourceState?.output) {
                inputs.push(sourceState.output);
            }
        }

        // Получаем процессор для типа блока
        const BlockProcessor = this.getBlockProcessor(block.blockType);

        if (!BlockProcessor) {
            // Для неизвестных блоков просто пропускаем данные
            return inputs[0] || new Float32Array(this.chunkSize);
        }

        // Для генераторов (Входной сигнал) - читаем из WAV
        if (block.blockType === 'Audio File' && this.isFileMode) {
            return WavFileService.readChunk(this.currentSample, this.chunkSize) ||
                new Float32Array(this.chunkSize);
        }

        // Передаем nodeId для блоков, которым нужно сохранять состояние (например, генераторы)
        // Добавляем sampleRate в params
        const paramsWithSampleRate = { ...block.params, sampleRate: this.sampleRate };

        // Выполняем блок
        return BlockProcessor.process(inputs, paramsWithSampleRate, this.chunkSize, block.nodeId);
    }

    /**
     * Возвращает процессор для типа блока
     * @param {string} blockType
     */
    getBlockProcessor(blockType) {
        const processorMap = {
            'Audio File': DSPBlocks.InputSignalBlock,
            'Реф. синус. ген.': DSPBlocks.SineGeneratorBlock,
            'Реф. косинус. ген.': DSPBlocks.CosineGeneratorBlock,
            'Референсный синусный генератор': DSPBlocks.SineGeneratorBlock,
            'Референсный косинусный генератор': DSPBlocks.CosineGeneratorBlock,
            'Синусный генератор': DSPBlocks.SineGeneratorBlock,
            'Косинусный генератор': DSPBlocks.CosineGeneratorBlock,
            'КИХ-Фильтр': DSPBlocks.FIRFilterBlock,
            'Полосовой КИХ-фильтр': DSPBlocks.FIRFilterBlock,
            'ФВЧ КИХ-фильтр': DSPBlocks.FIRFilterBlock,
            'ФНЧ КИХ-фильтр': DSPBlocks.FIRFilterBlock,
            'Сумматор': DSPBlocks.SummerBlock,
            'Перемножитель': DSPBlocks.MultiplierBlock,
            'БПФ': DSPBlocks.FFTBlock,
            'Осциллограф': DSPBlocks.PassthroughBlock,
            'Спектроанализатор': DSPBlocks.SpectrumAnalyzerBlock,
            'Водопад': DSPBlocks.SpectrumAnalyzerBlock, // Используем анализатор спектра для водопада
            'Динамик': DSPBlocks.SpeakerBlock,
        };

        return processorMap[blockType] || DSPBlocks.PassthroughBlock;
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
        if (!this.isFileMode) return;
        this.currentSample = Math.max(0, Math.min(sample, WavFileService.getTotalSamples()));
    }

    /**
     * Переход к определённому проценту
     */
    seekToPercent(percent) {
        if (!this.isFileMode) return;
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
        this.isFileMode = isFile;
    }

    /**
     * Воспроизводит чанк аудио через Web Audio API
     */
    playAudioChunk(chunkData) {
        if (!this.audioContext) return;

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

export default new DSPProcessor();
