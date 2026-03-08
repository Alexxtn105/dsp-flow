import { describe, it, expect } from 'vitest';
import SummerPlugin from '../../src/engine/plugins/math/SummerPlugin.js';
import MultiplierPlugin from '../../src/engine/plugins/math/MultiplierPlugin.js';
import IntegratorPlugin from '../../src/engine/plugins/math/IntegratorPlugin.js';
import RealPartPlugin from '../../src/engine/plugins/math/RealPartPlugin.js';
import ImagPartPlugin from '../../src/engine/plugins/math/ImagPartPlugin.js';
import ComplexComposerPlugin from '../../src/engine/plugins/math/ComplexComposerPlugin.js';
import ComplexConjugatePlugin from '../../src/engine/plugins/math/ComplexConjugatePlugin.js';
import Atan2Plugin from '../../src/engine/plugins/math/Atan2Plugin.js';

describe('SummerPlugin', () => {
    it('суммирует два входа', () => {
        const a = new Float32Array([1.0, 2.0, 3.0]);
        const b = new Float32Array([4.0, 6.0, 8.0]);
        const output = SummerPlugin.processor.process([a, b], {}, 3);
        expect(output[0]).toBeCloseTo(5.0);
        expect(output[1]).toBeCloseTo(8.0);
        expect(output[2]).toBeCloseTo(11.0);
    });

    it('суммирует с весами', () => {
        const a = new Float32Array([1.0, 2.0]);
        const b = new Float32Array([4.0, 6.0]);
        const output = SummerPlugin.processor.process([a, b], { weights: [0.5, 2.0] }, 2);
        expect(output[0]).toBeCloseTo(8.5);  // 1*0.5 + 4*2.0
        expect(output[1]).toBeCloseTo(13.0); // 2*0.5 + 6*2.0
    });

    it('работает с одним входом', () => {
        const a = new Float32Array([2.0, 4.0]);
        const output = SummerPlugin.processor.process([a], {}, 2);
        expect(output[0]).toBeCloseTo(2.0);
        expect(output[1]).toBeCloseTo(4.0);
    });
});

describe('MultiplierPlugin', () => {
    it('перемножает два входа', () => {
        const a = new Float32Array([2.0, 3.0, 4.0]);
        const b = new Float32Array([5.0, 0.5, -1.0]);
        const output = MultiplierPlugin.processor.process([a, b], {}, 3);
        expect(output[0]).toBeCloseTo(10.0);
        expect(output[1]).toBeCloseTo(1.5);
        expect(output[2]).toBeCloseTo(-4.0);
    });

    it('работает с одним входом (pass-through)', () => {
        const a = new Float32Array([2.0, 3.0]);
        const output = MultiplierPlugin.processor.process([a], {}, 2);
        // один вход — pass-through (умножение на 1.0)
        expect(output[0]).toBeCloseTo(2.0);
        expect(output[1]).toBeCloseTo(3.0);
    });
});

describe('IntegratorPlugin', () => {
    it('интегрирует постоянный сигнал (линейный рост)', () => {
        const proc = IntegratorPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(100).fill(1.0);
        const params = { sampleRate: 1000, resetOnOverflow: false, maxValue: 1e6 };
        const output = proc.process([input], params, 100, 'int1');
        // Интеграл от 1.0 с dt = 0.001 — линейный рост
        expect(output[99]).toBeGreaterThan(0);
        // Значение должно расти монотонно
        for (let i = 1; i < 100; i++) {
            expect(output[i]).toBeGreaterThanOrEqual(output[i - 1]);
        }
    });

    it('сброс при overflow (resetOnOverflow = true)', () => {
        const proc = IntegratorPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(1000).fill(100.0);
        const params = { sampleRate: 100, resetOnOverflow: true, maxValue: 10 };
        const output = proc.process([input], params, 1000, 'int2');
        // Где-то в массиве должен произойти сброс (значение = 0)
        let foundReset = false;
        for (let i = 1; i < output.length; i++) {
            if (output[i] === 0 && output[i - 1] !== 0) {
                foundReset = true;
                break;
            }
        }
        expect(foundReset).toBe(true);
    });

    it('saturation при overflow (resetOnOverflow = false)', () => {
        const proc = IntegratorPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(1000).fill(100.0);
        const params = { sampleRate: 100, resetOnOverflow: false, maxValue: 10 };
        const output = proc.process([input], params, 1000, 'int3');
        // Значение не должно превышать maxValue
        for (let i = 0; i < output.length; i++) {
            expect(Math.abs(output[i])).toBeLessThanOrEqual(10.01);
        }
    });

    it('возвращает тишину при пустом входе', () => {
        const proc = IntegratorPlugin.processor;
        proc.clearStates();
        const output = proc.process([], {}, 128, 'int4');
        expect(output.length).toBe(128);
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBe(0);
        }
    });

    it('сохраняет состояние между вызовами', () => {
        const proc = IntegratorPlugin.processor;
        proc.clearStates();
        const input = new Float32Array(100).fill(1.0);
        const params = { sampleRate: 1000, resetOnOverflow: false, maxValue: 1e6 };
        const out1 = proc.process([input], params, 100, 'int5');
        const out2 = proc.process([input], params, 100, 'int5');
        // Второй чанк продолжает интегрирование — начальное значение > 0
        expect(out2[0]).toBeGreaterThan(out1[0]);
    });
});

