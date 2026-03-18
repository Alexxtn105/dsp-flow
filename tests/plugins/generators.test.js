import { describe, it, expect } from 'vitest';
import SineGeneratorPlugin from '../../src/engine/plugins/generators/SineGeneratorPlugin.js';
import CosineGeneratorPlugin from '../../src/engine/plugins/generators/CosineGeneratorPlugin.js';
import RefSineGeneratorPlugin from '../../src/engine/plugins/generators/RefSineGeneratorPlugin.js';
import RefCosineGeneratorPlugin from '../../src/engine/plugins/generators/RefCosineGeneratorPlugin.js';
import ConstantPlugin from '../../src/engine/plugins/generators/ConstantPlugin.js';
import MicrophoneInputPlugin from '../../src/engine/plugins/generators/MicrophoneInputPlugin.js';
import MicrophoneService from '../../src/engine/MicrophoneService.js';

/**
 * Вспомогательная функция: находит частоту пика в спектре действительного сигнала
 */
function findPeakFrequency(signal, sampleRate) {
    const N = signal.length;
    let maxMag = 0, peakBin = 0, dcMag = 0;
    for (let k = 0; k <= N / 2; k++) {
        let re = 0, im = 0;
        for (let n = 0; n < N; n++) {
            re += signal[n] * Math.cos(2 * Math.PI * k * n / N);
            im -= signal[n] * Math.sin(2 * Math.PI * k * n / N);
        }
        const mag = Math.sqrt(re * re + im * im) / N;
        if (k === 0) dcMag = mag;
        if (k > 0 && mag > maxMag) { maxMag = mag; peakBin = k; }
    }
    return {
        peakFreq: peakBin * sampleRate / N,
        peakMag: maxMag,
        dcMag,
        peakBin
    };
}

describe('SineGeneratorPlugin', () => {
    it('генерирует синусоиду правильной длины', () => {
        const proc = SineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, 1024, 'node1');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(1024);
    });

    it('амплитуда не превышает заданную', () => {
        const proc = SineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 1000, amplitude: 0.5, phase: 0, sampleRate: 48000 }, 4096, 'node2');
        for (let i = 0; i < output.length; i++) {
            expect(Math.abs(output[i])).toBeLessThanOrEqual(0.501);
        }
    });

    it('сохраняет фазу между вызовами', () => {
        const proc = SineGeneratorPlugin.processor;
        proc.clearStates();
        const params = { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 };
        const out1 = proc.process([], params, 1024, 'node3');
        const out2 = proc.process([], params, 1024, 'node3');
        // Второй чанк должен продолжить фазу, а не начинать заново
        // Если бы фаза сбрасывалась, out2[0] == out1[0], но при правильной работе они различаются
        // (при 1000 Гц и 48000 Гц chunk = 1024 -> 21.3 мс -> не кратно периоду)
        expect(out2[0]).not.toBeCloseTo(out1[0], 5);
    });

    it('изоляция nodeId — разные узлы независимы', () => {
        const proc = SineGeneratorPlugin.processor;
        proc.clearStates();
        const params = { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 };
        proc.process([], params, 1024, 'nodeA');
        const outB = proc.process([], params, 1024, 'nodeB');
        const outA2 = proc.process([], params, 1024, 'nodeA');
        // nodeB первый вызов — должен начать с нуля, как nodeA первый вызов
        expect(outB[0]).toBeCloseTo(0, 3);
        // nodeA второй вызов — должен продолжить
        expect(outA2[0]).not.toBeCloseTo(0, 3);
    });
});

