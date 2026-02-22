import { describe, it, expect } from 'vitest';
import SummerPlugin from '../../src/engine/plugins/math/SummerPlugin.js';
import MultiplierPlugin from '../../src/engine/plugins/math/MultiplierPlugin.js';
import IntegratorPlugin from '../../src/engine/plugins/math/IntegratorPlugin.js';

describe('SummerPlugin', () => {
    it('суммирует два входа', () => {
        const a = new Float32Array([1.0, 2.0, 3.0]);
        const b = new Float32Array([4.0, 6.0, 8.0]);
        const output = SummerPlugin.processor.process([a, b], {}, 3);
        expect(output[0]).toBeCloseTo(5.0);
        expect(output[1]).toBeCloseTo(8.0);
        expect(output[2]).toBeCloseTo(11.0);
    });

    it('суммирует с весами', () => {
        const a = new Float32Array([1.0, 2.0]);
        const b = new Float32Array([4.0, 6.0]);
        const output = SummerPlugin.processor.process([a, b], { weights: [0.5, 2.0] }, 2);
        expect(output[0]).toBeCloseTo(8.5);  // 1*0.5 + 4*2.0
        expect(output[1]).toBeCloseTo(13.0); // 2*0.5 + 6*2.0
    });

    it('работает с одним входом', () => {
        const a = new Float32Array([2.0, 4.0]);
        const output = SummerPlugin.processor.process([a], {}, 2);
        expect(output[0]).toBeCloseTo(2.0);
        expect(output[1]).toBeCloseTo(4.0);
    });
});

describe('MultiplierPlugin', () => {
    it('перемножает два входа', () => {
        const a = new Float32Array([2.0, 3.0, 4.0]);
        const b = new Float32Array([5.0, 0.5, -1.0]);
        const output = MultiplierPlugin.processor.process([a, b], {}, 3);
        expect(output[0]).toBeCloseTo(10.0);
        expect(output[1]).toBeCloseTo(1.5);
        expect(output[2]).toBeCloseTo(-4.0);
    });

    it('работает с одним входом (pass-through)', () => {
        const a = new Float32Array([2.0, 3.0]);
        const output = MultiplierPlugin.processor.process([a], {}, 2);
        // один вход — pass-through (умножение на 1.0)
        expect(output[0]).toBeCloseTo(2.0);
        expect(output[1]).toBeCloseTo(3.0);
    });
});

describe('IntegratorPlugin', () => {
    it('интегрирует постоянный сигнал (линейный рост)', () => {
        const proc = IntegratorPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(100).fill(1.0);
        const params = { sampleRate: 1000, resetOnOverflow: false, maxValue: 1e6 };
        const output = proc.process([input], params, 100, 'int1');
        // Интеграл от 1.0 с dt = 0.001 — линейный рост
        expect(output[99]).toBeGreaterThan(0);
        // Значение должно расти монотонно
        for (let i = 1; i < 100; i++) {
            expect(output[i]).toBeGreaterThanOrEqual(output[i - 1]);
        }
    });

    it('сброс при overflow (resetOnOverflow = true)', () => {
        const proc = IntegratorPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(1000).fill(100.0);
        const params = { sampleRate: 100, resetOnOverflow: true, maxValue: 10 };
        const output = proc.process([input], params, 1000, 'int2');
        // Где-то в массиве должен произойти сброс (значение = 0)
        let foundReset = false;
        for (let i = 1; i < output.length; i++) {
            if (output[i] === 0 && output[i - 1] !== 0) {
                foundReset = true;
                break;
            }
        }
        expect(foundReset).toBe(true);
    });

    it('saturation при overflow (resetOnOverflow = false)', () => {
        const proc = IntegratorPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(1000).fill(100.0);
        const params = { sampleRate: 100, resetOnOverflow: false, maxValue: 10 };
        const output = proc.process([input], params, 1000, 'int3');
        // Значение не должно превышать maxValue
        for (let i = 0; i < output.length; i++) {
            expect(Math.abs(output[i])).toBeLessThanOrEqual(10.01);
        }
    });

    it('возвращает тишину при пустом входе', () => {
        const proc = IntegratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], {}, 128, 'int4');
        expect(output.length).toBe(128);
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBe(0);
        }
    });

    it('сохраняет состояние между вызовами', () => {
        const proc = IntegratorPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(100).fill(1.0);
        const params = { sampleRate: 1000, resetOnOverflow: false, maxValue: 1e6 };
        const out1 = proc.process([input], params, 100, 'int5');
        const out2 = proc.process([input], params, 100, 'int5');
        // Второй чанк продолжает интегрирование — начальное значение > 0
        expect(out2[0]).toBeGreaterThan(out1[0]);
    });
});
