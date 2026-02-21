/**
 * Graph Compiler - компилирует граф узлов в исполняемую последовательность
 * 
 * Функции:
 * 1. Проверка типов соединений
 * 2. Обнаружение циклов
 * 3. Топологическая сортировка
 * 4. Генерация последовательности выполнения
 */

import { SIGNAL_TYPES } from '../utils/constants';
import { getBlockSignalConfig, areSignalsCompatible } from '../utils/helpers';

export class GraphCompiler {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.compiledGraph = null;
        this.errors = [];
    }

    /**
     * Компиляция графа
     */
    compile(nodes, edges) {
        this.nodes = nodes;
        this.edges = edges;
        this.errors = [];
        this.compiledGraph = null;

        // Предвычисляем lookup-структуры — O(n + m) один раз
        this.nodeMap = new Map(nodes.map(n => [n.id, n]));
        this.outEdges = new Map();
        this.inEdges = new Map();
        for (const node of nodes) {
            this.outEdges.set(node.id, []);
            this.inEdges.set(node.id, []);
        }
        for (const edge of edges) {
            this.outEdges.get(edge.source)?.push(edge);
            this.inEdges.get(edge.target)?.push(edge);
        }

        console.log('🔧 Graph Compiler: Starting compilation...');
        
        // 1. Валидация типов соединений
        if (!this.validateConnections()) {
            return { success: false, errors: this.errors };
        }

        // 2. Проверка циклов
        const cycles = this.detectCycles();
        if (cycles.length > 0) {
            this.errors.push({
                type: 'CYCLE_DETECTED',
                message: 'Граф содержит циклы',
                cycles
            });
            return { success: false, errors: this.errors };
        }

        // 3. Топологическая сортировка
        const sortedNodes = this.topologicalSort();
        if (!sortedNodes) {
            return { success: false, errors: this.errors };
        }

        // 4. Генерация execution plan
        this.compiledGraph = this.generateExecutionPlan(sortedNodes);

        console.log('✅ Graph Compiler: Compilation successful');
        console.log('Execution order:', this.compiledGraph.executionOrder.map(n => n.label));

        return {
            success: true,
            compiledGraph: this.compiledGraph,
            stats: {
                totalNodes: this.nodes.length,
                executionSteps: this.compiledGraph.executionOrder.length,
                sourceNodes: this.compiledGraph.sourceNodes.length,
                sinkNodes: this.compiledGraph.sinkNodes.length
            }
        };
    }

    /**
     * Валидация всех соединений на совместимость типов
     */
    validateConnections() {
        console.log('🔍 Validating connections...');
        
        for (const edge of this.edges) {
            const sourceNode = this.nodeMap.get(edge.source);
            const targetNode = this.nodeMap.get(edge.target);

            if (!sourceNode || !targetNode) {
                this.errors.push({
                    type: 'INVALID_CONNECTION',
                    message: 'Соединение указывает на несуществующий узел',
                    edge
                });
                return false;
            }

            const sourceConfig = getBlockSignalConfig(sourceNode.data.blockType);
            const targetConfig = getBlockSignalConfig(targetNode.data.blockType);

            // Проверяем совместимость типов
            if (!areSignalsCompatible(sourceConfig.output, targetConfig.input)) {
                this.errors.push({
                    type: 'TYPE_MISMATCH',
                    message: `Несовместимые типы сигналов: ${sourceNode.data.label} (${sourceConfig.output}) → ${targetNode.data.label} (${targetConfig.input})`,
                    source: sourceNode.data.label,
                    target: targetNode.data.label,
                    sourceType: sourceConfig.output,
                    targetType: targetConfig.input
                });
                return false;
            }
        }

        console.log('✅ All connections validated');
        return true;
    }

    /**
     * Обнаружение циклов в графе (DFS)
     */
    detectCycles() {
        console.log('🔍 Detecting cycles...');
        
        const visited = new Set();
        const recursionStack = new Set();
        const cycles = [];
        const path = [];

        const dfs = (nodeId) => {
            if (recursionStack.has(nodeId)) {
                // Найден цикл
                const cycleStart = path.indexOf(nodeId);
                cycles.push(path.slice(cycleStart).concat(nodeId));
                return;
            }

            if (visited.has(nodeId)) {
                return;
            }

            visited.add(nodeId);
            recursionStack.add(nodeId);
            path.push(nodeId);

            const outgoing = this.outEdges.get(nodeId) || [];
            for (const edge of outgoing) {
                dfs(edge.target);
            }

            path.pop();
            recursionStack.delete(nodeId);
        };

        // Запускаем DFS от каждого узла
        for (const node of this.nodes) {
            if (!visited.has(node.id)) {
                dfs(node.id);
            }
        }

        if (cycles.length > 0) {
            console.log('⚠️ Cycles detected:', cycles);
        } else {
            console.log('✅ No cycles detected');
        }

        return cycles;
    }

    /**
     * Топологическая сортировка (Kahn's algorithm)
     */
    topologicalSort() {
        console.log('🔄 Performing topological sort...');
        
        // Подсчёт входящих рёбер для каждого узла
        const inDegree = new Map();
        this.nodes.forEach(node => inDegree.set(node.id, 0));
        
        this.edges.forEach(edge => {
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        });

        // Очередь узлов без входящих рёбер
        const queue = [];
        inDegree.forEach((degree, nodeId) => {
            if (degree === 0) {
                queue.push(nodeId);
            }
        });

        const sorted = [];

        while (queue.length > 0) {
            const nodeId = queue.shift();
            sorted.push(this.nodeMap.get(nodeId));

            // Уменьшаем входящие степени для всех соседей
            const outgoing = this.outEdges.get(nodeId) || [];

            for (const edge of outgoing) {
                const newDegree = inDegree.get(edge.target) - 1;
                inDegree.set(edge.target, newDegree);
                
                if (newDegree === 0) {
                    queue.push(edge.target);
                }
            }
        }

        // Если не все узлы отсортированы - есть цикл
        if (sorted.length !== this.nodes.length) {
            this.errors.push({
                type: 'TOPOLOGICAL_SORT_FAILED',
                message: 'Не удалось выполнить топологическую сортировку (возможно, есть цикл)'
            });
            return null;
        }

        console.log('✅ Topological sort completed');
        return sorted;
    }

    /**
     * Генерация плана выполнения
     */
    generateExecutionPlan(sortedNodes) {
        console.log('📋 Generating execution plan...');
        
        // Строим карты зависимостей и выходов из предвычисленных индексов
        const dependencies = new Map();
        const outputs = new Map();
        sortedNodes.forEach(node => {
            dependencies.set(node.id, (this.inEdges.get(node.id) || []).map(e => e.source));
            outputs.set(node.id, (this.outEdges.get(node.id) || []).map(e => e.target));
        });

        // Источники (нет входов) и стоки (нет выходов) — из уже построенных карт
        const sourceNodes = sortedNodes.filter(node => dependencies.get(node.id).length === 0);
        const sinkNodes = sortedNodes.filter(node => outputs.get(node.id).length === 0);

        return {
            executionOrder: sortedNodes,
            sourceNodes,
            sinkNodes,
            dependencies,
            outputs,
            nodeMap: new Map(sortedNodes.map(n => [n.id, n]))
        };
    }

    /**
     * Получить компилированный граф
     */
    getCompiledGraph() {
        return this.compiledGraph;
    }

    /**
     * Получить ошибки компиляции
     */
    getErrors() {
        return this.errors;
    }
}

export default GraphCompiler;
