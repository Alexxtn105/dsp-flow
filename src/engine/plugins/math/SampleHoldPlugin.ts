/**
 * Sample & Hold — Выборка-хранение
 *
 * Назначение:
 *   Эмулирует схему выборки-хранения (S&H). Захватывает значение входного сигнала
 *   с заданным периодом и удерживает его до следующей выборки. Используется для
 *   демонстрации эффектов дискретизации и алиасинга при понижении частоты.
 *
 * Алгоритм:
 *   Внутренний счётчик с периодом holdPeriod отсчётов. При достижении периода
 *   считывается новое значение входа. Между выборками выход фиксирован.
 *
 * Параметры:
 *   - holdPeriod (int, по умолчанию 10) — период выборки в отсчётах.
 *     1 = прямой проход (без эффекта), 10 = выборка каждые 10 отсчётов.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array)
 */

import type { PluginDefinition } from '../../types';

interface SampleHoldState {
    counter: number;
    heldValue: number;
}

export default {
    type: 'Выборка-хранение',
    id: 'sample-hold',
    icon: 'dsp-sample-hold',
    description: 'Выборка-хранение (Sample & Hold)',
    group: 'real-math',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {
        holdPeriod: 10,
    },
    processor: {
        states: new Map<string, SampleHoldState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const input = inputs[0];
            if (!input) return output;

            const holdPeriod = Math.max(1, Math.floor((params.holdPeriod ?? 10) as number));

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { counter: 0, heldValue: 0 });
            }
            const state = this.states.get(nodeId)!;

            for (let i = 0; i < chunkSize; i++) {
                if (state.counter === 0) {
                    state.heldValue = input[i];
                }
                output[i] = state.heldValue;
                state.counter++;
                if (state.counter >= holdPeriod) {
                    state.counter = 0;
                }
            }

            return output;
        }
    }
} satisfies PluginDefinition;
