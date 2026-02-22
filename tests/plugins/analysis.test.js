import { describe, it, expect } from 'vitest';
import FFTPlugin from '../../src/engine/plugins/analysis/FFTPlugin.js';

describe('FFTPlugin', () => {
    it('возвращает половину FFT-размера', () => {
        const input = new Float32Array(1024);
        const output = FFTPlugin.processor.process([input], {}, 1024);
        expect(output.length).toBe(512);
    });

    it('DC-вход: пик на нулевой частоте', () => {
        const input = new Float32Array(1024).fill(1.0);
        const output = FFTPlugin.processor.process([input], {}, 1024);
        // Bin 0 (DC) должен быть значительно больше остальных
        const dcBin = output[0];
        const otherMax = Math.max(...output.slice(1));
        expect(dcBin).toBeGreaterThan(otherMax);
    });

    it('синусоида: пик на правильной частоте', () => {
        const N = 1024;
        const sampleRate = 1024; // удобно: bin k = k Гц
        const freq = 50; // 50 Гц -> bin 50
        const input = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            input[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
        }
        const output = FFTPlugin.processor.process([input], {}, N);
        // Находим bin с максимальной амплитудой (кроме DC)
        let maxBin = 1;
        for (let i = 2; i < output.length; i++) {
            if (output[i] > output[maxBin]) maxBin = i;
        }
        expect(maxBin).toBe(freq);
    });

    it('пустой вход', () => {
        const output = FFTPlugin.processor.process([], {}, 256);
        expect(output.length).toBe(128);
    });
});
