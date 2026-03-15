/**
 * Power Meter — Измеритель мощности
 *
 * Назначение:
 *   Измеряет мощность входного сигнала: RMS, пиковую и среднюю.
 *   Возвращает вычисленные метрики для отображения в MeasurementView.
 *
 * Параметры: нет
 *
 * Вход:  real (Float32Array)
 * Выход: null (визуализация — метрики мощности)
 */

import type { PluginDefinition } from '../../types';

export default {
    type: 'Измеритель мощности',
    id: 'power-meter',
    icon: 'dsp-power-meter',
    description: 'Измеритель мощности (RMS, пиковая, средняя)',
    group: 'visualization',
    signals: { input: 'real', output: null } as const,
    defaultParams: {},
    processor: {
        process(inputs: (Float32Array | null)[], _params: Record<string, unknown>, chunkSize: number) {
            const input = inputs[0];
            if (!input) {
                return { rms: 0, peak: 0, average: 0, dbfs: -Infinity };
            }

            let sumSq = 0;
            let peak = 0;
            let sum = 0;
            for (let i = 0; i < chunkSize; i++) {
                const val = input[i];
                const abs = Math.abs(val);
                sumSq += val * val;
                if (abs > peak) peak = abs;
                sum += abs;
            }

            const rms = Math.sqrt(sumSq / chunkSize);
            const average = sum / chunkSize;
            const dbfs = rms > 0 ? 20 * Math.log10(rms) : -Infinity;

            return { rms, peak, average, dbfs };
        }
    }
} satisfies PluginDefinition;
