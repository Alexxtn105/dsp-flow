import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import initPlugins from '../../src/engine/initPlugins.js';
import DSPProcessor from '../../src/engine/DSPProcessor.js';

// Mock window.AudioContext для Node.js окружения
globalThis.window = globalThis.window || {};
window.AudioContext = class MockAudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createBuffer() { return { getChannelData: () => new Float32Array(1024) }; }
    createBufferSource() { return { buffer: null, connect() {}, start() {} }; }
    get destination() { return {}; }
};

function makeNode(id, blockType, params = {}) {
    return {
        id,
        type: 'block',
        position: { x: 0, y: 0 },
        data: { label: blockType, blockType, params },
    };
}

function makeEdge(id, source, target, sourceHandle = 'output', targetHandle = 'input') {
    return { id, source, target, sourceHandle, targetHandle };
}

describe('Интеграционные тесты сигнального тракта', () => {
    beforeAll(() => {
        initPlugins();
    });

    afterEach(() => {
        DSPProcessor.reset();
        DSPProcessor.sampleRate = 48000;
        DSPProcessor.chunkSize = 1024;
        DSPProcessor.compiledGraph = null;
        DSPProcessor.setFileMode(false);
        DSPProcessor.setManualMode(false);
    });

    it('Линейный пайплайн: SineGenerator → LowpassFIR → Oscilloscope', () => {
        const nodes = [
            makeNode('gen', 'Синусный генератор', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            makeNode('fir', 'ФНЧ КИХ-фильтр', { order: 32, cutoff: 5000, filterType: 'lowpass' }),
            makeNode('osc', 'Осциллограф'),
        ];
        const edges = [
            makeEdge('e1', 'gen', 'fir'),
            makeEdge('e2', 'fir', 'osc'),
        ];

        const result = DSPProcessor.initialize(nodes, edges);
        expect(result.success).toBe(true);

        const outputs = new Map();
        DSPProcessor.onBlockOutput = (nodeId, data) => {
            outputs.set(nodeId, data);
        };

        DSPProcessor.isRunning = true;
        DSPProcessor.processNextChunk();

        // Все три блока должны выдать output
        expect(outputs.size).toBe(3);
        expect(outputs.has('gen')).toBe(true);
        expect(outputs.has('fir')).toBe(true);
        expect(outputs.has('osc')).toBe(true);

        // Все выходы — Float32Array
        for (const [, data] of outputs) {
            expect(data).toBeInstanceOf(Float32Array);
            expect(data.length).toBe(1024);
        }

        // Фильтр 5кГц пропускает синус 1кГц — сигнал должен быть ненулевым
        const firOut = outputs.get('fir');
        const maxVal = Math.max(...firOut);
        expect(maxVal).toBeGreaterThan(0.01);
    });

    it('Комплексный пайплайн: RefSineGenerator → PhaseDetector', () => {
        const nodes = [
            makeNode('ref', 'Референсный синусный генератор', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            makeNode('det', 'Фазовый детектор', { referenceFrequency: 1000, sensitivity: 1.0, outputRange: '±π' }),
        ];
        const edges = [
            makeEdge('e1', 'ref', 'det'),
        ];

        const result = DSPProcessor.initialize(nodes, edges);
        expect(result.success).toBe(true);

        const outputs = new Map();
        DSPProcessor.onBlockOutput = (nodeId, data) => {
            outputs.set(nodeId, data);
        };

        DSPProcessor.isRunning = true;
        DSPProcessor.processNextChunk();

        expect(outputs.size).toBe(2);

        // Выход фазового детектора — real (Float32Array длиной chunkSize)
        const detOut = outputs.get('det');
        expect(detOut).toBeInstanceOf(Float32Array);
        // Для опорного синуса с частотой 1кГц фазовый детектор должен показывать линейно нарастающую фазу
        // Проверяем что выход не весь нулевой
        const hasNonZero = detOut.some(v => Math.abs(v) > 1e-6);
        expect(hasNonZero).toBe(true);
    });

    it('Разветвление: SineGenerator → [Oscilloscope + SpectrumAnalyzer]', () => {
        const nodes = [
            makeNode('gen', 'Синусный генератор', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            makeNode('osc', 'Осциллограф'),
            makeNode('spec', 'Спектроанализатор'),
        ];
        const edges = [
            makeEdge('e1', 'gen', 'osc'),
            makeEdge('e2', 'gen', 'spec'),
        ];

        const result = DSPProcessor.initialize(nodes, edges);
        expect(result.success).toBe(true);

        const outputs = new Map();
        DSPProcessor.onBlockOutput = (nodeId, data) => {
            outputs.set(nodeId, data);
        };

        DSPProcessor.isRunning = true;
        DSPProcessor.processNextChunk();

        // Все три блока должны выдать output
        expect(outputs.size).toBe(3);

        // Осциллограф и генератор имеют одинаковый выход (pass-through)
        const genOut = outputs.get('gen');
        const oscOut = outputs.get('osc');
        expect(genOut.length).toBe(oscOut.length);
        for (let i = 0; i < genOut.length; i++) {
            expect(oscOut[i]).toBeCloseTo(genOut[i], 5);
        }

        // Спектроанализатор выдаёт результат
        const specOut = outputs.get('spec');
        expect(specOut).toBeInstanceOf(Float32Array);
        expect(specOut.length).toBeGreaterThan(0);
    });

    it('Мульти-вход: [Sine1 + Sine2] → Summer → Oscilloscope', () => {
        const nodes = [
            makeNode('s1', 'Синусный генератор', { frequency: 1000, amplitude: 0.5, phase: 0 }),
            makeNode('s2', 'Косинусный генератор', { frequency: 2000, amplitude: 0.3, phase: 0 }),
            makeNode('sum', 'Сумматор', { numInputs: 2, weights: [1.0, 1.0] }),
            makeNode('osc', 'Осциллограф'),
        ];
        const edges = [
            makeEdge('e1', 's1', 'sum', 'output', 'input-0'),
            makeEdge('e2', 's2', 'sum', 'output', 'input-1'),
            makeEdge('e3', 'sum', 'osc'),
        ];

        const result = DSPProcessor.initialize(nodes, edges);
        expect(result.success).toBe(true);

        const outputs = new Map();
        DSPProcessor.onBlockOutput = (nodeId, data) => {
            outputs.set(nodeId, data);
        };

        DSPProcessor.isRunning = true;
        DSPProcessor.processNextChunk();

        // Все 4 блока
        expect(outputs.size).toBe(4);

        const s1Out = outputs.get('s1');
        const s2Out = outputs.get('s2');
        const sumOut = outputs.get('sum');
        const oscOut = outputs.get('osc');

        // Сумматор складывает входы: sumOut ≈ s1Out + s2Out
        for (let i = 0; i < sumOut.length; i++) {
            expect(sumOut[i]).toBeCloseTo(s1Out[i] + s2Out[i], 4);
        }

        // Осциллограф транслирует выход сумматора
        for (let i = 0; i < oscOut.length; i++) {
            expect(oscOut[i]).toBeCloseTo(sumOut[i], 5);
        }
    });
});
