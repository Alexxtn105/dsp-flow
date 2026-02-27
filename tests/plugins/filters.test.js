import { describe, it, expect } from 'vitest';
import NotchFIRPlugin from '../../src/engine/plugins/filters/NotchFIRPlugin.js';
import GoertzelFilterPlugin from '../../src/engine/plugins/filters/GoertzelFilterPlugin.js';
import HilbertTransformerPlugin from '../../src/engine/plugins/filters/HilbertTransformerPlugin.js';

describe('NotchFIRPlugin', () => {
    it('инициализация коэффициентов', () => {
        const proc = NotchFIRPlugin.processor;
        proc.clearStates();
        proc.init('notch1', { notchFrequency: 1000, bandwidth: 200, order: 64, windowFunction: 'hamming' }, 48000);
        const state = proc.states.get('notch1');
        expect(state).toBeDefined();
        expect(state.coeffs).toBeInstanceOf(Float32Array);
        expect(state.coeffs.length).toBe(64);
        expect(state.order).toBe(64);
    });

    it('DC сохраняется через режекторный фильтр', () => {
        const proc = NotchFIRPlugin.processor;
        proc.clearStates();
        const params = { notchFrequency: 5000, bandwidth: 500, order: 64, windowFunction: 'hamming', sampleRate: 48000 };
        const dcInput = new Float32Array(1024).fill(1.0);
        proc.process([dcInput], params, 1024, 'notch_dc');
        proc.process([dcInput], params, 1024, 'notch_dc');
        const output = proc.process([dcInput], params, 1024, 'notch_dc');
        const dcValue = output[output.length - 1];
        expect(dcValue).toBeCloseTo(1.0, 1);
    });

    it('подавляет синусоиду на частоте режекции', () => {
        const proc = NotchFIRPlugin.processor;
        proc.clearStates();
        const sampleRate = 48000;
        const notchFreq = 1000;
        const params = { notchFrequency: notchFreq, bandwidth: 400, order: 128, windowFunction: 'hamming', sampleRate };

        // Синусоида на частоте режекции
        const input = new Float32Array(2048);
        for (let i = 0; i < input.length; i++) {
            input[i] = Math.sin(2 * Math.PI * notchFreq * i / sampleRate);
        }

        // Прогреваем
        proc.process([input], params, 2048, 'notch_rej');
        proc.process([input], params, 2048, 'notch_rej');
        const output = proc.process([input], params, 2048, 'notch_rej');

        // Энергия выхода должна быть значительно меньше энергии входа
        let inputEnergy = 0, outputEnergy = 0;
        for (let i = 1024; i < 2048; i++) {
            inputEnergy += input[i] * input[i];
            outputEnergy += output[i] * output[i];
        }
        expect(outputEnergy).toBeLessThan(inputEnergy * 0.3);
    });

    it('пропускает синусоиду вне полосы режекции', () => {
        const proc = NotchFIRPlugin.processor;
        proc.clearStates();
        const sampleRate = 48000;
        const notchFreq = 5000;
        const passFreq = 500;
        const params = { notchFrequency: notchFreq, bandwidth: 500, order: 64, windowFunction: 'hamming', sampleRate };

        const input = new Float32Array(2048);
        for (let i = 0; i < input.length; i++) {
            input[i] = Math.sin(2 * Math.PI * passFreq * i / sampleRate);
        }

        proc.process([input], params, 2048, 'notch_pass');
        proc.process([input], params, 2048, 'notch_pass');
        const output = proc.process([input], params, 2048, 'notch_pass');

        let inputEnergy = 0, outputEnergy = 0;
        for (let i = 1024; i < 2048; i++) {
            inputEnergy += input[i] * input[i];
            outputEnergy += output[i] * output[i];
        }
        // Энергия выхода должна быть близка к входной
        expect(outputEnergy).toBeGreaterThan(inputEnergy * 0.5);
    });

    it('возвращает тишину при пустом входе', () => {
        const proc = NotchFIRPlugin.processor;
        proc.clearStates();
        const output = proc.process([], {}, 512, 'notch_empty');
        expect(output.length).toBe(512);
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBe(0);
        }
    });

    it('пересчитывает коэффициенты при изменении notchFrequency', () => {
        const proc = NotchFIRPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(256).fill(1.0);
        const params1 = { notchFrequency: 1000, bandwidth: 200, order: 64, sampleRate: 48000 };
        proc.process([input], params1, 256, 'notch_recomp');
        const coeffs1 = new Float32Array(proc.states.get('notch_recomp').coeffs);

        const params2 = { ...params1, notchFrequency: 5000 };
        proc.process([input], params2, 256, 'notch_recomp');
        const coeffs2 = proc.states.get('notch_recomp').coeffs;

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
        const output = proc.process([input], { targetFrequency: targetFreq, sampleRate: sampleRate, N }, 512, 'g1');
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
        const params = { targetFrequency: targetFreq, sampleRate: sampleRate, N };
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
        const output = proc.process([input], { targetFrequency: targetFreq, sampleRate: sampleRate, N }, 128, 'g5');
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
