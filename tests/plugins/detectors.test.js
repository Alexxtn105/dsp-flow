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
    it('определяет мгновенную частоту', () => {
        const proc = FrequencyDetectorPlugin.processor;
        proc.clearStates();
        const sampleRate = 48000;
        const freq = 1000;
        const chunkSize = 256;
        // Комплексный вход: вращающийся вектор с частотой freq
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            const phase = 2 * Math.PI * freq * i / sampleRate;
            input[i * 2] = Math.cos(phase);
            input[i * 2 + 1] = Math.sin(phase);
        }
        const output = proc.process([input], { sampleRate }, chunkSize, 'fd1');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(chunkSize);
        // После первого отсчёта частота должна быть близка к freq
        const avgFreq = output.slice(1, chunkSize).reduce((a, b) => a + b, 0) / (chunkSize - 1);
        expect(avgFreq).toBeCloseTo(freq, -1); // Точность до 10 Гц
    });

    it('определяет разные частоты', () => {
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
        const output = proc.process([input], { sampleRate }, chunkSize, 'fd2');
        const avgFreq = output.slice(1).reduce((a, b) => a + b, 0) / (chunkSize - 1);
        expect(avgFreq).toBeCloseTo(freq, -1);
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
        const chunkSize = 128;
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            const phase = 2 * Math.PI * freq * i / sampleRate;
            input[i * 2] = Math.cos(phase);
            input[i * 2 + 1] = Math.sin(phase);
        }
        proc.process([input], { sampleRate }, chunkSize, 'fd4');
        // Второй чанк — нужно продолжить фазу
        const input2 = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            const phase = 2 * Math.PI * freq * (i + chunkSize) / sampleRate;
            input2[i * 2] = Math.cos(phase);
            input2[i * 2 + 1] = Math.sin(phase);
        }
        const out2 = proc.process([input2], { sampleRate }, chunkSize, 'fd4');
        const avgFreq = out2.reduce((a, b) => a + b, 0) / chunkSize;
        expect(avgFreq).toBeCloseTo(freq, -1);
    });
});
