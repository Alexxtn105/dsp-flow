/**
 * Мнимая часть (Imaginary Part) — Извлечение Im(z) из комплексного сигнала
 *
 * Назначение:
 *   Извлекает мнимую (квадратурную, Quadrature, Q) компоненту комплексного
 *   сигнала. Преобразует комплексный сигнал в действительный, отбрасывая
 *   действительную часть. Для комплексной экспоненты exp(j2πft)
 *   мнимая часть — это sin(2πft). Блок является парным к RealPart
 *   и используется для анализа квадратурной составляющей, визуализации
 *   Q-канала и раздельной обработки компонент I/Q-сигнала.
 *
 * Алгоритм:
 *   output[n] = input[2n + 1]  (нечётные элементы interleaved-массива)
 *   Размер выходного массива = входной / 2.
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  complex (interleaved Float32Array [Re0, Im0, Re1, Im1, ...])
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Визуализация Q-компоненты:
 *      RefSine(1000 Гц) → ImagPart → Oscilloscope
 *      На осциллографе видна синусоида — квадратурная составляющая
 *      комплексного синуса сдвинута на 90° относительно косинуса (Re).
 *
 *   2. Проверка баланса I/Q:
 *      Сигнал → RealPart → Oscilloscope (канал 1)
 *      Сигнал → ImagPart → Oscilloscope (канал 2)
 *      Амплитуды I и Q должны быть равны для сбалансированного
 *      квадратурного сигнала.
 *
 *   3. Демодуляция Q-канала:
 *      QPSK → ImagPart → Threshold → NumericIndicator
 *      Извлечение бит из квадратурного канала QPSK-сигнала
 *      (после тактовой и фазовой синхронизации).
 */
export default {
    type: 'Im (мнимая часть)',
    id: 'imag-part',
    icon: 'dsp-imag',
    description: 'Извлечение мнимой части комплексного сигнала',
    group: 'math-blocks',
    signals: { input: 'complex', output: 'real' },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                output[i] = input[i * 2 + 1];
            }

            return output;
        }
    }
};