describe('CosineGeneratorPlugin', () => {
    it('генерирует косинусоиду', () => {
        const proc = CosineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, 1024, 'cos1');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(1024);
        // Косинус начинается с amplitude
        expect(output[0]).toBeCloseTo(1.0, 3);
    });

    it('амплитуда корректна', () => {
        const proc = CosineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 500, amplitude: 0.7, phase: 0, sampleRate: 48000 }, 4096, 'cos2');
        for (let i = 0; i < output.length; i++) {
            expect(Math.abs(output[i])).toBeLessThanOrEqual(0.701);
        }
    });

    it('сохраняет фазу между вызовами', () => {
        const proc = CosineGeneratorPlugin.processor;
        proc.clearStates();
        const params = { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 };
        const out1 = proc.process([], params, 1024, 'cos3');
        const out2 = proc.process([], params, 1024, 'cos3');
        expect(out2[0]).not.toBeCloseTo(out1[0], 5);
    });

    it('начальное значение косинуса равно amplitude', () => {
        const proc = CosineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 440, amplitude: 0.8, phase: 0, sampleRate: 48000 }, 10, 'cos4');
        expect(output[0]).toBeCloseTo(0.8, 3);
    });
});

describe('RefSineGeneratorPlugin', () => {
    it('генерирует комплексный выход (interleaved I/Q)', () => {
        const proc = RefSineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, 512, 'rs1');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(1024); // chunkSize * 2
    });

    it('I-компонента (sin) начинается с 0, Q-компонента (cos) начинается с amplitude', () => {
        const proc = RefSineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, 10, 'rs2');
        expect(output[0]).toBeCloseTo(0, 3);    // I = sin(0) = 0
        expect(output[1]).toBeCloseTo(1.0, 3);  // Q = cos(0) = 1
    });

    it('амплитуда I и Q не превышает заданную', () => {
        const proc = RefSineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 1000, amplitude: 0.5, phase: 0, sampleRate: 48000 }, 2048, 'rs3');
        for (let i = 0; i < output.length; i++) {
            expect(Math.abs(output[i])).toBeLessThanOrEqual(0.51);
        }
    });

    it('сохраняет фазу между вызовами', () => {
        const proc = RefSineGeneratorPlugin.processor;
        proc.clearStates();
        const params = { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 };
        const out1 = proc.process([], params, 512, 'rs4');
        const out2 = proc.process([], params, 512, 'rs4');
        expect(out2[0]).not.toBeCloseTo(out1[0], 5);
    });

    it('управление частотой через вход input-0', () => {
        const proc = RefSineGeneratorPlugin.processor;
        proc.clearStates();
        const chunkSize = 1024;
        // Входной сигнал частоты: постоянное значение 2000 Гц
        const freqInput = new Float32Array(chunkSize).fill(2000);
        const output = proc.process([freqInput], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, chunkSize, 'rs5');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(chunkSize * 2);

        // Сравним с генерацией без входа, но с frequency=2000
        proc.clearStates();
        const outputDirect = proc.process([], { frequency: 2000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, chunkSize, 'rs6');
        // Результаты должны совпадать
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBeCloseTo(outputDirect[i], 5);
        }
    });

    it('управление фазой через вход input-1', () => {
        const proc = RefSineGeneratorPlugin.processor;
        proc.clearStates();
        const chunkSize = 64;
        // Смещение фазы π/2 рад на каждом сэмпле
        const phaseInput = new Float32Array(chunkSize).fill(Math.PI / 2);
        const output = proc.process([null, phaseInput], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, chunkSize, 'rs7');
        // При фазе 0 + смещении π/2: I = sin(π/2) = 1, Q = cos(π/2) = 0
        expect(output[0]).toBeCloseTo(1.0, 3);
        expect(output[1]).toBeCloseTo(0, 3);
    });

    it('имеет 2 входа типа real', () => {
        expect(RefSineGeneratorPlugin.signals.input).toBe('real');
        expect(RefSineGeneratorPlugin.signals.inputsCount).toBe(2);
    });

    it('Константа(1500) → NCO: спектр содержит пик на 1500 Гц', () => {
        const chunkSize = 4096;
        const sampleRate = 48000;

        // Симулируем: Constant(1500) → RefSine freq input
        const freqInput = new Float32Array(chunkSize).fill(1500);
        const proc = RefSineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([freqInput], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate }, chunkSize, 'spec1');

        // Извлекаем I-компоненту
        const iSignal = new Float32Array(chunkSize);
        for (let i = 0; i < chunkSize; i++) iSignal[i] = output[i * 2];

        const { peakFreq, peakMag, dcMag } = findPeakFrequency(iSignal, sampleRate);

        // Пик должен быть на 1500 Гц (±1 бин = ±11.7 Гц)
        expect(peakFreq).toBeCloseTo(1500, -1);
        // Уровень пика должен быть значительно выше DC
        expect(peakMag).toBeGreaterThan(dcMag * 10);
        // Пик должен быть существенным (>0.3 для amplitude=1.0)
        expect(peakMag).toBeGreaterThan(0.3);
    });

    it('NCO корректно работает при отрицательных частотах', () => {
        const proc = RefSineGeneratorPlugin.processor;
        proc.clearStates();
        const chunkSize = 256;
        const sampleRate = 48000;
        const freqInput = new Float32Array(chunkSize).fill(-500);
        const output = proc.process([freqInput], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate }, chunkSize, 'neg1');

        // Проверяем что выход не содержит NaN/Infinity
        for (let i = 0; i < output.length; i++) {
            expect(isFinite(output[i])).toBe(true);
        }
        // Амплитуда не превышает заданную
        for (let i = 0; i < output.length; i++) {
            expect(Math.abs(output[i])).toBeLessThanOrEqual(1.01);
        }
    });
});