describe('RealPartPlugin', () => {
    it('извлекает действительную часть из interleaved I/Q', () => {
        // Interleaved: [I0, Q0, I1, Q1, I2, Q2]
        const input = new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0]);
        const output = RealPartPlugin.processor.process([input], {}, 6);
        expect(output.length).toBe(3); // input.length / 2
        expect(output[0]).toBeCloseTo(1.0);
        expect(output[1]).toBeCloseTo(3.0);
        expect(output[2]).toBeCloseTo(5.0);
    });

    it('возвращает тишину при пустом входе', () => {
        const output = RealPartPlugin.processor.process([], {}, 128);
        expect(output.length).toBe(128);
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBe(0);
        }
    });

    it('обрабатывает единичный сэмпл', () => {
        const input = new Float32Array([7.5, -3.2]);
        const output = RealPartPlugin.processor.process([input], {}, 2);
        expect(output.length).toBe(1);
        expect(output[0]).toBeCloseTo(7.5);
    });
});

describe('ImagPartPlugin', () => {
    it('извлекает мнимую часть из interleaved I/Q', () => {
        // Interleaved: [I0, Q0, I1, Q1, I2, Q2]
        const input = new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0]);
        const output = ImagPartPlugin.processor.process([input], {}, 6);
        expect(output.length).toBe(3);
        expect(output[0]).toBeCloseTo(2.0);
        expect(output[1]).toBeCloseTo(4.0);
        expect(output[2]).toBeCloseTo(6.0);
    });

    it('возвращает тишину при пустом входе', () => {
        const output = ImagPartPlugin.processor.process([], {}, 128);
        expect(output.length).toBe(128);
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBe(0);
        }
    });

    it('обрабатывает единичный сэмпл', () => {
        const input = new Float32Array([7.5, -3.2]);
        const output = ImagPartPlugin.processor.process([input], {}, 2);
        expect(output.length).toBe(1);
        expect(output[0]).toBeCloseTo(-3.2);
    });
});

describe('ComplexComposerPlugin', () => {
    it('формирует комплексный сигнал из двух действительных', () => {
        const re = new Float32Array([1.0, 2.0, 3.0]);
        const im = new Float32Array([4.0, 5.0, 6.0]);
        const output = ComplexComposerPlugin.processor.process([re, im], {}, 3);
        // Interleaved: [Re0, Im0, Re1, Im1, Re2, Im2]
        expect(output.length).toBe(6);
        expect(output[0]).toBeCloseTo(1.0);
        expect(output[1]).toBeCloseTo(4.0);
        expect(output[2]).toBeCloseTo(2.0);
        expect(output[3]).toBeCloseTo(5.0);
        expect(output[4]).toBeCloseTo(3.0);
        expect(output[5]).toBeCloseTo(6.0);
    });

    it('работает только с действительной частью (мнимая = 0)', () => {
        const re = new Float32Array([1.0, 2.0]);
        const output = ComplexComposerPlugin.processor.process([re, null], {}, 2);
        expect(output.length).toBe(4);
        expect(output[0]).toBeCloseTo(1.0);
        expect(output[1]).toBeCloseTo(0.0);
        expect(output[2]).toBeCloseTo(2.0);
        expect(output[3]).toBeCloseTo(0.0);
    });

    it('работает только с мнимой частью (действительная = 0)', () => {
        const im = new Float32Array([3.0, 4.0]);
        const output = ComplexComposerPlugin.processor.process([null, im], {}, 2);
        expect(output.length).toBe(4);
        expect(output[0]).toBeCloseTo(0.0);
        expect(output[1]).toBeCloseTo(3.0);
        expect(output[2]).toBeCloseTo(0.0);
        expect(output[3]).toBeCloseTo(4.0);
    });

    it('возвращает тишину при пустых входах', () => {
        const output = ComplexComposerPlugin.processor.process([null, null], {}, 128);
        expect(output.length).toBe(256);
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBe(0);
        }
    });

    it('обратная операция к RealPart + ImagPart', () => {
        const re = new Float32Array([1.0, -2.0, 3.5]);
        const im = new Float32Array([0.5, 1.0, -0.7]);
        const complex = ComplexComposerPlugin.processor.process([re, im], {}, 3);
        const extractedRe = RealPartPlugin.processor.process([complex], {}, 6);
        const extractedIm = ImagPartPlugin.processor.process([complex], {}, 6);
        for (let i = 0; i < 3; i++) {
            expect(extractedRe[i]).toBeCloseTo(re[i]);
            expect(extractedIm[i]).toBeCloseTo(im[i]);
        }
    });
});

