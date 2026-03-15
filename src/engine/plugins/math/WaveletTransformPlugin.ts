/**
 * WaveletTransform — Дискретное вейвлет-преобразование (Хаар)
 *
 * Назначение:
 *   Дискретное вейвлет-преобразование (DWT) раскладывает сигнал на составляющие
 *   разных масштабов (частотных полос). В отличие от БПФ, вейвлет-преобразование
 *   обеспечивает одновременное разрешение по времени и частоте: низкие частоты
 *   локализованы по частоте, высокие — по времени.
 *
 *   Вейвлет Хаара — простейший ортогональный вейвлет. На каждом уровне
 *   декомпозиции сигнал разделяется на аппроксимирующие (cA) и детализирующие (cD)
 *   коэффициенты:
 *   - cA[k] = (x[2k] + x[2k+1]) / √2  — сглаженная (низкочастотная) версия
 *   - cD[k] = (x[2k] - x[2k+1]) / √2  — детали (высокочастотная компонента)
 *
 *   Типичные применения:
 *   - Сжатие сигналов и изображений (JPEG 2000 использует DWT)
 *   - Удаление шума (wavelet denoising) — обнуление малых детализирующих коэффициентов
 *   - Обнаружение скачков и разрывов в сигнале
 *   - Многомасштабный анализ: выделение трендов и деталей на разных уровнях
 *
 * Алгоритм:
 *   1. Входной сигнал копируется и дополняется нулями до ближайшей степени двойки.
 *   2. На каждом уровне (от 1 до L):
 *      - Из текущего массива длины M вычисляются M/2 аппроксимирующих и M/2
 *        детализирующих коэффициентов.
 *      - Детализирующие коэффициенты cD сохраняются, аппроксимирующие cA
 *        передаются на следующий уровень.
 *   3. Выходной массив формируется в стандартном порядке DWT-упаковки:
 *      [cD_L | cD_{L-1} | ... | cD_1 | cA_L]
 *      Это позволяет легко извлекать коэффициенты каждого уровня.
 *
 * Параметры:
 *   - levels (int, по умолчанию 3) — количество уровней декомпозиции.
 *     Больше уровней = более глубокое разложение по частотам. Максимум
 *     ограничен log₂(N), где N — длина сигнала (с учётом дополнения).
 *   - wavelet (string, по умолчанию 'haar') — тип вейвлета.
 *     В текущей версии поддерживается только вейвлет Хаара.
 *
 * Вход:  real (Float32Array — вещественный сигнал)
 * Выход: real (Float32Array — DWT-коэффициенты в стандартной упаковке)
 *
 * Примеры использования:
 *
 *   1. Многомасштабный анализ:
 *      Sine(100) → WaveletTransform(levels=3) → Oscilloscope
 *      На осциллографе видны коэффициенты разложения: справа — самые
 *      грубые детали (cD_1), слева — самые глубокие (cD_3 и cA_3).
 *
 *   2. Обнаружение скачков:
 *      Step → WaveletTransform(levels=4) → Oscilloscope
 *      Детализирующие коэффициенты покажут всплеск в месте скачка сигнала.
 *
 *   3. Анализ зашумлённого сигнала:
 *      [Sine(500) + NoiseGenerator(уровень=0.5)] → WaveletTransform(levels=5)
 *      → Oscilloscope
 *      Шум сосредоточен в детализирующих коэффициентах верхних уровней,
 *      полезный сигнал — в аппроксимирующих коэффициентах нижних.
 */
import type { PluginDefinition } from '../../types';

function nextPow2(n: number): number {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
}

export default {
    type: 'Вейвлет-преобразование',
    id: 'wavelet-transform',
    icon: 'dsp-wavelet',
    description: 'Дискретное вейвлет-преобразование (Хаар)',
    group: 'complex-math',

    signals: {
        input: 'real' as const,
        output: 'real' as const,
    },

    defaultParams: {
        levels: 3,
        wavelet: 'haar',
    },

    processor: {
        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const levels = Math.max(1, (params.levels ?? 3) as number);

            // Pad input to next power of 2
            const paddedLen = nextPow2(input.length);
            const maxLevels = Math.floor(Math.log2(paddedLen));
            const actualLevels = Math.min(levels, maxLevels);

            // Work on a copy in Float64 for precision
            const data = new Float64Array(paddedLen);
            for (let i = 0; i < input.length; i++) {
                data[i] = input[i];
            }

            // Store detail coefficients for each level
            const details: Float64Array[] = [];
            let currentLen = paddedLen;

            for (let level = 0; level < actualLevels; level++) {
                const halfLen = currentLen >> 1;
                const cA = new Float64Array(halfLen);
                const cD = new Float64Array(halfLen);

                for (let k = 0; k < halfLen; k++) {
                    const x0 = data[2 * k];
                    const x1 = data[2 * k + 1];
                    cA[k] = (x0 + x1) / Math.SQRT2;
                    cD[k] = (x0 - x1) / Math.SQRT2;
                }

                details.push(cD);

                // Copy approximation back for next level
                for (let k = 0; k < halfLen; k++) {
                    data[k] = cA[k];
                }
                currentLen = halfLen;
            }

            // Build output in standard DWT packing: [cD_L | cD_{L-1} | ... | cD_1 | cA_L]
            // Note: details[0] = cD_1 (first level), details[L-1] = cD_L (deepest level)
            // cA_L is in data[0..currentLen-1]
            const result = new Float64Array(paddedLen);
            let pos = 0;

            // cA_L (approximation at deepest level) — goes first in the packed array
            for (let i = 0; i < currentLen; i++) {
                result[pos++] = data[i];
            }

            // Detail coefficients from deepest to shallowest: cD_L, cD_{L-1}, ..., cD_1
            for (let level = actualLevels - 1; level >= 0; level--) {
                const cD = details[level];
                for (let i = 0; i < cD.length; i++) {
                    result[pos++] = cD[i];
                }
            }

            // Output trimmed to chunkSize
            const output = new Float32Array(chunkSize);
            const copyLen = Math.min(chunkSize, paddedLen);
            for (let i = 0; i < copyLen; i++) {
                output[i] = result[i];
            }

            return output;
        }
    }
} satisfies PluginDefinition;
