/**
 * Квадратный корень действительного сигнала (Real Square Root) — √x
 *
 * Назначение:
 *   Извлекает квадратный корень из каждого отсчёта действительного сигнала:
 *   y[n] = √|x[n]|. Отрицательные значения обрабатываются через модуль,
 *   чтобы избежать NaN.
 *
 * Алгоритм:
 *   y[n] = Math.sqrt(Math.abs(x[n]))
 *   Без параметров, без состояния.
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Извлечение амплитуды из мощности:
 *      Сигнал → RealSquare → RealSqrt → NumericIndicator
 *      Цепочка x² → √x возвращает |x| (модуль сигнала).
 *
 *   2. Сжатие динамического диапазона:
 *      Сигнал → RealSqrt → Oscilloscope
 *      Квадратный корень уменьшает разброс амплитуд,
 *      делая тихие участки более различимыми.
 */
export default {
    type: 'Квадратный корень (действ.)',
    id: 'real-sqrt',
    icon: 'dsp-sqrt',
    description: 'Квадратный корень действительного сигнала',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real' },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const output = new Float32Array(chunkSize);
            for (let i = 0; i < chunkSize; i++) {
                const v = i < input.length ? input[i] : 0;
                output[i] = Math.sqrt(Math.abs(v));
            }

            return output;
        }
    }
};
