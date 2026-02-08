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

        this.processingInterval = setInterval(() => {
            this.processNextChunk();
        }, intervalMs);
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

                // Уведомляем о выходных данных блока (для визуализации)
                if (this.onBlockOutput) {
                    this.onBlockOutput(block.nodeId, output, block.blockType);
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
        if (block.blockType === 'Входной сигнал' && this.isFileMode) {
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
     */
    getBlockProcessor(blockType) {
        const processorMap = {
            'Входной сигнал': DSPBlocks.InputSignalBlock,
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
            'Спектроанализатор': DSPBlocks.FFTBlock,
            'Водопад': DSPBlocks.FFTBlock,
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
}

export default new DSPProcessor();
