/**
 * FSK Demodulator — Демодулятор частотной манипуляции
 *
 * Назначение:
 *   Некогерентный приём FSK: два полосовых фильтра (Goertzel) на f0 и f1,
 *   сравнение огибающих для определения переданного символа.
 *
 * Алгоритм:
 *   1. Два квадратурных детектора на частотах f0 = -deviation и f1 = +deviation.
 *   2. Огибающая каждого вычисляется через экспоненциальное сглаживание |I² + Q²|.
 *   3. Выход: +1 если огибающая f1 > f0, иначе -1. Для 4FSK — аналогично.
 *
 * Параметры:
 *   - deviation (float, 500) — частотная девиация (Гц)
 *   - symbolRate (float, 1000) — символьная скорость для сглаживания
 *
 * Вход:  complex
 * Выход: real (демодулированные символы ±1)
 */

import type { PluginDefinition } from '../../types';

interface FSKDemodulatorState {
    env0: number;
    env1: number;
    phase0: number;
    phase1: number;
}

const FSKDemodulatorPlugin = {
    type: 'FSK демодулятор',
    id: 'fsk-demodulator',
    icon: 'dsp-fsk-demod',
    description: 'Некогерентный демодулятор BFSK/4FSK',
    group: 'detectors',

    signals: {
        input: 'complex',
        output: 'real'
    } as const,

    defaultParams: {
        deviation: 500,
        symbolRate: 1000
    },

    processor: {
        states: new Map<string, FSKDemodulatorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const input = inputs[0];
            if (!input) return output;

            const sampleRate = (params.sampleRate ?? 48000) as number;
            const deviation = (params.deviation ?? 500) as number;
            const symbolRate = (params.symbolRate ?? 1000) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    env0: 0,
                    env1: 0,
                    phase0: 0,
                    phase1: 0
                });
            }
            const state = this.states.get(nodeId)!;

            // f0 = -deviation, f1 = +deviation
            const omega0 = -2 * Math.PI * deviation / sampleRate;
            const omega1 = 2 * Math.PI * deviation / sampleRate;

            // Envelope smoothing coefficient
            const alpha = 1 - Math.exp(-2 * Math.PI * symbolRate / sampleRate);

            for (let i = 0; i < chunkSize; i++) {
                const inI = i < input.length / 2 ? input[i * 2] : 0;
                const inQ = i < input.length / 2 ? input[i * 2 + 1] : 0;

                // Mix down to f0
                state.phase0 += omega0;
                if (state.phase0 > Math.PI) state.phase0 -= 2 * Math.PI;
                else if (state.phase0 < -Math.PI) state.phase0 += 2 * Math.PI;
                const mix0I = inI * Math.cos(state.phase0) - inQ * Math.sin(state.phase0);
                const mix0Q = inI * Math.sin(state.phase0) + inQ * Math.cos(state.phase0);

                // Mix down to f1
                state.phase1 += omega1;
                if (state.phase1 > Math.PI) state.phase1 -= 2 * Math.PI;
                else if (state.phase1 < -Math.PI) state.phase1 += 2 * Math.PI;
                const mix1I = inI * Math.cos(state.phase1) - inQ * Math.sin(state.phase1);
                const mix1Q = inI * Math.sin(state.phase1) + inQ * Math.cos(state.phase1);

                // Envelope detection
                const pow0 = mix0I * mix0I + mix0Q * mix0Q;
                const pow1 = mix1I * mix1I + mix1Q * mix1Q;

                state.env0 += alpha * (pow0 - state.env0);
                state.env1 += alpha * (pow1 - state.env1);

                // Decision
                output[i] = state.env1 > state.env0 ? 1 : -1;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default FSKDemodulatorPlugin;
