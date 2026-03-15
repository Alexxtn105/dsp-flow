/**
 * Histogram — Гистограмма распределения амплитуд
 *
 * Назначение:
 *   Строит гистограмму распределения амплитуд входного сигнала.
 *   Полезно для анализа статистических свойств сигналов: гауссов шум
 *   даёт колокообразную форму, равномерный — прямоугольную.
 *
 * Параметры:
 *   - bins (int, по умолчанию 64) — число столбцов гистограммы.
 *
 * Вход:  real (Float32Array)
 * Выход: null (визуализация — гистограмма)
 */

import type { PluginDefinition } from '../../types';

export default {
    type: 'Гистограмма',
    id: 'histogram',
    icon: 'dsp-histogram',
    description: 'Гистограмма распределения амплитуд',
    group: 'visualization',
    signals: { input: 'real', output: null } as const,
    defaultParams: {
        bins: 64,
    },
    processor: {
        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number) {
            const input = inputs[0];
            const numBins = Math.max(4, Math.min(256, Math.floor((params.bins ?? 64) as number)));

            if (!input) {
                return { bins: new Float32Array(numBins), min: -1, max: 1, numBins };
            }

            // Определение диапазона
            let min = Infinity, max = -Infinity;
            for (let i = 0; i < chunkSize; i++) {
                if (input[i] < min) min = input[i];
                if (input[i] > max) max = input[i];
            }

            // Защита от нулевого диапазона
            if (max - min < 1e-10) {
                min = min - 0.5;
                max = max + 0.5;
            }

            const binWidth = (max - min) / numBins;
            const bins = new Float32Array(numBins);

            for (let i = 0; i < chunkSize; i++) {
                const val = input[i];
                if (!isFinite(val)) continue;
                const idx = Math.min(numBins - 1, Math.max(0, Math.floor((val - min) / binWidth)));
                bins[idx]++;
            }

            // Нормализация (доля от общего числа)
            for (let i = 0; i < numBins; i++) {
                bins[i] /= chunkSize;
            }

            return { bins, min, max, numBins };
        }
    }
} satisfies PluginDefinition;
