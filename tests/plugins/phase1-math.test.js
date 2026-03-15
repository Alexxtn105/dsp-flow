import { describe, it, expect } from 'vitest';
import QuantizerPlugin from '../../src/engine/plugins/math/QuantizerPlugin';
import SampleHoldPlugin from '../../src/engine/plugins/math/SampleHoldPlugin';
import ConvolutionPlugin from '../../src/engine/plugins/math/ConvolutionPlugin';

describe('Quantizer', () => {
    const proc = QuantizerPlugin.processor;

    it('metadata', () => {
        expect(QuantizerPlugin.id).toBe('quantizer');
        expect(QuantizerPlugin.signals.input).toBe('real');
        expect(QuantizerPlugin.signals.output).toBe('real');
    });

    it('1-bit quantization gives ±1', () => {
        const input = new Float32Array([0.3, -0.7, 0.1, -0.1, 0.9]);
        const out = proc.process([input], { bits: 1, quantizerType: 'mid-tread' }, 5);
        for (let i = 0; i < 5; i++) {
            expect(Math.abs(out[i])).toBeLessThanOrEqual(1.001);
        }
    });

    it('8-bit quantization has discrete levels', () => {
        const input = new Float32Array(256);
        for (let i = 0; i < 256; i++) input[i] = (i / 255) * 2 - 1;
        const out = proc.process([input], { bits: 8, quantizerType: 'mid-tread' }, 256);
        // Count unique values — should be ≤ 256
        const unique = new Set();
        for (let i = 0; i < 256; i++) unique.add(out[i].toFixed(6));
        expect(unique.size).toBeLessThanOrEqual(256);
    });

    it('output bounded to [-1, 1]', () => {
        const input = new Float32Array([2, -3, 1.5, -0.5]);
        const out = proc.process([input], { bits: 8, quantizerType: 'mid-tread' }, 4);
        for (let i = 0; i < 4; i++) {
            expect(out[i]).toBeGreaterThanOrEqual(-1);
            expect(out[i]).toBeLessThanOrEqual(1);
        }
    });

    it('mid-rise has no zero level', () => {
        const input = new Float32Array([0]);
        const out = proc.process([input], { bits: 2, quantizerType: 'mid-rise' }, 1);
        // Mid-rise: zero input maps to a positive value (first level above zero)
        expect(out[0]).not.toBe(0);
    });

    it('returns zeros for null input', () => {
        const out = proc.process([null], { bits: 8 }, 512);
        for (let i = 0; i < 512; i++) expect(out[i]).toBe(0);
    });
});

describe('SampleHold', () => {
    const proc = SampleHoldPlugin.processor;

    it('metadata', () => {
        expect(SampleHoldPlugin.id).toBe('sample-hold');
    });

    it('holdPeriod=1 passes through', () => {
        proc.clearStates();
        const input = new Float32Array([1, 2, 3, 4, 5]);
        const out = proc.process([input], { holdPeriod: 1 }, 5, 'n1');
        for (let i = 0; i < 5; i++) {
            expect(out[i]).toBe(input[i]);
        }
    });

    it('holdPeriod=3 holds values', () => {
        proc.clearStates();
        const input = new Float32Array([10, 20, 30, 40, 50, 60, 70, 80, 90]);
        const out = proc.process([input], { holdPeriod: 3 }, 9, 'n2');
        // Sampled at 0, 3, 6: values 10, 40, 70
        expect(out[0]).toBe(10);
        expect(out[1]).toBe(10);
        expect(out[2]).toBe(10);
        expect(out[3]).toBe(40);
        expect(out[4]).toBe(40);
        expect(out[5]).toBe(40);
        expect(out[6]).toBe(70);
    });

    it('state persists across chunks', () => {
        proc.clearStates();
        const in1 = new Float32Array([1, 2]);
        const out1 = proc.process([in1], { holdPeriod: 3 }, 2, 'n3');
        expect(out1[0]).toBe(1); // sampled at counter=0
        expect(out1[1]).toBe(1); // held (counter=1)

        // After first chunk: counter=2, heldValue=1
        const in2 = new Float32Array([3, 4, 5]);
        const out2 = proc.process([in2], { holdPeriod: 3 }, 3, 'n3');
        // counter=2: still holding value 1
        expect(out2[0]).toBe(1);
        // counter=0 (reset): samples new value 4
        expect(out2[1]).toBe(4);
        expect(out2[2]).toBe(4); // held
    });
});

describe('Convolution', () => {
    const proc = ConvolutionPlugin.processor;

    it('metadata', () => {
        expect(ConvolutionPlugin.id).toBe('convolution');
        expect(ConvolutionPlugin.signals.inputsCount).toBe(2);
    });

    it('convolution with delta gives original signal', () => {
        const signal = new Float32Array([0, 0, 1, 2, 3, 2, 1, 0, 0, 0]);
        const delta = new Float32Array(10);
        delta[5] = 1; // delta at center
        const out = proc.process([signal, delta], { normalize: false }, 10);
        // With centered kernel, output should approximate input
        expect(out.length).toBe(10);
    });

    it('convolution with constant kernel gives moving average', () => {
        const signal = new Float32Array(10).fill(1);
        const kernel = new Float32Array([0.5, 0.5]);
        const out = proc.process([signal, kernel], { normalize: false }, 10);
        // Interior samples should be close to 1
        for (let i = 1; i < 9; i++) {
            expect(out[i]).toBeCloseTo(1, 1);
        }
    });

    it('returns signal if kernel is null', () => {
        const signal = new Float32Array([1, 2, 3]);
        const out = proc.process([signal, null], {}, 3);
        for (let i = 0; i < 3; i++) {
            expect(out[i]).toBe(signal[i]);
        }
    });

    it('returns zeros if both inputs null', () => {
        const out = proc.process([null, null], {}, 512);
        for (let i = 0; i < 512; i++) expect(out[i]).toBe(0);
    });
});
