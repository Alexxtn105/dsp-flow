/**
 * Sawtooth Wave — Генератор пилообразных колебаний
 *
 * Назначение:
 *   Генерирует пилообразный сигнал (нарастающая или спадающая пила).
 *   Содержит все гармоники (чётные и нечётные) с амплитудами 1/n,
 *   что делает его полезным для субтрактивного синтеза и тестирования фильтров.
 *
 * Алгоритм:
 *   Фазовый аккумулятор (фаза в [0, 1)). При direction='rising' выход
 *   линейно растёт от −amplitude до +amplitude, при 'falling' — убывает.
 *
 * Параметры:
 *   - frequency (float, по умолчанию 1000) — частота в Гц.
 *   - amplitude (float, по умолчанию 1.0) — амплитуда.
 *   - direction (string, по умолчанию 'rising') — 'rising' или 'falling'.
 *
 * Вход:  нет
 * Выход: real (Float32Array)
 */

import type { PluginDefinition } from '../../types';

interface SawtoothWaveState {
    currentPhase: number;
}

export default {
    type: 'Генератор пилообразных колебаний',
    id: 'sawtooth-wave',
    icon: 'dsp-sawtooth-wave',
    description: 'Пилообразный сигнал (нарастающая/спадающая пила)',
    group: 'generators',
    signals: { input: null, output: 'real' } as const,
    defaultParams: {
        frequency: 1000,
        amplitude: 1.0,
        direction: 'rising',
    },
    processor: {
        states: new Map<string, SawtoothWaveState>(),
        clearStates() { this.states.clear(); },

        process(_inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const frequency = (params.frequency ?? 1000) as number;
            const amplitude = (params.amplitude ?? 1.0) as number;
            const direction = (params.direction ?? 'rising') as string;
            const sampleRate = (params.sampleRate ?? 48000) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentPhase: 0 });
            }
            const state = this.states.get(nodeId)!;

            const phaseIncrement = frequency / sampleRate;
            const falling = direction === 'falling';

            for (let i = 0; i < chunkSize; i++) {
                // Rising: -1 → +1 linearly over one period
                const value = 2.0 * state.currentPhase - 1.0;
                output[i] = amplitude * (falling ? -value : value);

                state.currentPhase += phaseIncrement;
                if (state.currentPhase >= 1.0) {
                    state.currentPhase -= 1.0;
                }
            }

            return output;
        }
    }
} satisfies PluginDefinition;
