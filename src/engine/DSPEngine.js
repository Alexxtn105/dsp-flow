/**
 * DSP Engine - движок выполнения графа обработки сигналов
 */

import DSPLib from './DSPLib';
import {DSP_BLOCK_TYPES, SIGNAL_TYPES} from '../utils/constants';

export class DSPEngine {
    constructor() {
        this.compiledGraph = null;
        this.sampleRate = 48000; // Частота дискретизации по умолчанию
        this.bufferSize = 1024; // Размер буфера
        this.isRunning = false;
        this.nodeOutputs = new Map(); // Храним выходные данные каждого узла
        this.executionStats = {
            totalSamples: 0,
            executionTime: 0,
            cyclesExecuted: 0
        };
    }

    /**
     * Инициализация с компилированным графом
     */
    initialize(compiledGraph, config = {}) {
        console.log('🚀 DSP Engine: Initializing...');
        
        this.compiledGraph = compiledGraph;
        this.sampleRate = config.sampleRate || this.sampleRate;
        this.bufferSize = config.bufferSize || this.bufferSize;
        this.nodeOutputs.clear();

        console.log('✅ DSP Engine initialized:', {
            nodes: compiledGraph.executionOrder.length,
            sampleRate: this.sampleRate,
            bufferSize: this.bufferSize
        });

        return true;
    }

    /**
     * Запуск обработки
     */
    start() {
        if (!this.compiledGraph) {
            console.error('❌ Cannot start: No compiled graph');
            return false;
        }

        console.log('▶️ DSP Engine: Starting...');
        this.isRunning = true;
        this.executionStats.cyclesExecuted = 0;
        
        return true;
    }

    /**
     * Остановка обработки
     */
    stop() {
        console.log('⏸️ DSP Engine: Stopping...');
        this.isRunning = false;
        
        return true;
    }

    /**
     * Выполнение одного цикла обработки
     */
    executeOneCycle() {
        if (!this.isRunning || !this.compiledGraph) {
            return null;
        }

        const startTime = performance.now();
        
        try {
            // Очищаем предыдущие выходы
            this.nodeOutputs.clear();

            // Выполняем узлы в порядке топологической сортировки
            for (const node of this.compiledGraph.executionOrder) {
                this.executeNode(node);
            }

            this.executionStats.cyclesExecuted++;
            this.executionStats.executionTime = performance.now() - startTime;
            this.executionStats.totalSamples += this.bufferSize;

            // Возвращаем выходы всех sink узлов
            return this.getSinkOutputs();
            
        } catch (error) {
            console.error('❌ Execution error:', error);
            this.stop();
            return null;
        }
    }

    /**
     * Выполнение отдельного узла
     */
    executeNode(node) {
        const blockType = node.data.blockType;
        const params = node.data.params;

        // Получаем входные данные от зависимостей
        const inputs = this.getNodeInputs(node);

        let output;

        try {
            // Выполняем обработку в зависимости от типа блока
            switch (blockType) {

                case DSP_BLOCK_TYPES.AUDIO_FILE:
                    output = this.processAudioFile(params);
                    break;

                case DSP_BLOCK_TYPES.INPUT_SIGNAL:
                    output = this.processInputSignal(params);
                    break;

                case DSP_BLOCK_TYPES.REF_SINE_GEN:
                    output = this.processSineGenerator(params);
                    break;

                case DSP_BLOCK_TYPES.REF_COSINE_GEN:
                    output = this.processCosineGenerator(params);
                    break;

                case DSP_BLOCK_TYPES.FIR_FILTER:
                case DSP_BLOCK_TYPES.LOWPASS_FIR:
                case DSP_BLOCK_TYPES.HIGHPASS_FIR:
                    output = this.processFIRFilter(inputs[0], params);
                    break;

                case DSP_BLOCK_TYPES.BANDPASS_FIR:
                    output = this.processBandpassFilter(inputs[0], params);
                    break;

                case DSP_BLOCK_TYPES.HILBERT_TRANSFORMER:
                    output = this.processHilbertTransform(inputs[0], params);
                    break;

                case DSP_BLOCK_TYPES.FFT:
                    output = this.processFFT(inputs[0], params);
                    break;

                case DSP_BLOCK_TYPES.SLIDING_FFT:
                    output = this.processSlidingFFT(inputs[0], params);
                    break;

                case DSP_BLOCK_TYPES.INTEGRATOR:
                    output = this.processIntegrator(inputs[0], params);
                    break;

                case DSP_BLOCK_TYPES.SUMMER:
                    output = this.processSummer(inputs, params);
                    break;

                case DSP_BLOCK_TYPES.MULTIPLIER:
                    output = this.processMultiplier(inputs, params);
                    break;

                case DSP_BLOCK_TYPES.PHASE_DETECTOR:
                    output = this.processPhaseDetector(inputs[0], params);
                    break;

                case DSP_BLOCK_TYPES.FREQUENCY_DETECTOR:
                    output = this.processFrequencyDetector(inputs[0], params);
                    break;

                case DSP_BLOCK_TYPES.OSCILLOSCOPE:
                case DSP_BLOCK_TYPES.SPECTRUM_ANALYZER:
                case DSP_BLOCK_TYPES.CONSTELLATION:
                    // Узлы визуализации не производят выход
                    output = inputs[0];
                    break;

                default:
                    console.warn(`Unknown block type: ${blockType}`);
                    output = inputs[0] || new Float32Array(this.bufferSize);
            }

            // Сохраняем выход узла
            this.nodeOutputs.set(node.id, output);

        } catch (error) {
            console.error(`Error executing node ${node.data.label}:`, error);
            throw error;
        }
    }

//обработка аудио
    processAudioFile(params) {
        if (!params.audioData || !params.audioData.samples) {
            return new Float32Array(this.bufferSize).fill(0);
        }

        // Берем следующий блок из аудио данных
        // Здесь нужна логика работы с offset и loop
        const samples = params.audioData.samples;
        const offset = params._currentOffset || 0;

        const output = new Float32Array(this.bufferSize);
        const remainingSamples = samples.length - offset;

        if (remainingSamples > 0) {
            const copyLength = Math.min(this.bufferSize, remainingSamples);
            output.set(samples.subarray(offset, offset + copyLength));
            params._currentOffset = offset + copyLength;

            // Если loop и данные закончились
            if (copyLength < this.bufferSize && params.loop) {
                params._currentOffset = 0;
            }
        } else if (params.loop) {
            // Начинаем сначала
            params._currentOffset = 0;
            return this.processAudioFile(params);
        }

        return output;
    }

