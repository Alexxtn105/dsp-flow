import { describe, it, expect } from 'vitest';
import SineGeneratorPlugin from '../../src/engine/plugins/generators/SineGeneratorPlugin.js';
import CosineGeneratorPlugin from '../../src/engine/plugins/generators/CosineGeneratorPlugin.js';

describe('SineGeneratorPlugin', () => {
    it('генерирует синусоиду правильной длины', () => {
        const proc = SineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, 1024, 'node1');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(1024);
    });

    it('амплитуда не превышает заданную', () => {
        const proc = SineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 1000, amplitude: 0.5, phase: 0, sampleRate: 48000 }, 4096, 'node2');
        for (let i = 0; i < output.length; i++) {
            expect(Math.abs(output[i])).toBeLessThanOrEqual(0.501);
        }
    });

    it('сохраняет фазу между вызовами', () => {
        const proc = SineGeneratorPlugin.processor;
        proc.clearStates();
        const params = { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 };
        const out1 = proc.process([], params, 1024, 'node3');
        const out2 = proc.process([], params, 1024, 'node3');
        // Второй чанк должен продолжить фазу, а не начинать заново
        // Если бы фаза сбрасывалась, out2[0] == out1[0], но при правильной работе они различаются
        // (при 1000 Гц и 48000 Гц chunk = 1024 -> 21.3 мс -> не кратно периоду)
        expect(out2[0]).not.toBeCloseTo(out1[0], 5);
    });

    it('изоляция nodeId — разные узлы независимы', () => {
        const proc = SineGeneratorPlugin.processor;
        proc.clearStates();
        const params = { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 };
        proc.process([], params, 1024, 'nodeA');
        const outB = proc.process([], params, 1024, 'nodeB');
        const outA2 = proc.process([], params, 1024, 'nodeA');
        // nodeB первый вызов — должен начать с нуля, как nodeA первый вызов
        expect(outB[0]).toBeCloseTo(0, 3);
        // nodeA второй вызов — должен продолжить
        expect(outA2[0]).not.toBeCloseTo(0, 3);
    });
});

describe('CosineGeneratorPlugin', () => {
    it('генерирует косинусоиду', () => {
        const proc = CosineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, 1024, 'cos1');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(1024);
        // Косинус начинается с amplitude
        expect(output[0]).toBeCloseTo(1.0, 3);
    });

    it('амплитуда корректна', () => {
        const proc = CosineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 500, amplitude: 0.7, phase: 0, sampleRate: 48000 }, 4096, 'cos2');
        for (let i = 0; i < output.length; i++) {
            expect(Math.abs(output[i])).toBeLessThanOrEqual(0.701);
        }
    });

    it('сохраняет фазу между вызовами', () => {
        const proc = CosineGeneratorPlugin.processor;
        proc.clearStates();
        const params = { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 };
        const out1 = proc.process([], params, 1024, 'cos3');
        const out2 = proc.process([], params, 1024, 'cos3');
        expect(out2[0]).not.toBeCloseTo(out1[0], 5);
    });

    it('начальное значение косинуса равно amplitude', () => {
        const proc = CosineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 440, amplitude: 0.8, phase: 0, sampleRate: 48000 }, 10, 'cos4');
        expect(output[0]).toBeCloseTo(0.8, 3);
    });
});
