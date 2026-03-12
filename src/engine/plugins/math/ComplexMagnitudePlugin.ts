/**
 * Амплитуда комплексного сигнала (Complex Magnitude) — Вычисление модуля |z|
 *
 * Назначение:
 *   Извлекает амплитуду (модуль) комплексного сигнала: |z| = sqrt(Re² + Im²).
 *   Преобразует комплексный сигнал в действительный, сохраняя информацию
 *   об амплитуде и отбрасывая фазу. Это одна из самых частых операций
 *   при работе с I/Q-сигналами: детектирование огибающей, AM-демодуляция,
 *   измерение уровня сигнала, построение спектрограмм.
 *
 * Алгоритм:
 *   y[n] = sqrt(Re[n]² + Im[n]²)
 *   Входной массив interleaved: [Re0, Im0, Re1, Im1, ...],
 *   выходной — обычный действительный массив.
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  complex (interleaved Float32Array [Re0, Im0, Re1, Im1, ...])
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Проверка амплитуды эталонного сигнала:
 *      RefSine(1000 Гц) → ComplexMagnitude → Oscilloscope
 *      Для идеального комплексного синуса |z| = const = 1.0.
 *      Отклонение от единицы указывает на дисбаланс I/Q.
 *
 *   2. AM-демодуляция:
 *      АМ-сигнал (I/Q) → ComplexMagnitude → Oscilloscope
 *      Модуль комплексной огибающей = исходный модулирующий сигнал.
 *
 *   3. Измерение уровня после фильтрации:
 *      Сигнал → BandpassFIR → ComplexMagnitude → NumericIndicator
 *      Показывает амплитуду сигнала в заданной полосе частот.
 */
export default {
    type: 'Амплитуда (комплексная)',
    id: 'complex-magnitude',
    icon: 'dsp-magnitude',
    description: 'Извлечение амплитуды комплексного сигнала (модуль)',
    group: 'math-blocks',
    signals: { input: 'complex', output: 'real' } as const,
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                const re = input[i * 2];
                const im = input[i * 2 + 1];
                output[i] = Math.sqrt(re * re + im * im);
            }

            return output;
        }
    }
};