    /**
     * Получение входов узла
     */
    getNodeInputs(node) {
        const dependencies = this.compiledGraph.dependencies.get(node.id) || [];
        return dependencies.map(depId => this.nodeOutputs.get(depId));
    }

    /**
     * Обработчики блоков
     */
    processInputSignal(params) {
        const { frequency = 1000, amplitude = 1.0, signalType = 'sine' } = params;
        
        if (signalType === 'sine') {
            return DSPLib.generateSine(frequency, amplitude, this.sampleRate, this.bufferSize);
        } else {
            return DSPLib.generateCosine(frequency, amplitude, this.sampleRate, this.bufferSize);
        }
    }

    processSineGenerator(params) {
        const { frequency = 1000, amplitude = 1.0, phase = 0 } = params;
        return DSPLib.generateSine(frequency, amplitude, this.sampleRate, this.bufferSize, phase);
    }

    processCosineGenerator(params) {
        const { frequency = 1000, amplitude = 1.0, phase = 0 } = params;
        return DSPLib.generateCosine(frequency, amplitude, this.sampleRate, this.bufferSize, phase);
    }

    processFIRFilter(input, params) {
        if (!input) return new Float32Array(this.bufferSize);
        
        const { order = 64, cutoff = 1000, filterType = 'lowpass' } = params;
        const coefficients = DSPLib.generateFIRCoefficients(order, cutoff, this.sampleRate, filterType);
        return DSPLib.firFilter(input, coefficients);
    }

    processBandpassFilter(input, params) {
        if (!input) return new Float32Array(this.bufferSize);
        
        const { order = 64, lowCutoff = 1000, highCutoff = 3000 } = params;
        return DSPLib.bandpassFilter(input, order, lowCutoff, highCutoff, this.sampleRate);
    }

    processHilbertTransform(input, params) {
        if (!input) return { real: new Float32Array(this.bufferSize), imag: new Float32Array(this.bufferSize) };
        
        const { order = 64 } = params;
        return DSPLib.hilbertTransform(input, order);
    }

    processFFT(input, params) {
        if (!input) return { real: new Float32Array(this.bufferSize / 2), imag: new Float32Array(this.bufferSize / 2) };
        
        const { fftSize = this.bufferSize } = params;
        return DSPLib.fft(input, fftSize);
    }

    processSlidingFFT(input, params) {
        if (!input) return [];
        
        const { windowSize = 1024, overlap = 512, fftSize = 1024 } = params;
        const hopSize = windowSize - overlap;
        return DSPLib.slidingFFT(input, windowSize, hopSize, fftSize);
    }

    processIntegrator(input, params) {
        if (!input) return new Float32Array(this.bufferSize);
        return DSPLib.integrate(input);
    }

    processSummer(inputs, params) {
        if (!inputs || inputs.length === 0) return new Float32Array(this.bufferSize);
        return DSPLib.sum(inputs);
    }

    processMultiplier(inputs, params) {
        if (!inputs || inputs.length < 2) return new Float32Array(this.bufferSize);
        return DSPLib.multiply(inputs[0], inputs[1]);
    }

    processPhaseDetector(input, params) {
        if (!input || !input.real) return new Float32Array(this.bufferSize);
        const { referenceFrequency = 1000 } = params;
        return DSPLib.phaseDetector(input, referenceFrequency, this.sampleRate);
    }

    processFrequencyDetector(input, params) {
        if (!input || !input.real) return new Float32Array(this.bufferSize);
        return DSPLib.frequencyDetector(input, this.sampleRate);
    }

    /**
     * Получить выходы узлов-стоков
     */
    getSinkOutputs() {
        const outputs = {};
        
        for (const sinkNode of this.compiledGraph.sinkNodes) {
            const output = this.nodeOutputs.get(sinkNode.id);
            outputs[sinkNode.id] = {
                node: sinkNode,
                data: output
            };
        }

        return outputs;
    }

    /**
     * Получить статистику выполнения
     */
    getStats() {
        return {
            ...this.executionStats,
            isRunning: this.isRunning,
            sampleRate: this.sampleRate,
            bufferSize: this.bufferSize
        };
    }

    /**
     * Получить данные узла
     */
    getNodeOutput(nodeId) {
        return this.nodeOutputs.get(nodeId);
    }

    /**
     * Установить параметры
     */
    setConfig(config) {
        if (config.sampleRate) this.sampleRate = config.sampleRate;
        if (config.bufferSize) this.bufferSize = config.bufferSize;
    }
}

export default DSPEngine;
