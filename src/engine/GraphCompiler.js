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
import i18n from '../locales/i18n';

const t = (key, options) => i18n.t(key, { ns: 'validation', ...options });

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

        // Шаг 2: Топологическая сортировка + обнаружение циклов (единый алгоритм Кана)
        const sortResult = this.topologicalSort(nodes, edges);
        if (sortResult.hasCycle) {
            errors.push({
                type: 'cycle',
                message: t('compiler.cycleDetected'),
                nodes: sortResult.cycleNodes
            });
        }

        // Шаг 2.5: Обнаружение несвязных компонентов
        if (nodes.length > 1 && !sortResult.hasCycle) {
            const components = this.findConnectedComponents(nodes, edges);
            if (components.length > 1) {
                warnings.push({
                    type: 'disconnected_components',
                    message: t('compiler.disconnectedComponents', { count: components.length }),
                    components
                });
            }
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

        // Шаг 3: Генерация последовательности выполнения
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
                    message: t('compiler.invalidConnection'),
                    edge: edge.id
                });
                continue;
            }

            const sourceConfig = getBlockSignalConfig(sourceNode.data.blockType);
            const targetConfig = getBlockSignalConfig(targetNode.data.blockType);

            // Определяем тип выхода с учётом множественных выходов
            let sourceOutputType = sourceConfig.output;
            const srcHandleMatch = edge.sourceHandle?.match(/^output-(\d+)$/);
            if (srcHandleMatch && sourceConfig.outputTypes) {
                sourceOutputType = sourceConfig.outputTypes[parseInt(srcHandleMatch[1], 10)] ?? sourceConfig.output;
            }

            // Проверяем совместимость типов сигналов
            if (!areSignalsCompatible(sourceOutputType, targetConfig.input)) {
                errors.push({
                    type: 'type_mismatch',
                    message: t('compiler.typeMismatch', { source: sourceNode.data.label, sourceType: sourceOutputType, target: targetNode.data.label, targetType: targetConfig.input }),
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
                    message: t('compiler.disconnectedInput', { label: node.data.label }),
                    node: node.id
                });
            }
        }

        return { errors, warnings };
    }

    /**
     * Выполняет топологическую сортировку и обнаружение циклов (алгоритм Кана)
     * @returns {{ order: string[], hasCycle: boolean, cycleNodes: string[] }}
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

        const hasCycle = order.length !== nodes.length;
        const cycleNodes = hasCycle
            ? [...inDegree.entries()].filter(([, degree]) => degree > 0).map(([id]) => id)
            : [];

        return { order, hasCycle, cycleNodes };
    }

    /**
     * Находит несвязные компоненты графа (без учёта направления рёбер)
     */
    findConnectedComponents(nodes, edges) {
        const parent = new Map();
        for (const node of nodes) parent.set(node.id, node.id);

        const find = (x) => {
            while (parent.get(x) !== x) {
                parent.set(x, parent.get(parent.get(x)));
                x = parent.get(x);
            }
            return x;
        };
        const union = (a, b) => {
            const ra = find(a), rb = find(b);
            if (ra !== rb) parent.set(ra, rb);
        };

        for (const edge of edges) {
            union(edge.source, edge.target);
        }

        const groups = new Map();
        for (const node of nodes) {
            const root = find(node.id);
            if (!groups.has(root)) groups.set(root, []);
            groups.get(root).push(node.id);
        }

        return [...groups.values()];
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

            // Сортируем входы по targetHandle один раз при компиляции (H4)
            const inputs = inputEdges.map(e => ({
                sourceNodeId: e.source,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle
            })).sort((a, b) => {
                const aHandle = a.targetHandle || '';
                const bHandle = b.targetHandle || '';
                return aHandle.localeCompare(bHandle, undefined, { numeric: true });
            });

            return {
                nodeId,
                blockType: node.data.blockType,
                params: node.data.params,
                inputs,
                signalConfig: getBlockSignalConfig(node.data.blockType)
            };
        });
    }
}

export default new GraphCompiler();
