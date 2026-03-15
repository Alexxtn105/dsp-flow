/**
 * Impulse — Генератор импульсов (дельта-функция)
 *
 * Назначение:
 *   Генерирует единичный импульс (δ[n]) или периодическую последовательность импульсов.
 *   Используется для получения импульсной характеристики фильтров: подав импульс
 *   на вход фильтра, на выходе получаем его импульсную характеристику h[n].
 *
 * Алгоритм:
 *   Счётчик отсчётов. При period=0 — одиночный импульс на первом отсчёте.
 *   При period>0 — импульс каждые period отсчётов.
 *
 * Параметры:
 *   - period (int, по умолчанию 0) — период повторения в отсчётах. 0 = одиночный импульс.
 *   - amplitude (float, по умолчанию 1.0) — амплитуда импульса.
 *
 * Вход:  нет
 * Выход: real (Float32Array)
 */

import type { PluginDefinition } from '../../types';

interface ImpulseState {
    counter: number;
    fired: boolean;
}

export default {
    type: 'Импульс',
    id: 'impulse',
    icon: 'dsp-impulse',
    description: 'Единичный импульс или периодическая последовательность',
    group: 'generators',
    signals: { input: null, output: 'real' } as const,
    defaultParams: {
        period: 0,
        amplitude: 1.0,
    },
    processor: {
        states: new Map<string, ImpulseState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const period = Math.floor((params.period ?? 0) as number);
            const amplitude = (params.amplitude ?? 1.0) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { counter: 0, fired: false });
            }
            const state = this.states.get(nodeId)!;

            for (let i = 0; i < chunkSize; i++) {
                if (period === 0) {
                    // Одиночный импульс на первом отсчёте
                    if (!state.fired) {
                        output[i] = amplitude;
                        state.fired = true;
                    }
                } else {
                    // Периодическая последовательность
                    if (state.counter === 0) {
                        output[i] = amplitude;
                    }
                    state.counter++;
                    if (state.counter >= period) {
                        state.counter = 0;
                    }
                }
            }

            return output;
        }
    }
} satisfies PluginDefinition;
