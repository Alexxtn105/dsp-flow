/**
 * DSP Execution Store - управление состоянием выполнения с использованием MobX
 */

import { makeObservable, observable, action, computed, reaction } from 'mobx';
import GraphCompiler from '../engine/GraphCompiler';
import DSPEngine from '../engine/DSPEngine';

export class DSPExecutionStore {
    // Observable state
    isRunning = false;
    compiledGraph = null;
    compilationErrors = [];
    executionData = new Map();
    visualizationData = new Map();
    
    sampleRate = 48000;
    bufferSize = 1024;
    
    executionStats = {
        totalSamples: 0,
        executionTime: 0,
        cyclesExecuted: 0
    };

    // Engines
    compiler = null;
    engine = null;

    // Animation frame ID
    animationFrameId = null;

    constructor() {
        makeObservable(this, {
            // Observables
            isRunning: observable,
            compiledGraph: observable,
            compilationErrors: observable,
            executionData: observable,
            visualizationData: observable,
            sampleRate: observable,
            bufferSize: observable,
            executionStats: observable,

            // Actions
            compile: action,
            start: action,
            stop: action,
            updateConfig: action,
            executeStep: action,
            updateVisualizationData: action,

            // Computed
            hasErrors: computed,
            canStart: computed,
            totalNodes: computed,
        });

        this.compiler = new GraphCompiler();
        this.engine = new DSPEngine();

        // Реакция на изменение конфигурации
        reaction(
            () => ({ sampleRate: this.sampleRate, bufferSize: this.bufferSize }),
            (config) => {
                if (this.engine) {
                    this.engine.setConfig(config);
                }
            }
        );
    }

    /**
     * Computed: есть ли ошибки компиляции
     */
    get hasErrors() {
        return this.compilationErrors.length > 0;
    }

    /**
     * Computed: можно ли запустить
     */
    get canStart() {
        return this.compiledGraph !== null && !this.hasErrors && !this.isRunning;
    }

    /**
     * Computed: общее количество узлов
     */
    get totalNodes() {
        return this.compiledGraph?.executionOrder?.length || 0;
    }

    /**
     * Компиляция графа
     */
    compile(nodes, edges) {
        console.log('📊 Store: Compiling graph...');
        
        const result = this.compiler.compile(nodes, edges);

        if (result.success) {
            this.compiledGraph = result.compiledGraph;
            this.compilationErrors = [];
            
            // Инициализируем движок
            this.engine.initialize(result.compiledGraph, {
                sampleRate: this.sampleRate,
                bufferSize: this.bufferSize
            });

            console.log('✅ Store: Compilation successful');
            return { success: true, stats: result.stats };
        } else {
            this.compiledGraph = null;
            this.compilationErrors = result.errors;
            
            console.error('❌ Store: Compilation failed:', result.errors);
            return { success: false, errors: result.errors };
        }
    }

    /**
     * Запуск выполнения
     */
    start() {
        if (!this.canStart) {
            console.warn('⚠️ Cannot start: preconditions not met');
            return false;
        }

        console.log('▶️ Store: Starting execution...');
        
        this.isRunning = true;
        this.engine.start();
        
        // Запускаем цикл выполнения
        this.runExecutionLoop();

        return true;
    }

    /**
     * Остановка выполнения
     */
    stop() {
        console.log('⏹️ Store: Stopping execution...');
        
        this.isRunning = false;
        this.engine.stop();

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        return true;
    }

    /**
     * Цикл выполнения
     */
    runExecutionLoop() {
        if (!this.isRunning) {
            return;
        }

        // Выполняем один шаг
        this.executeStep();

        // Планируем следующий шаг
        this.animationFrameId = requestAnimationFrame(() => {
            this.runExecutionLoop();
        });
    }

    /**
     * Выполнение одного шага
     */
    executeStep() {
        if (!this.isRunning) {
            return;
        }

        const outputs = this.engine.executeOneCycle();
        
        if (outputs) {
            // Обновляем данные выполнения
            Object.entries(outputs).forEach(([nodeId, output]) => {
                this.executionData.set(nodeId, output.data);
            });

            // Обновляем статистику
            this.executionStats = this.engine.getStats();

            // Обновляем данные визуализации для sink узлов
            this.updateVisualizationData(outputs);
        }
    }

    /**
     * Обновление данных визуализации
     */
    updateVisualizationData(outputs) {
        Object.entries(outputs).forEach(([nodeId, output]) => {
            const node = output.node;
            const blockType = node.data.blockType;

            // Обрабатываем в зависимости от типа блока визуализации
            if (blockType === 'Осциллограф') {
                this.visualizationData.set(nodeId, {
                    type: 'oscilloscope',
                    data: output.data,
                    timestamp: Date.now()
                });
            } else if (blockType === 'Спектроанализатор') {
                // Вычисляем спектр
                const spectrum = this.computeSpectrum(output.data);
                this.visualizationData.set(nodeId, {
                    type: 'spectrum',
                    data: spectrum,
                    timestamp: Date.now()
                });
            } else if (blockType === 'Фазовое созвездие') {
                this.visualizationData.set(nodeId, {
                    type: 'constellation',
                    data: output.data,
                    timestamp: Date.now()
                });
            }
        });
    }

    /**
     * Вычисление спектра для визуализации
     */
    computeSpectrum(data) {
        if (!data || !data.real) {
            // Если это обычный сигнал, нужно сделать FFT
            // Это будет обработано в компоненте визуализации
            return { signal: data };
        }

        // Если это уже FFT результат
        return {
            real: data.real,
            imag: data.imag,
            magnitude: this.computeMagnitude(data.real, data.imag)
        };
    }

    /**
     * Вычисление магнитуды
     */
    computeMagnitude(real, imag) {
        const magnitude = new Float32Array(real.length);
        for (let i = 0; i < real.length; i++) {
            magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }
        return magnitude;
    }

    /**
     * Обновление конфигурации
     */
    updateConfig(config) {
        if (config.sampleRate !== undefined) {
            this.sampleRate = config.sampleRate;
        }
        if (config.bufferSize !== undefined) {
            this.bufferSize = config.bufferSize;
        }
    }

    /**
     * Получить данные визуализации для узла
     */
    getVisualizationData(nodeId) {
        return this.visualizationData.get(nodeId);
    }

    /**
     * Получить данные выполнения для узла
     */
    getExecutionData(nodeId) {
        return this.executionData.get(nodeId);
    }

    /**
     * Очистка
     */
    cleanup() {
        this.stop();
        this.compiledGraph = null;
        this.compilationErrors = [];
        this.executionData.clear();
        this.visualizationData.clear();
    }
}

// Создаём singleton instance
export const dspExecutionStore = new DSPExecutionStore();

export default dspExecutionStore;
