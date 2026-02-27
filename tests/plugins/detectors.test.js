import { describe, it, expect } from 'vitest';
import PhaseDetectorPlugin from '../../src/engine/plugins/detectors/PhaseDetectorPlugin.js';
import FrequencyDetectorPlugin from '../../src/engine/plugins/detectors/FrequencyDetectorPlugin.js';

describe('PhaseDetectorPlugin', () => {
    it('извлекает фазу из комплексного сигнала', () => {
        const proc = PhaseDetectorPlugin.processor;
        proc.clearStates();
        const chunkSize = 100;
        // Комплексный вход: interleaved I/Q, длина = chunkSize * 2
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            const phase = (2 * Math.PI * i) / chunkSize;
            input[i * 2] = Math.cos(phase);     // I
            input[i * 2 + 1] = Math.sin(phase); // Q
        }
        const output = proc.process([input], { outputRange: '±π' }, chunkSize, 'pd1');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(chunkSize);
    });

    it('фаза растёт монотонно для вращающегося вектора', () => {
        const proc = PhaseDetectorPlugin.processor;
        proc.clearStates();
        const chunkSize = 200;
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            const phase = (2 * Math.PI * i) / 100;
            input[i * 2] = Math.cos(phase);
            input[i * 2 + 1] = Math.sin(phase);
        }
        const output = proc.process([input], { outputRange: '±π' }, chunkSize, 'pd2');
        // Фаза должна расти (после unwrapping)
        for (let i = 2; i < chunkSize; i++) {
            expect(output[i]).toBeGreaterThanOrEqual(output[i - 1] - 0.01);
        }
    });

    it('выход в градусах при outputRange с °', () => {
        const proc = PhaseDetectorPlugin.processor;
        proc.clearStates();
        const chunkSize = 10;
        const input = new Float32Array(chunkSize * 2);
        // Вектор под 45° = pi/4 рад = 45°
        for (let i = 0; i < chunkSize; i++) {
            input[i * 2] = 1.0;     // I
            input[i * 2 + 1] = 1.0; // Q
        }
        const output = proc.process([input], { outputRange: '±180°' }, chunkSize, 'pd3');
        // Первый отсчёт: atan2(1, 1) = 45°
        expect(output[0]).toBeCloseTo(45, 0);
    });

    it('возвращает тишину при пустом входе', () => {
        const proc = PhaseDetectorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], {}, 64, 'pd4');
        expect(output.length).toBe(64);
    });
});

describe('FrequencyDetectorPlugin', () => {
    it('определяет отклонение частоты от центральной', () => {
        const proc = FrequencyDetectorPlugin.processor;
        proc.clearStates();
        const sampleRate = 48000;
        const freq = 1000;
        const centerFrequency = 1000;
        const chunkSize = 256;
        // Комплексный вход: вращающийся вектор с частотой freq
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            const phase = 2 * Math.PI * freq * i / sampleRate;
            input[i * 2] = Math.cos(phase);
            input[i * 2 + 1] = Math.sin(phase);
        }
        const output = proc.process([input], { sampleRate, centerFrequency, bandwidth: 200 }, chunkSize, 'fd1');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(chunkSize);
        // Отклонение от центральной частоты должно быть ~0 (допуск ±5 Гц)
        const avgDeviation = output.slice(1, chunkSize).reduce((a, b) => a + b, 0) / (chunkSize - 1);
        expect(Math.abs(avgDeviation)).toBeLessThan(5);
    });

    it('определяет разные частоты — отклонение', () => {
        const proc = FrequencyDetectorPlugin.processor;
        proc.clearStates();
        const sampleRate = 48000;
        const freq = 5000;
        const centerFrequency = 4950;
        const chunkSize = 256;
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            const phase = 2 * Math.PI * freq * i / sampleRate;
            input[i * 2] = Math.cos(phase);
            input[i * 2 + 1] = Math.sin(phase);
        }
        const output = proc.process([input], { sampleRate, centerFrequency, bandwidth: 200 }, chunkSize, 'fd2');
        // Отклонение от центральной частоты ~+50 Гц (допуск ±5 Гц)
        const avgDeviation = output.slice(1).reduce((a, b) => a + b, 0) / (chunkSize - 1);
        expect(avgDeviation).toBeGreaterThan(45);
        expect(avgDeviation).toBeLessThan(55);
    });

    it('обнуляет выход вне полосы пропускания', () => {
        const proc = FrequencyDetectorPlugin.processor;
        proc.clearStates();
        const sampleRate = 48000;
        const freq = 5000;
        const chunkSize = 256;
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            const phase = 2 * Math.PI * freq * i / sampleRate;
            input[i * 2] = Math.cos(phase);
            input[i * 2 + 1] = Math.sin(phase);
        }
        // centerFrequency=1000, bandwidth=100 → частота 5000 далеко вне полосы
        const output = proc.process([input], { sampleRate, centerFrequency: 1000, bandwidth: 100 }, chunkSize, 'fd_bw');
        const avgDeviation = output.slice(1).reduce((a, b) => a + b, 0) / (chunkSize - 1);
        expect(avgDeviation).toBeCloseTo(0, 0);
    });

    it('возвращает тишину при пустом входе', () => {
        const proc = FrequencyDetectorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], {}, 64, 'fd3');
        expect(output.length).toBe(64);
    });

    it('сохраняет состояние между вызовами', () => {
        const proc = FrequencyDetectorPlugin.processor;
        proc.clearStates();
        const sampleRate = 48000;
        const freq = 2000;
        const centerFrequency = 2000;
        const chunkSize = 128;
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            const phase = 2 * Math.PI * freq * i / sampleRate;
            input[i * 2] = Math.cos(phase);
            input[i * 2 + 1] = Math.sin(phase);
        }
        proc.process([input], { sampleRate, centerFrequency, bandwidth: 200 }, chunkSize, 'fd4');
        // Второй чанк — нужно продолжить фазу
        const input2 = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            const phase = 2 * Math.PI * freq * (i + chunkSize) / sampleRate;
            input2[i * 2] = Math.cos(phase);
            input2[i * 2 + 1] = Math.sin(phase);
        }
        const out2 = proc.process([input2], { sampleRate, centerFrequency, bandwidth: 200 }, chunkSize, 'fd4');
        // Отклонение от центральной частоты должно быть ~0 (допуск ±5 Гц)
        const avgDeviation = out2.reduce((a, b) => a + b, 0) / chunkSize;
        expect(Math.abs(avgDeviation)).toBeLessThan(5);
    });
});
