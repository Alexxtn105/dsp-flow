import { describe, it, expect } from 'vitest';
import SineGeneratorPlugin from '../../src/engine/plugins/generators/SineGeneratorPlugin.js';
import CosineGeneratorPlugin from '../../src/engine/plugins/generators/CosineGeneratorPlugin.js';
import RefSineGeneratorPlugin from '../../src/engine/plugins/generators/RefSineGeneratorPlugin.js';
import RefCosineGeneratorPlugin from '../../src/engine/plugins/generators/RefCosineGeneratorPlugin.js';

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
});
