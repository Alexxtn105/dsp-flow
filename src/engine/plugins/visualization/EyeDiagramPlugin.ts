/**
 * Eye Diagram — Глазковая диаграмма
 *
 * Назначение:
 *   Строит глазковую диаграмму для анализа межсимвольной интерференции (ISI).
 *   Входной сигнал «складывается» — накладываются друг на друга последовательные
 *   символьные интервалы. Чистый «раскрытый глаз» означает отсутствие ISI.
 *
 * Параметры:
 *   - samplesPerSymbol (int, по умолчанию 10) — отсчётов на символ.
 *
 * Вход:  real (Float32Array)
 * Выход: null (визуализация — глазковая диаграмма)
 */

import type { PluginDefinition } from '../../types';

export default {
    type: 'Глазковая диаграмма',
    id: 'eye-diagram',
    icon: 'dsp-eye-diagram',
    description: 'Глазковая диаграмма (анализ ISI)',
    group: 'visualization',
    signals: { input: 'real', output: null } as const,
    defaultParams: {
        samplesPerSymbol: 10,
    },
    processor: {
        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number) {
            const input = inputs[0];
            const sps = Math.max(2, Math.floor((params.samplesPerSymbol ?? 10) as number));

            if (!input) {
                return { traces: [], samplesPerSymbol: sps };
            }

            // Показываем 2 символьных периода (как в классической глазковой диаграмме)
            const traceLen = sps * 2;
            const traces: Float32Array[] = [];
            const numTraces = Math.floor(chunkSize / sps);

            for (let t = 0; t < numTraces; t++) {
                const start = t * sps;
                if (start + traceLen > chunkSize) break;
                const trace = new Float32Array(traceLen);
                for (let i = 0; i < traceLen; i++) {
                    trace[i] = input[start + i];
                }
                traces.push(trace);
            }

            return { traces, samplesPerSymbol: sps };
        }
    }
} satisfies PluginDefinition;
