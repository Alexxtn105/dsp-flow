import { describe, it, expect } from 'vitest';
import FFTPlugin from '../../src/engine/plugins/analysis/FFTPlugin.js';
import SlidingFFTPlugin from '../../src/engine/plugins/analysis/SlidingFFTPlugin.js';
import SpectrumAnalyzerPlugin from '../../src/engine/plugins/analysis/SpectrumAnalyzerPlugin.js';

describe('FFTPlugin', () => {
    it('возвращает половину FFT-размера', () => {
        const input = new Float32Array(1024);
        const output = FFTPlugin.processor.process([input], {}, 1024);
        expect(output.length).toBe(512);
    });

    it('DC-вход: пик на нулевой частоте', () => {
        const input = new Float32Array(1024).fill(1.0);
        // Rectangular window для чистого DC-теста (без спектральной утечки от оконной функции)
        const output = FFTPlugin.processor.process([input], { windowFunction: 'rectangular' }, 1024);
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

    it('использует params.fftSize когда указан', () => {
        const N = 256;
        const input = new Float32Array(N).fill(0);
        input[0] = 1.0; // Импульс
        const output = FFTPlugin.processor.process([input], { fftSize: 1024 }, N);
        // С fftSize=1024 выход должен быть 512 (половина)
        expect(output.length).toBe(512);
    });
});

describe('SlidingFFTPlugin', () => {
    it('возвращает массив правильной длины', () => {
        const proc = SlidingFFTPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(1024).fill(0.5);
        const output = proc.process([input], { windowSize: 1024, fftSize: 1024, overlap: 512 }, 1024, 'sfft1');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(1024);
    });

    it('обнаруживает частоту в сигнале', () => {
        const proc = SlidingFFTPlugin.processor;
        proc.clearStates();
        const N = 1024;
        const freq = 100;
        const sampleRate = 1024;
        const input = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            input[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
        }
        const output = proc.process([input], { windowSize: 1024, fftSize: 1024, overlap: 512 }, 1024, 'sfft2');
        // Bin с максимальной энергией должен быть на частоте freq
        let maxBin = 1;
        for (let i = 2; i < 512; i++) {
            if (output[i] > output[maxBin]) maxBin = i;
        }
        expect(maxBin).toBe(freq);
    });

    it('возвращает тишину при пустом входе', () => {
        const proc = SlidingFFTPlugin.processor;
        proc.clearStates();
        const output = proc.process([], {}, 256, 'sfft3');
        expect(output.length).toBe(256);
    });

    it('сохраняет состояние между вызовами (overlap)', () => {
        const proc = SlidingFFTPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(512).fill(1.0);
        proc.process([input], { windowSize: 1024, fftSize: 1024, overlap: 512 }, 1024, 'sfft4');
        // Второй вызов с ещё 512 отсчётов заполняет буфер → FFT выполняется
        const output = proc.process([input], { windowSize: 1024, fftSize: 1024, overlap: 512 }, 1024, 'sfft4');
        // После FFT хотя бы один bin ненулевой
        let hasNonZero = false;
        for (let i = 0; i < 512; i++) {
            if (output[i] !== 0) { hasNonZero = true; break; }
        }
        expect(hasNonZero).toBe(true);
    });
});

describe('SpectrumAnalyzerPlugin', () => {
    it('возвращает половину FFT-размера', () => {
        const proc = SpectrumAnalyzerPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(2048).fill(1.0);
        const output = proc.process([input], { fftSize: 2048 }, 2048, 'sa1');
        expect(output.length).toBe(1024);
    });

    it('DC-вход: пик на нулевой частоте', () => {
        const proc = SpectrumAnalyzerPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(2048).fill(1.0);
        const output = proc.process([input], { fftSize: 2048, windowFunction: 'rectangular' }, 2048, 'sa2');
        const dcBin = output[0];
        const otherMax = Math.max(...output.slice(1));
        expect(dcBin).toBeGreaterThan(otherMax);
    });

    it('возвращает тишину при пустом входе', () => {
        const proc = SpectrumAnalyzerPlugin.processor;
        proc.clearStates();
        const output = proc.process([], {}, 512, 'sa3');
        expect(output.length).toBe(256);
    });

    it('сохраняет состояние между вызовами (кольцевой буфер)', () => {
        const proc = SpectrumAnalyzerPlugin.processor;
        proc.clearStates();
        const input1 = new Float32Array(1024).fill(0.5);
        proc.process([input1], { fftSize: 2048 }, 1024, 'sa4');
        const input2 = new Float32Array(1024).fill(0.5);
        const output = proc.process([input2], { fftSize: 2048 }, 1024, 'sa4');
        // Должен вернуть корректный результат
        expect(output.length).toBe(1024);
    });
});
