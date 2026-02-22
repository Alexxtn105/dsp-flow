import { describe, it, expect } from 'vitest';
import FIRFilterPlugin from '../../src/engine/plugins/filters/FIRFilterPlugin.js';
import { createFIRProcessor } from '../../src/engine/plugins/filters/FIRFilterPlugin.js';
import GoertzelFilterPlugin from '../../src/engine/plugins/filters/GoertzelFilterPlugin.js';
import HilbertTransformerPlugin from '../../src/engine/plugins/filters/HilbertTransformerPlugin.js';

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

    it('пересчитывает коэффициенты при изменении cutoff', () => {
        const proc = createFIRProcessor();
        const params1 = { filterType: 'lowpass', cutoffFrequency: 1000, order: 31, sampleRate: 48000 };
        const input = new Float32Array(256).fill(1.0);
        proc.process([input], params1, 256, 'fir_recomp');
        const coeffs1 = new Float32Array(proc.states.get('fir_recomp').coeffs);

        const params2 = { ...params1, cutoffFrequency: 5000 };
        proc.process([input], params2, 256, 'fir_recomp');
        const coeffs2 = proc.states.get('fir_recomp').coeffs;

        // Коэффициенты должны различаться
        let different = false;
        for (let i = 0; i < coeffs1.length; i++) {
            if (Math.abs(coeffs1[i] - coeffs2[i]) > 1e-6) { different = true; break; }
        }
        expect(different).toBe(true);
    });
});

describe('GoertzelFilterPlugin', () => {
    it('обнаруживает целевую частоту', () => {
        const proc = GoertzelFilterPlugin.processor;
        proc.clearStates();
        const sampleRate = 8000;
        const targetFreq = 1000;
        const N = 256;
        // Генерируем синусоиду на целевой частоте
        const input = new Float32Array(512);
        for (let i = 0; i < input.length; i++) {
            input[i] = Math.sin(2 * Math.PI * targetFreq * i / sampleRate);
        }
        const output = proc.process([input], { targetFrequency: targetFreq, samplingRate: sampleRate, N }, 512, 'g1');
        // После N отсчётов магнитуда должна быть значительной
        expect(output[N]).toBeGreaterThan(0);
    });

    it('возвращает малую магнитуду для нецелевой частоты', () => {
        const proc = GoertzelFilterPlugin.processor;
        proc.clearStates();
        const sampleRate = 8000;
        const targetFreq = 1000;
        const N = 256;
        // Генерируем синусоиду на ДРУГОЙ частоте
        const input = new Float32Array(512);
        for (let i = 0; i < input.length; i++) {
            input[i] = Math.sin(2 * Math.PI * 3000 * i / sampleRate);
        }
        const params = { targetFrequency: targetFreq, samplingRate: sampleRate, N };
        const output = proc.process([input], params, 512, 'g2');

        // Генерируем синусоиду на ЦЕЛЕВОЙ частоте для сравнения
        proc.clearStates();
        const inputTarget = new Float32Array(512);
        for (let i = 0; i < inputTarget.length; i++) {
            inputTarget[i] = Math.sin(2 * Math.PI * targetFreq * i / sampleRate);
        }
        const outputTarget = proc.process([inputTarget], params, 512, 'g3');

        // Магнитуда нецелевой должна быть меньше целевой
        expect(output[N]).toBeLessThan(outputTarget[N]);
    });

    it('возвращает тишину при пустом входе', () => {
        const proc = GoertzelFilterPlugin.processor;
        proc.clearStates();
        const output = proc.process([], {}, 128, 'g4');
        expect(output.length).toBe(128);
    });

    it('выдаёт ненулевое значение до первого полного блока', () => {
        const proc = GoertzelFilterPlugin.processor;
        proc.clearStates();
        const sampleRate = 8000;
        const targetFreq = 1000;
        const N = 256;
        const input = new Float32Array(128); // Меньше N
        for (let i = 0; i < input.length; i++) {
            input[i] = Math.sin(2 * Math.PI * targetFreq * i / sampleRate);
        }
        const output = proc.process([input], { targetFrequency: targetFreq, samplingRate: sampleRate, N }, 128, 'g5');
        // Промежуточная магнитуда не нулевая (исправление бага 2.9)
        expect(output[127]).toBeGreaterThan(0);
    });
});

describe('HilbertTransformerPlugin', () => {
    it('генерирует комплексный выход (interleaved I/Q)', () => {
        const proc = HilbertTransformerPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(256);
        for (let i = 0; i < 256; i++) input[i] = Math.sin(2 * Math.PI * 10 * i / 256);
        const output = proc.process([input], { order: 64 }, 256, 'h1');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(512); // chunkSize * 2
    });

    it('I-компонента содержит задержанный вход', () => {
        const proc = HilbertTransformerPlugin.processor;
        proc.clearStates();
        const N = 512;
        // Импульс
        const input = new Float32Array(N);
        input[0] = 1.0;
        const output = proc.process([input], { order: 33 }, N, 'h2');
        // I-компонента — задержанная копия входа, задержка = (N-1)/2 = 16
        // Импульс должен появиться на позиции delay
        const delay = 16;
        expect(output[delay * 2]).toBeCloseTo(1.0, 3); // I[delay] = input[0]
    });

    it('Q-компонента ненулевая для синусоиды', () => {
        const proc = HilbertTransformerPlugin.processor;
        proc.clearStates();
        const N = 1024;
        const input = new Float32Array(N);
        for (let i = 0; i < N; i++) input[i] = Math.sin(2 * Math.PI * 50 * i / N);
        // Прогреваем два чанка
        proc.process([input], { order: 65 }, N, 'h3');
        const output = proc.process([input], { order: 65 }, N, 'h3');
        // Q-компонента не должна быть нулевой
        let qEnergy = 0;
        for (let i = 0; i < N; i++) {
            qEnergy += output[i * 2 + 1] * output[i * 2 + 1];
        }
        expect(qEnergy).toBeGreaterThan(0);
    });

    it('возвращает тишину при пустом входе', () => {
        const proc = HilbertTransformerPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { order: 64 }, 128, 'h4');
        expect(output.length).toBe(256);
    });
});
