/**
 * Peak Detector — Детектор пиков с удержанием
 *
 * Назначение:
 *   Обнаруживает пиковые значения сигнала и удерживает их
 *   в течение заданного времени (hold time). Используется
 *   в измерительных приборах, лимитерах и системах мониторинга.
 *
 * Алгоритм:
 *   1. Envelope follower (attack/release).
 *   2. Если текущий |x| > peak — обновляем peak, сбрасываем holdCounter.
 *   3. holdCounter декрементируется; пока > 0, peak удерживается.
 *   4. По истечении hold time peak следует за огибающей.
 *
 * Параметры:
 *   - attackTime (float, 0.1 мс) — время атаки
 *   - releaseTime (float, 100 мс) — время спада
 *   - holdTime (float, 500 мс) — время удержания пика
 *
 * Вход:  real
 * Выход: real (значение пика)
 */

import type { PluginDefinition } from '../../types';

interface PeakDetectorState {
    peak: number;
    holdCounter: number;
    envelope: number;
}

const PeakDetectorPlugin = {
    type: 'Детектор пиков',
    id: 'peak-detector',
    icon: 'dsp-peak-detect',
    description: 'Детектор пиков с удержанием (hold time)',
    group: 'detectors',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        attackTime: 0.1,
        releaseTime: 100,
        holdTime: 500
    },

    processor: {
        states: new Map<string, PeakDetectorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const attackMs = (params.attackTime ?? 0.1) as number;
            const releaseMs = (params.releaseTime ?? 100) as number;
            const holdMs = (params.holdTime ?? 500) as number;
            const sampleRate = (params.sampleRate ?? 48000) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { peak: 0, holdCounter: 0, envelope: 0 });
            }
            const state = this.states.get(nodeId)!;

            const attackCoeff = attackMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * attackMs * 0.001))
                : 1;
            const releaseCoeff = releaseMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * releaseMs * 0.001))
                : 1;
            const holdSamples = Math.round(sampleRate * holdMs * 0.001);

            const output = new Float32Array(chunkSize);

            for (let i = 0; i < chunkSize; i++) {
                const sample = i < input.length ? Math.abs(input[i]) : 0;

                // Envelope follower
                const coeff = sample > state.envelope ? attackCoeff : releaseCoeff;
                state.envelope += coeff * (sample - state.envelope);

                // Peak detection with hold
                if (sample >= state.peak) {
                    state.peak = sample;
                    state.holdCounter = holdSamples;
                } else if (state.holdCounter > 0) {
                    state.holdCounter--;
                } else {
                    // Release: peak follows envelope
                    state.peak += releaseCoeff * (state.envelope - state.peak);
                }

                output[i] = state.peak;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default PeakDetectorPlugin;
