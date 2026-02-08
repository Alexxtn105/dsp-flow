/**
 * GraphCompiler - компилятор графа DSP блоков
 *
 * Выполняет:
 * 1. Проверку типов соединений
 * 2. Обнаружение циклов (алгоритм Кана)
 * 3. Топологическую сортировку
 * 4. Генерацию последовательности выполнения
 */

import { getBlockSignalConfig, areSignalsCompatible } from '../utils/helpers';

class GraphCompiler {
    /**
     * Компилирует граф и возвращает последовательность выполнения
     * @param {Array} nodes - узлы графа
     * @param {Array} edges - рёбра графа
     * @returns {Object} результат компиляции
     */
    compile(nodes, edges) {
        const errors = [];
        const warnings = [];

        // Шаг 1: Проверка типов соединений
        const connectionValidation = this.validateConnections(nodes, edges);
        errors.push(...connectionValidation.errors);
        warnings.push(...connectionValidation.warnings);

        // Шаг 2: Обнаружение циклов
        const cycleCheck = this.detectCycles(nodes, edges);
        if (cycleCheck.hasCycle) {
            errors.push({
                type: 'cycle',
                message: 'Обнаружен цикл в графе',
                nodes: cycleCheck.cycleNodes
            });
        }

        // Если есть ошибки - возвращаем их
        if (errors.length > 0) {
            return {
                success: false,
                errors,
                warnings,
                executionOrder: null
            };
        }

        // Шаг 3: Топологическая сортировка
        const sortResult = this.topologicalSort(nodes, edges);

        // Шаг 4: Генерация последовательности выполнения
        const executionOrder = this.generateExecutionSequence(sortResult.order, nodes, edges);

        return {
            success: true,
            errors,
            warnings,
            executionOrder
        };
    }

    /**
     * Проверяет совместимость типов соединений
     */
    validateConnections(nodes, edges) {
        const errors = [];
        const warnings = [];
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        for (const edge of edges) {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);

            if (!sourceNode || !targetNode) {
                errors.push({
                    type: 'invalid_connection',
                    message: `Соединение ссылается на несуществующий узел`,
                    edge: edge.id
                });
                continue;
            }

            const sourceConfig = getBlockSignalConfig(sourceNode.data.blockType);
            const targetConfig = getBlockSignalConfig(targetNode.data.blockType);

            // Проверяем совместимость типов сигналов
            if (!areSignalsCompatible(sourceConfig.output, targetConfig.input)) {
                errors.push({
                    type: 'type_mismatch',
                    message: `Несовместимые типы сигналов: ${sourceNode.data.label} (${sourceConfig.output}) → ${targetNode.data.label} (${targetConfig.input})`,
                    sourceNode: sourceNode.id,
                    targetNode: targetNode.id
                });
            }
        }

        // Проверяем узлы без входных соединений (кроме генераторов)
        const nodesWithInputs = new Set(edges.map(e => e.target));
        for (const node of nodes) {
            const config = getBlockSignalConfig(node.data.blockType);
            if (config.input && !nodesWithInputs.has(node.id)) {
                warnings.push({
                    type: 'disconnected_input',
                    message: `Блок "${node.data.label}" не имеет входного соединения`,
                    node: node.id
                });
            }
        }

        return { errors, warnings };
    }

    /**
     * Обнаруживает циклы в графе (алгоритм Кана)
     */
    detectCycles(nodes, edges) {
        const inDegree = new Map();
        const adjacencyList = new Map();

        // Инициализация
        for (const node of nodes) {
            inDegree.set(node.id, 0);
            adjacencyList.set(node.id, []);
        }

        // Заполняем граф
        for (const edge of edges) {
            adjacencyList.get(edge.source)?.push(edge.target);
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        }

        // Очередь узлов с нулевой входящей степенью
        const queue = [];
        for (const [nodeId, degree] of inDegree) {
            if (degree === 0) {
                queue.push(nodeId);
            }
        }

        let processedCount = 0;
        while (queue.length > 0) {
            const current = queue.shift();
            processedCount++;

            for (const neighbor of adjacencyList.get(current) || []) {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        // Если не все узлы обработаны - есть цикл
        const hasCycle = processedCount !== nodes.length;
        const cycleNodes = hasCycle
            ? [...inDegree.entries()].filter(([, degree]) => degree > 0).map(([id]) => id)
            : [];

        return { hasCycle, cycleNodes };
    }

    /**
     * Выполняет топологическую сортировку
     */
    topologicalSort(nodes, edges) {
        const inDegree = new Map();
        const adjacencyList = new Map();

        // Инициализация
        for (const node of nodes) {
            inDegree.set(node.id, 0);
            adjacencyList.set(node.id, []);
        }

        // Заполняем граф
        for (const edge of edges) {
            adjacencyList.get(edge.source)?.push(edge.target);
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        }

        // Очередь узлов с нулевой входящей степенью
        const queue = [];
        for (const [nodeId, degree] of inDegree) {
            if (degree === 0) {
                queue.push(nodeId);
            }
        }

        const order = [];
        while (queue.length > 0) {
            const current = queue.shift();
            order.push(current);

            for (const neighbor of adjacencyList.get(current) || []) {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        return { order };
    }

    /**
     * Генерирует последовательность выполнения с метаданными
     */
    generateExecutionSequence(orderIds, nodes, edges) {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const edgeMap = new Map();

        // Группируем входящие рёбра по целевому узлу
        for (const edge of edges) {
            if (!edgeMap.has(edge.target)) {
                edgeMap.set(edge.target, []);
            }
            edgeMap.get(edge.target).push(edge);
        }

        return orderIds.map(nodeId => {
            const node = nodeMap.get(nodeId);
            const inputEdges = edgeMap.get(nodeId) || [];

            return {
                nodeId,
                blockType: node.data.blockType,
                params: node.data.params,
                inputs: inputEdges.map(e => ({
                    sourceNodeId: e.source,
                    sourceHandle: e.sourceHandle,
                    targetHandle: e.targetHandle
                })),
                signalConfig: getBlockSignalConfig(node.data.blockType)
            };
        });
    }
}

export default new GraphCompiler();
