/**
 * DSP Engine - движок выполнения графа обработки сигналов
 */

import registry from '../plugins/index';

export class DSPEngine {
    constructor() {
        this.compiledGraph = null;
        this.sampleRate = 48000;
        this.bufferSize = 1024;
        this.isRunning = false;
        this.nodeOutputs = new Map();
        this.nodeState = new Map();
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
        this.nodeState.clear();

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
        this.nodeState.clear();
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
            this.nodeOutputs.clear();

            for (const node of this.compiledGraph.executionOrder) {
                this.executeNode(node);
            }

            this.executionStats.cyclesExecuted++;
            this.executionStats.executionTime = performance.now() - startTime;
            this.executionStats.totalSamples += this.bufferSize;

            return this.getSinkOutputs();

        } catch (error) {
            console.error('❌ Execution error:', error);
            this.stop();
            return null;
        }
    }

    /**
     * Выполнение отдельного узла через реестр плагинов
     */
    executeNode(node) {
        const blockType = node.data.blockType;
        const params = node.data.params;
        const inputs = this.getNodeInputs(node);

        try {
            const processor = registry.getProcessor(blockType);
            let output;

            if (processor) {
                const ctx = {
                    inputs,
                    params,
                    state: this.getNodeState(node.id),
                    sampleRate: this.sampleRate,
                    bufferSize: this.bufferSize,
                    nodeId: node.id,
                };
                output = processor(ctx);
            } else {
                console.warn(`Unknown block type: ${blockType}`);
                output = inputs[0] || new Float32Array(this.bufferSize);
            }

            this.nodeOutputs.set(node.id, output);

        } catch (error) {
            console.error(`Error executing node ${node.data.label}:`, error);
            throw error;
        }
    }

    /**
     * Получение входов узла
     */
    getNodeInputs(node) {
        const dependencies = this.compiledGraph.dependencies.get(node.id) || [];
        return dependencies.map(depId => this.nodeOutputs.get(depId));
    }

    /**
     * Получение runtime-состояния узла (фаза, аккумулятор и т.д.)
     */
    getNodeState(nodeId) {
        if (!this.nodeState.has(nodeId)) {
            this.nodeState.set(nodeId, {});
        }
        return this.nodeState.get(nodeId);
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