describe('RefCosineGeneratorPlugin', () => {
    it('генерирует комплексный выход (interleaved I/Q)', () => {
        const proc = RefCosineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, 512, 'rc1');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(1024);
    });

    it('I-компонента (cos) начинается с amplitude, Q-компонента (-sin) начинается с 0', () => {
        const proc = RefCosineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, 10, 'rc2');
        expect(output[0]).toBeCloseTo(1.0, 3);  // I = cos(0) = 1
        expect(output[1]).toBeCloseTo(0, 3);     // Q = -sin(0) = 0
    });

    it('сохраняет фазу между вызовами', () => {
        const proc = RefCosineGeneratorPlugin.processor;
        proc.clearStates();
        const params = { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 };
        const out1 = proc.process([], params, 512, 'rc3');
        const out2 = proc.process([], params, 512, 'rc3');
        expect(out2[0]).not.toBeCloseTo(out1[0], 5);
    });

    it('изоляция nodeId', () => {
        const proc = RefCosineGeneratorPlugin.processor;
        proc.clearStates();
        const params = { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 };
        proc.process([], params, 512, 'rcA');
        const outB = proc.process([], params, 512, 'rcB');
        // Новый узел начинает с cos(0) = amplitude
        expect(outB[0]).toBeCloseTo(1.0, 3);
    });

    it('управление частотой через вход input-0', () => {
        const proc = RefCosineGeneratorPlugin.processor;
        proc.clearStates();
        const chunkSize = 1024;
        const freqInput = new Float32Array(chunkSize).fill(2000);
        const output = proc.process([freqInput], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, chunkSize, 'rc5');
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(chunkSize * 2);

        proc.clearStates();
        const outputDirect = proc.process([], { frequency: 2000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, chunkSize, 'rc6');
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBeCloseTo(outputDirect[i], 5);
        }
    });

    it('управление фазой через вход input-1', () => {
        const proc = RefCosineGeneratorPlugin.processor;
        proc.clearStates();
        const chunkSize = 64;
        const phaseInput = new Float32Array(chunkSize).fill(Math.PI / 2);
        const output = proc.process([null, phaseInput], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate: 48000 }, chunkSize, 'rc7');
        // При фазе 0 + смещении π/2: I = cos(π/2) = 0, Q = -sin(π/2) = -1
        expect(output[0]).toBeCloseTo(0, 3);
        expect(output[1]).toBeCloseTo(-1.0, 3);
    });

    it('имеет 2 входа типа real', () => {
        expect(RefCosineGeneratorPlugin.signals.input).toBe('real');
        expect(RefCosineGeneratorPlugin.signals.inputsCount).toBe(2);
    });

    it('Константа(1500) → NCO: спектр содержит пик на 1500 Гц', () => {
        const chunkSize = 4096;
        const sampleRate = 48000;

        const freqInput = new Float32Array(chunkSize).fill(1500);
        const proc = RefCosineGeneratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([freqInput], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate }, chunkSize, 'rcspec1');

        const iSignal = new Float32Array(chunkSize);
        for (let i = 0; i < chunkSize; i++) iSignal[i] = output[i * 2];

        const { peakFreq, peakMag, dcMag } = findPeakFrequency(iSignal, sampleRate);

        expect(peakFreq).toBeCloseTo(1500, -1);
        expect(peakMag).toBeGreaterThan(dcMag * 10);
        expect(peakMag).toBeGreaterThan(0.3);
    });
});

