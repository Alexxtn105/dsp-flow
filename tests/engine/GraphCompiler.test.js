import { describe, it, expect, beforeAll } from 'vitest';
import initPlugins from '../../src/engine/initPlugins.js';
import registry from '../../src/engine/PluginRegistry.js';
import GraphCompiler from '../../src/engine/GraphCompiler.js';

// Инициализация плагинов (реальный реестр, без моков)
beforeAll(() => {
    registry.reset();
    initPlugins();
});

// --- Вспомогательные функции ---

function makeNode(id, blockType, params = {}) {
    return {
        id,
        type: 'block',
        position: { x: 0, y: 0 },
        data: { label: blockType, blockType, params }
    };
}

function makeEdge(id, source, target) {
    return { id, source, target };
}

// Реальные типы блоков из проекта
const SINE = 'Синусный генератор';   // group: generators, input: null, output: real
const LPF  = 'ФНЧ КИХ-фильтр';     // group: filters,    input: real, output: real
const OSC  = 'Осциллограф';          // group: visualization, input: real, output: null

// --- Тесты ---

describe('GraphCompiler', () => {

    // ==================== compile() ====================

    describe('compile()', () => {

        it('пустой граф — success', () => {
            const result = GraphCompiler.compile([], []);

            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
            expect(result.executionOrder).toEqual([]);
        });

        it('один узел-генератор — success, executionOrder длины 1', () => {
            const nodes = [makeNode('n1', SINE)];
            const edges = [];

            const result = GraphCompiler.compile(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.executionOrder).toHaveLength(1);
            expect(result.executionOrder[0].nodeId).toBe('n1');
            expect(result.executionOrder[0].blockType).toBe(SINE);
        });

        it('цепочка генератор → фильтр → осциллограф — success, правильный порядок', () => {
            const nodes = [
                makeNode('gen', SINE),
                makeNode('flt', LPF),
                makeNode('osc', OSC)
            ];
            const edges = [
                makeEdge('e1', 'gen', 'flt'),
                makeEdge('e2', 'flt', 'osc')
            ];

            const result = GraphCompiler.compile(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
            expect(result.executionOrder).toHaveLength(3);

            const order = result.executionOrder.map(s => s.nodeId);
            expect(order.indexOf('gen')).toBeLessThan(order.indexOf('flt'));
            expect(order.indexOf('flt')).toBeLessThan(order.indexOf('osc'));
        });

        it('цикл (A→B, B→A) — success: false, ошибка cycle', () => {
            const nodes = [
                makeNode('a', LPF),
                makeNode('b', LPF)
            ];
            const edges = [
                makeEdge('e1', 'a', 'b'),
                makeEdge('e2', 'b', 'a')
            ];

            const result = GraphCompiler.compile(nodes, edges);

            expect(result.success).toBe(false);
            expect(result.executionOrder).toBeNull();

            const cycleError = result.errors.find(e => e.type === 'cycle');
            expect(cycleError).toBeDefined();
            expect(cycleError.nodes).toContain('a');
            expect(cycleError.nodes).toContain('b');
        });

        it('несуществующий узел в edge — ошибка invalid_connection', () => {
            const nodes = [makeNode('n1', SINE)];
            const edges = [makeEdge('e1', 'n1', 'ghost')];

            const result = GraphCompiler.compile(nodes, edges);

            expect(result.success).toBe(false);
            const err = result.errors.find(e => e.type === 'invalid_connection');
            expect(err).toBeDefined();
            expect(err.edge).toBe('e1');
        });

        it('два несвязных компонента — success с warning disconnected_components', () => {
            const nodes = [
                makeNode('gen1', SINE),
                makeNode('osc1', OSC),
                makeNode('gen2', SINE),
                makeNode('osc2', OSC)
            ];
            const edges = [
                makeEdge('e1', 'gen1', 'osc1'),
                makeEdge('e2', 'gen2', 'osc2')
            ];

            const result = GraphCompiler.compile(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.executionOrder).toHaveLength(4);

            const dcWarning = result.warnings.find(w => w.type === 'disconnected_components');
            expect(dcWarning).toBeDefined();
            expect(dcWarning.components).toHaveLength(2);
        });
    });

    // ==================== validateConnections() ====================

    describe('validateConnections()', () => {

        it('предупреждение disconnected_input для фильтра без входа', () => {
            const nodes = [makeNode('flt', LPF)];
            const edges = [];

            const { errors, warnings } = GraphCompiler.validateConnections(nodes, edges);

            expect(errors).toHaveLength(0);
            const warn = warnings.find(w => w.type === 'disconnected_input');
            expect(warn).toBeDefined();
            expect(warn.node).toBe('flt');
        });

        it('генератор без входа НЕ вызывает предупреждение disconnected_input', () => {
            const nodes = [makeNode('gen', SINE)];
            const edges = [];

            const { warnings } = GraphCompiler.validateConnections(nodes, edges);

            const disconnected = warnings.filter(w => w.type === 'disconnected_input');
            expect(disconnected).toHaveLength(0);
        });

        it('корректное соединение real→real не даёт ошибок', () => {
            const nodes = [
                makeNode('gen', SINE),
                makeNode('flt', LPF)
            ];
            const edges = [makeEdge('e1', 'gen', 'flt')];

            const { errors } = GraphCompiler.validateConnections(nodes, edges);

            expect(errors).toHaveLength(0);
        });
    });

    // ==================== topologicalSort() ====================

    describe('topologicalSort()', () => {

        it('линейная цепочка — правильный порядок', () => {
            const nodes = [
                makeNode('a', SINE),
                makeNode('b', LPF),
                makeNode('c', OSC)
            ];
            const edges = [
                makeEdge('e1', 'a', 'b'),
                makeEdge('e2', 'b', 'c')
            ];

            const result = GraphCompiler.topologicalSort(nodes, edges);

            expect(result.hasCycle).toBe(false);
            expect(result.cycleNodes).toHaveLength(0);
            expect(result.order).toEqual(['a', 'b', 'c']);
        });

        it('diamond DAG (A→B, A→C, B→D, C→D)', () => {
            const nodes = [
                makeNode('A', SINE),
                makeNode('B', LPF),
                makeNode('C', LPF),
                makeNode('D', OSC)
            ];
            const edges = [
                makeEdge('e1', 'A', 'B'),
                makeEdge('e2', 'A', 'C'),
                makeEdge('e3', 'B', 'D'),
                makeEdge('e4', 'C', 'D')
            ];

            const result = GraphCompiler.topologicalSort(nodes, edges);

            expect(result.hasCycle).toBe(false);
            expect(result.order).toHaveLength(4);

            const order = result.order;
            // A должен быть раньше B и C; B и C раньше D
            expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
            expect(order.indexOf('A')).toBeLessThan(order.indexOf('C'));
            expect(order.indexOf('B')).toBeLessThan(order.indexOf('D'));
            expect(order.indexOf('C')).toBeLessThan(order.indexOf('D'));
        });

        it('обнаруживает цикл в графе', () => {
            const nodes = [
                makeNode('x', LPF),
                makeNode('y', LPF)
            ];
            const edges = [
                makeEdge('e1', 'x', 'y'),
                makeEdge('e2', 'y', 'x')
            ];

            const result = GraphCompiler.topologicalSort(nodes, edges);

            expect(result.hasCycle).toBe(true);
            expect(result.cycleNodes).toContain('x');
            expect(result.cycleNodes).toContain('y');
        });
    });

    // ==================== findConnectedComponents() ====================

    describe('findConnectedComponents()', () => {

        it('два изолированных компонента', () => {
            const nodes = [
                makeNode('a', SINE),
                makeNode('b', OSC),
                makeNode('c', SINE),
                makeNode('d', OSC)
            ];
            const edges = [
                makeEdge('e1', 'a', 'b'),
                makeEdge('e2', 'c', 'd')
            ];

            const components = GraphCompiler.findConnectedComponents(nodes, edges);

            expect(components).toHaveLength(2);
            // Каждый компонент содержит ровно 2 узла
            const sizes = components.map(c => c.length).sort();
            expect(sizes).toEqual([2, 2]);
        });

        it('один связный компонент', () => {
            const nodes = [
                makeNode('a', SINE),
                makeNode('b', LPF),
                makeNode('c', OSC)
            ];
            const edges = [
                makeEdge('e1', 'a', 'b'),
                makeEdge('e2', 'b', 'c')
            ];

            const components = GraphCompiler.findConnectedComponents(nodes, edges);

            expect(components).toHaveLength(1);
            expect(components[0]).toHaveLength(3);
        });

        it('три изолированных узла — три компонента', () => {
            const nodes = [
                makeNode('a', SINE),
                makeNode('b', SINE),
                makeNode('c', SINE)
            ];
            const edges = [];

            const components = GraphCompiler.findConnectedComponents(nodes, edges);

            expect(components).toHaveLength(3);
        });
    });

    // ==================== generateExecutionSequence() ====================

    describe('generateExecutionSequence()', () => {

        it('правильные inputs в каждом блоке цепочки', () => {
            const nodes = [
                makeNode('gen', SINE, { frequency: 440 }),
                makeNode('flt', LPF, { cutoff: 1000 }),
                makeNode('osc', OSC, { timeWindow: 10 })
            ];
            const edges = [
                makeEdge('e1', 'gen', 'flt'),
                makeEdge('e2', 'flt', 'osc')
            ];

            const orderIds = ['gen', 'flt', 'osc'];
            const sequence = GraphCompiler.generateExecutionSequence(orderIds, nodes, edges);

            expect(sequence).toHaveLength(3);

            // Генератор — без входов
            expect(sequence[0].nodeId).toBe('gen');
            expect(sequence[0].blockType).toBe(SINE);
            expect(sequence[0].params).toEqual({ frequency: 440 });
            expect(sequence[0].inputs).toHaveLength(0);
            expect(sequence[0].signalConfig).toEqual({ input: null, output: 'real' });

            // Фильтр — вход от генератора
            expect(sequence[1].nodeId).toBe('flt');
            expect(sequence[1].blockType).toBe(LPF);
            expect(sequence[1].params).toEqual({ cutoff: 1000 });
            expect(sequence[1].inputs).toHaveLength(1);
            expect(sequence[1].inputs[0].sourceNodeId).toBe('gen');
            expect(sequence[1].signalConfig).toEqual({ input: 'real', output: 'real' });

            // Осциллограф — вход от фильтра
            expect(sequence[2].nodeId).toBe('osc');
            expect(sequence[2].blockType).toBe(OSC);
            expect(sequence[2].inputs).toHaveLength(1);
            expect(sequence[2].inputs[0].sourceNodeId).toBe('flt');
            expect(sequence[2].signalConfig).toEqual({ input: 'real', output: null });
        });

        it('узел с двумя входами получает оба в inputs', () => {
            const nodes = [
                makeNode('gen1', SINE),
                makeNode('gen2', SINE),
                makeNode('flt', LPF)
            ];
            const edges = [
                makeEdge('e1', 'gen1', 'flt'),
                makeEdge('e2', 'gen2', 'flt')
            ];

            const orderIds = ['gen1', 'gen2', 'flt'];
            const sequence = GraphCompiler.generateExecutionSequence(orderIds, nodes, edges);

            expect(sequence[2].nodeId).toBe('flt');
            expect(sequence[2].inputs).toHaveLength(2);

            const sourceIds = sequence[2].inputs.map(i => i.sourceNodeId).sort();
            expect(sourceIds).toEqual(['gen1', 'gen2']);
        });
    });
});
