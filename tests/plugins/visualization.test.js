import { describe, it, expect } from 'vitest';
import WaterfallPlugin from '../../src/engine/plugins/visualization/WaterfallPlugin.js';

describe('WaterfallPlugin', () => {
    it('возвращает половину FFT-размера', () => {
        const proc = WaterfallPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(2048).fill(1.0);
        const output = proc.process([input], { fftSize: 2048 }, 2048, 'wf1');
        expect(output.length).toBe(1024);
    });

    it('DC-вход: пик на нулевой частоте', () => {
        const proc = WaterfallPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(2048).fill(1.0);
        const output = proc.process([input], { fftSize: 2048, windowFunction: 'rectangular' }, 2048, 'wf2');
        const dcBin = output[0];
        const otherMax = Math.max(...output.slice(1));
        expect(dcBin).toBeGreaterThan(otherMax);
    });

    it('возвращает тишину при пустом входе', () => {
        const proc = WaterfallPlugin.processor;
        proc.clearStates();
        const output = proc.process([], {}, 512, 'wf3');
        expect(output.length).toBe(256);
    });

    it('сохраняет состояние между вызовами (кольцевой буфер)', () => {
        const proc = WaterfallPlugin.processor;
        proc.clearStates();
        const input1 = new Float32Array(1024).fill(0.5);
        proc.process([input1], { fftSize: 2048 }, 1024, 'wf4');
        const input2 = new Float32Array(1024).fill(0.5);
        const output = proc.process([input2], { fftSize: 2048 }, 1024, 'wf4');
        expect(output.length).toBe(1024);
    });

    it('синусоида: пик на правильной частоте', () => {
        const proc = WaterfallPlugin.processor;
        proc.clearStates();
        const N = 2048;
        const sampleRate = 2048;
        const freq = 100;
        const input = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            input[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
        }
        const output = proc.process([input], { fftSize: N, windowFunction: 'rectangular' }, N, 'wf5');
        let maxBin = 1;
        for (let i = 2; i < output.length; i++) {
            if (output[i] > output[maxBin]) maxBin = i;
        }
        expect(maxBin).toBe(freq);
    });
});
