import { describe, it, expect } from 'vitest';
import FIRFilterPlugin from '../../src/engine/plugins/filters/FIRFilterPlugin.js';
import { createFIRProcessor } from '../../src/engine/plugins/filters/FIRFilterPlugin.js';

describe('FIRFilterPlugin', () => {
    it('инициализация коэффициентов lowpass', () => {
        const proc = createFIRProcessor();
        proc.init('fir1', { filterType: 'lowpass', cutoffFrequency: 1000, order: 31, windowFunction: 'hamming' }, 48000);
        const state = proc.states.get('fir1');
        expect(state).toBeDefined();
        expect(state.coeffs).toBeInstanceOf(Float32Array);
        expect(state.coeffs.length).toBe(31);
        expect(state.order).toBe(31);
    });

    it('инициализация коэффициентов bandpass', () => {
        const proc = createFIRProcessor();
        proc.init('fir2', { filterType: 'bandpass', lowCutoff: 1000, highCutoff: 3000, order: 64 }, 48000);
        const state = proc.states.get('fir2');
        expect(state.coeffs.length).toBe(64);
    });

    it('lowpass фильтрация: DC сохраняется', () => {
        const proc = createFIRProcessor();
        const params = { filterType: 'lowpass', cutoffFrequency: 5000, order: 31, windowFunction: 'hamming', sampleRate: 48000 };
        // DC input (постоянная)
        const dcInput = new Float32Array(1024).fill(1.0);
        // Пропускаем несколько чанков для стабилизации
        proc.process([dcInput], params, 1024, 'fir3');
        proc.process([dcInput], params, 1024, 'fir3');
        const output = proc.process([dcInput], params, 1024, 'fir3');
        // После стабилизации DC-компонента должна быть близка к 1.0
        const dcValue = output[output.length - 1];
        expect(dcValue).toBeCloseTo(1.0, 1);
    });

    it('возвращает тишину при пустом входе', () => {
        const proc = createFIRProcessor();
        const output = proc.process([], {}, 512, 'fir4');
        expect(output.length).toBe(512);
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBe(0);
        }
    });

    it('каждый экземпляр createFIRProcessor имеет независимые состояния', () => {
        const procA = createFIRProcessor();
        const procB = createFIRProcessor();
        procA.init('n1', { filterType: 'lowpass', cutoffFrequency: 1000, order: 31 }, 48000);
        expect(procA.states.has('n1')).toBe(true);
        expect(procB.states.has('n1')).toBe(false);
    });
});
