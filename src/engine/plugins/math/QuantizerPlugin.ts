/**
 * Quantizer — Квантователь (эмуляция АЦП)
 *
 * Назначение:
 *   Квантует входной сигнал на заданное число уровней, эмулируя работу АЦП
 *   с N битами разрешения. Позволяет наблюдать эффекты квантования:
 *   шум квантования, ступенчатую характеристику, ограничение динамического диапазона.
 *
 * Алгоритм:
 *   - Число уровней: L = 2^bits
 *   - Mid-rise: выход = (floor(x · L/2) + 0.5) · 2/L (нет нулевого уровня)
 *   - Mid-tread: выход = round(x · (L/2 − 1)) / (L/2 − 1) (есть нулевой уровень)
 *   - Входной сигнал ограничивается диапазоном [−1, 1].
 *
 * Параметры:
 *   - bits (int, по умолчанию 8) — число бит разрешения (1..16).
 *   - quantizerType (string, по умолчанию 'mid-tread') — тип: 'mid-rise' или 'mid-tread'.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array)
 */

import type { PluginDefinition } from '../../types';

export default {
    type: 'Квантователь',
    id: 'quantizer',
    icon: 'dsp-quantizer',
    description: 'Квантователь (эмуляция АЦП, N бит)',
    group: 'real-math',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {
        bits: 8,
        quantizerType: 'mid-tread',
    },
    processor: {
        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const output = new Float32Array(chunkSize);
            const input = inputs[0];
            if (!input) return output;

            const bits = Math.max(1, Math.min(16, Math.floor((params.bits ?? 8) as number)));
            const quantizerType = (params.quantizerType ?? 'mid-tread') as string;
            const levels = Math.pow(2, bits);

            for (let i = 0; i < chunkSize; i++) {
                // Ограничение входа
                const x = Math.max(-1, Math.min(1, input[i]));

                if (quantizerType === 'mid-rise') {
                    // Mid-rise: нет нулевого уровня
                    const halfLevels = levels / 2;
                    const quantized = (Math.floor(x * halfLevels) + 0.5) / halfLevels;
                    output[i] = Math.max(-1, Math.min(1, quantized));
                } else {
                    // Mid-tread: есть нулевой уровень
                    const halfLevels = levels / 2 - 1;
                    if (halfLevels <= 0) {
                        output[i] = x >= 0 ? 1 : -1;
                    } else {
                        output[i] = Math.round(x * halfLevels) / halfLevels;
                    }
                }

                // Ограничение выхода (на случай нецелочисленных уровней)
                if (output[i] < -1) output[i] = -1;
                else if (output[i] > 1) output[i] = 1;
            }

            return output;
        }
    }
} satisfies PluginDefinition;