describe('ComplexConjugatePlugin', () => {
    it('инвертирует мнимую часть комплексного сигнала', () => {
        // Interleaved: [Re0, Im0, Re1, Im1, Re2, Im2]
        const input = new Float32Array([1.0, 2.0, 3.0, -4.0, 5.0, 0.0]);
        const output = ComplexConjugatePlugin.processor.process([input], {}, 6);
        expect(output.length).toBe(6);
        expect(output[0]).toBeCloseTo(1.0);   // Re0 без изменений
        expect(output[1]).toBeCloseTo(-2.0);  // Im0 инвертирована
        expect(output[2]).toBeCloseTo(3.0);   // Re1
        expect(output[3]).toBeCloseTo(4.0);   // Im1 инвертирована
        expect(output[4]).toBeCloseTo(5.0);   // Re2
        expect(output[5]).toBeCloseTo(0.0);   // Im2 = -0 ≈ 0
    });

    it('двойное сопряжение возвращает исходный сигнал', () => {
        const input = new Float32Array([1.0, 2.0, -3.0, 4.5]);
        const conjugate = ComplexConjugatePlugin.processor.process([input], {}, 4);
        const doubleConj = ComplexConjugatePlugin.processor.process([conjugate], {}, 4);
        for (let i = 0; i < input.length; i++) {
            expect(doubleConj[i]).toBeCloseTo(input[i]);
        }
    });

    it('возвращает тишину при пустом входе', () => {
        const output = ComplexConjugatePlugin.processor.process([], {}, 128);
        expect(output.length).toBe(256);
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBe(0);
        }
    });

    it('обрабатывает единичный комплексный сэмпл', () => {
        const input = new Float32Array([7.5, -3.2]);
        const output = ComplexConjugatePlugin.processor.process([input], {}, 2);
        expect(output.length).toBe(2);
        expect(output[0]).toBeCloseTo(7.5);
        expect(output[1]).toBeCloseTo(3.2);
    });
});

describe('Atan2Plugin', () => {
    it('вычисляет atan2(y, x) поэлементно', () => {
        const y = new Float32Array([1.0, 0.0, -1.0]);
        const x = new Float32Array([0.0, 1.0, 0.0]);
        const output = Atan2Plugin.processor.process([y, x], {}, 3);
        expect(output[0]).toBeCloseTo(Math.PI / 2);   // atan2(1, 0) = π/2
        expect(output[1]).toBeCloseTo(0);              // atan2(0, 1) = 0
        expect(output[2]).toBeCloseTo(-Math.PI / 2);   // atan2(-1, 0) = -π/2
    });

    it('atan2(1, 1) = π/4', () => {
        const y = new Float32Array([1.0]);
        const x = new Float32Array([1.0]);
        const output = Atan2Plugin.processor.process([y, x], {}, 1);
        expect(output[0]).toBeCloseTo(Math.PI / 4);
    });

    it('atan2(0, 0) = 0', () => {
        const y = new Float32Array([0.0]);
        const x = new Float32Array([0.0]);
        const output = Atan2Plugin.processor.process([y, x], {}, 1);
        expect(output[0]).toBeCloseTo(0);
    });

    it('работает с одним входом (x = 0)', () => {
        const y = new Float32Array([1.0, -1.0]);
        const output = Atan2Plugin.processor.process([y], {}, 2);
        expect(output[0]).toBeCloseTo(Math.PI / 2);
        expect(output[1]).toBeCloseTo(-Math.PI / 2);
    });

    it('возвращает нули при пустых входах', () => {
        const output = Atan2Plugin.processor.process([], {}, 64);
        expect(output.length).toBe(64);
        for (let i = 0; i < 64; i++) {
            expect(output[i]).toBe(0);
        }
    });

    it('метаданные плагина корректны', () => {
        expect(Atan2Plugin.type).toBe('Арктангенс');
        expect(Atan2Plugin.id).toBe('atan2');
        expect(Atan2Plugin.signals.input).toBe('real');
        expect(Atan2Plugin.signals.output).toBe('real');
        expect(Atan2Plugin.signals.inputsCount).toBe(2);
    });
});
