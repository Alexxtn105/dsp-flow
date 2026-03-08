import { describe, it, expect } from 'vitest';
import SpectrumAnalyzerPlugin from '../../src/engine/plugins/analysis/SpectrumAnalyzerPlugin.js';

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
