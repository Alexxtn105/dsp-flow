import { describe, it, expect } from 'vitest';
import SummerPlugin from '../../src/engine/plugins/math/SummerPlugin.js';
import MultiplierPlugin from '../../src/engine/plugins/math/MultiplierPlugin.js';

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

    it('работает с одним входом (второй = 0)', () => {
        const a = new Float32Array([2.0, 3.0]);
        const output = MultiplierPlugin.processor.process([a], {}, 2);
        // второй вход = 0, 2*0 = 0
        expect(output[0]).toBe(0);
        expect(output[1]).toBe(0);
    });
});