describe('ConstantPlugin', () => {
    it('выводит значение без ограничений диапазона', () => {
        const proc = ConstantPlugin.processor;

        // Частотные значения
        let out = proc.process([], { value: 1500 }, 64, 'const1');
        expect(out[0]).toBe(1500);

        out = proc.process([], { value: 24000 }, 64, 'const2');
        expect(out[0]).toBe(24000);

        out = proc.process([], { value: -500 }, 64, 'const3');
        expect(out[0]).toBe(-500);

        out = proc.process([], { value: 0.001 }, 64, 'const4');
        expect(out[0]).toBeCloseTo(0.001, 6);
    });

    it('Константа(1500) → RefSine: генерирует 1500 Гц', () => {
        const chunkSize = 4096;
        const sampleRate = 48000;

        // Полная цепочка: Constant → RefSine
        const constOut = ConstantPlugin.processor.process([], { value: 1500 }, chunkSize, 'chain1');
        expect(constOut[0]).toBe(1500);

        RefSineGeneratorPlugin.processor.clearStates();
        const ncoOut = RefSineGeneratorPlugin.processor.process(
            [constOut], { frequency: 1000, amplitude: 1.0, phase: 0, sampleRate }, chunkSize, 'chain2'
        );

        const iSignal = new Float32Array(chunkSize);
        for (let i = 0; i < chunkSize; i++) iSignal[i] = ncoOut[i * 2];

        const { peakFreq, peakMag } = findPeakFrequency(iSignal, sampleRate);
        expect(peakFreq).toBeCloseTo(1500, -1);
        expect(peakMag).toBeGreaterThan(0.3);
    });
});

describe('MicrophoneInputPlugin', () => {
    it('process() возвращает тишину (placeholder)', () => {
        const output = MicrophoneInputPlugin.processor.process([], { gain: 1.0, sampleRate: 48000 }, 1024);
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(1024);
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBe(0);
        }
    });

    it('имеет корректные метаданные', () => {
        expect(MicrophoneInputPlugin.id).toBe('microphone-input');
        expect(MicrophoneInputPlugin.group).toBe('generators');
        expect(MicrophoneInputPlugin.signals.input).toBeNull();
        expect(MicrophoneInputPlugin.signals.output).toBe('real');
        expect(MicrophoneInputPlugin.icon).toBe('dsp-microphone');
    });
});

describe('MicrophoneService', () => {
    it('readChunk() возвращает тишину когда не активен', () => {
        const output = MicrophoneService.readChunk(1024);
        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(1024);
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBe(0);
        }
    });

    it('isActive = false по умолчанию', () => {
        expect(MicrophoneService.isActive).toBe(false);
    });

    it('stop() безопасен при повторном вызове', () => {
        expect(() => {
            MicrophoneService.stop();
            MicrophoneService.stop();
        }).not.toThrow();
    });
});
