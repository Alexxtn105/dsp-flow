/**
 * Комплексное сопряжение (Complex Conjugate) — Инверсия мнимой части: a+jb → a−jb
 *
 * Назначение:
 *   Вычисляет комплексно-сопряжённый сигнал, инвертируя знак мнимой части
 *   каждого отсчёта. Геометрически это отражение вектора на комплексной
 *   плоскости относительно действительной оси. Сопряжение — фундаментальная
 *   операция в DSP: оно используется в вычислении корреляции (x·conj(y)),
 *   согласованной фильтрации, формировании автокорреляционной функции
 *   и обращении частоты вращения вектора.
 *
 * Алгоритм:
 *   Re_out[n] = Re_in[n]     (без изменений)
 *   Im_out[n] = -Im_in[n]    (инверсия знака)
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  complex (interleaved Float32Array [Re0, Im0, Re1, Im1, ...])
 * Выход: complex (interleaved Float32Array)
 *
 * Примеры использования:
 *
 *   1. Корреляция двух сигналов:
 *      Сигнал_B → ComplexConjugate → ComplexMultiplier (×Сигнал_A)
 *      Произведение z1·conj(z2) — основа вычисления взаимной корреляции
 *      и фазового сдвига между сигналами.
 *
 *   2. Обращение спектра (зеркалирование):
 *      Сигнал → ComplexConjugate → SpectrumAnalyzer
 *      Сопряжение обращает знак частоты: если сигнал вращался
 *      против часовой стрелки (+f), после сопряжения вращается
 *      по часовой (-f).
 *
 *   3. Согласованный фильтр:
 *      Известный паттерн → ComplexConjugate → ComplexMultiplier (×вход)
 *      Основа корреляционного приёмника для обнаружения известного
 *      сигнала в шуме.
 */
export default {
    type: 'Комплексное сопряжение',
    id: 'complex-conjugate',
    icon: 'dsp-conjugate',
    description: 'Вычисляет комплексно-сопряжённый сигнал (инвертирует мнимую часть: a+jb → a−jb)',
    group: 'complex-math',
    signals: { input: 'complex', output: 'complex' } as const,
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            const output = new Float32Array(input.length);

            for (let i = 0; i < input.length; i += 2) {
                output[i] = input[i];         // Re без изменений
                output[i + 1] = -input[i + 1]; // Im инвертируется
            }

            return output;
        }
    }
};
