/**
 * Convolution — Линейная свёртка двух сигналов
 *
 * Назначение:
 *   Вычисляет линейную свёртку двух входных сигналов. Свёртка — фундаментальная
 *   операция в DSP, связывающая вход системы с её импульсной характеристикой.
 *   y[n] = Σ x₁[k] · x₂[n−k]
 *
 * Алгоритм:
 *   Прямая свёртка в режиме 'same' (выход той же длины, что и первый вход).
 *   Для каждого чанка выполняется независимая свёртка. Второй вход используется
 *   как ядро (kernel). Результат обрезается до длины chunkSize.
 *
 * Параметры:
 *   - normalize (boolean, по умолчанию false) — нормализация выхода по энергии ядра.
 *
 * Вход:  2× real (сигнал + ядро)
 * Выход: real (Float32Array)
 */

import type { PluginDefinition } from '../../types';

export default {
    type: 'Свёртка',
    id: 'convolution',
    icon: 'dsp-convolution',
    description: 'Линейная свёртка двух сигналов',
    group: 'real-math',
    signals: { input: 'real', output: 'real', inputsCount: 2 } as const,
    defaultParams: {
        normalize: false,
    },
    processor: {
        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const output = new Float32Array(chunkSize);
            const signal = inputs[0];
            const kernel = inputs[1];
            if (!signal || !kernel) {
                if (signal) output.set(signal);
                return output;
            }

            const normalize = (params.normalize ?? false) as boolean;
            const sigLen = signal.length;
            const kerLen = kernel.length;
            const halfKer = Math.floor(kerLen / 2);

            // Прямая свёртка в режиме 'same'
            for (let n = 0; n < chunkSize; n++) {
                let sum = 0;
                for (let k = 0; k < kerLen; k++) {
                    const sigIdx = n - halfKer + k;
                    if (sigIdx >= 0 && sigIdx < sigLen) {
                        sum += signal[sigIdx] * kernel[k];
                    }
                }
                output[n] = sum;
            }

            // Нормализация по энергии ядра
            if (normalize) {
                let kernelEnergy = 0;
                for (let k = 0; k < kerLen; k++) {
                    kernelEnergy += kernel[k] * kernel[k];
                }
                if (kernelEnergy > 0) {
                    const factor = 1 / Math.sqrt(kernelEnergy);
                    for (let i = 0; i < chunkSize; i++) {
                        output[i] *= factor;
                    }
                }
            }

            return output;
        }
    }
} satisfies PluginDefinition;
