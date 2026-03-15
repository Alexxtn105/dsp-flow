/**
 * Reverb — Ревербератор Шрёдера
 *
 * Назначение:
 *   Имитирует отражения звука в помещении.
 *   Структура: 4 параллельных comb-фильтра → сумматор → 2 последовательных allpass.
 *
 * Алгоритм:
 *   Comb filter: y[n] = x[n-d] + feedback * y[n-d]
 *   Allpass:     y[n] = -g*x[n] + x[n-d] + g*y[n-d]
 *   Параметр roomSize масштабирует задержки, damping задаёт потери в comb.
 *
 * Параметры:
 *   - roomSize (float, 0.0–1.0, по умолчанию 0.5) — размер помещения
 *   - damping (float, 0.0–1.0, по умолчанию 0.5) — демпфирование (потери ВЧ)
 *   - mix (float, 0.0–1.0, по умолчанию 0.3) — баланс dry/wet
 *
 * Вход:  real
 * Выход: real
 */

import type { PluginDefinition } from '../../types';

// Base delays for comb and allpass filters (in samples at 48kHz)
const COMB_DELAYS = [1557, 1617, 1491, 1422];
const ALLPASS_DELAYS = [225, 556];
const ALLPASS_GAIN = 0.5;

interface ReverbState {
    combBuffers: Float32Array[];
    combPositions: number[];
    combFilters: number[]; // damping filter state
    allpassBuffers: Float32Array[];
    allpassPositions: number[];
    cachedRoomSize: number;
}

function createBuffers(roomSize: number, sampleRate: number): {
    combBuffers: Float32Array[];
    allpassBuffers: Float32Array[];
} {
    const scale = sampleRate / 48000;
    const combBuffers = COMB_DELAYS.map(d =>
        new Float32Array(Math.max(1, Math.round(d * scale * (0.5 + roomSize * 0.5))))
    );
    const allpassBuffers = ALLPASS_DELAYS.map(d =>
        new Float32Array(Math.max(1, Math.round(d * scale)))
    );
    return { combBuffers, allpassBuffers };
}

const ReverbPlugin = {
    type: 'Ревербератор',
    id: 'reverb',
    icon: 'dsp-reverb',
    description: 'Ревербератор Шрёдера (4 comb + 2 allpass)',
    group: 'audio',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        roomSize: 0.5,
        damping: 0.5,
        mix: 0.3
    },

    processor: {
        states: new Map<string, ReverbState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const roomSize = Math.max(0, Math.min(1, (params.roomSize ?? 0.5) as number));
            const damping = Math.max(0, Math.min(1, (params.damping ?? 0.5) as number));
            const mix = Math.max(0, Math.min(1, (params.mix ?? 0.3) as number));
            const sampleRate = (params.sampleRate ?? 48000) as number;

            if (!this.states.has(nodeId)) {
                const { combBuffers, allpassBuffers } = createBuffers(roomSize, sampleRate);
                this.states.set(nodeId, {
                    combBuffers,
                    combPositions: new Array(4).fill(0),
                    combFilters: new Array(4).fill(0),
                    allpassBuffers,
                    allpassPositions: new Array(2).fill(0),
                    cachedRoomSize: roomSize
                });
            }
            const state = this.states.get(nodeId)!;

            // Recreate buffers if roomSize changed significantly
            if (Math.abs(state.cachedRoomSize - roomSize) > 0.01) {
                const { combBuffers, allpassBuffers } = createBuffers(roomSize, sampleRate);
                state.combBuffers = combBuffers;
                state.combPositions = new Array(4).fill(0);
                state.combFilters = new Array(4).fill(0);
                state.allpassBuffers = allpassBuffers;
                state.allpassPositions = new Array(2).fill(0);
                state.cachedRoomSize = roomSize;
            }

            const feedback = 0.7 + roomSize * 0.28; // 0.7 .. 0.98
            const output = new Float32Array(chunkSize);

            for (let i = 0; i < chunkSize; i++) {
                const dry = i < input.length ? input[i] : 0;
                let wet = 0;

                // 4 parallel comb filters
                for (let c = 0; c < 4; c++) {
                    const buf = state.combBuffers[c];
                    const pos = state.combPositions[c];
                    const delayed = buf[pos];

                    // Damping (lowpass in feedback loop)
                    state.combFilters[c] = delayed * (1 - damping) + state.combFilters[c] * damping;

                    buf[pos] = dry + feedback * state.combFilters[c];
                    state.combPositions[c] = (pos + 1) % buf.length;

                    wet += delayed;
                }

                wet *= 0.25; // average of 4 combs

                // 2 serial allpass filters: y = -g*x + buf[n-d], buf[n] = x + g*buf[n-d]
                for (let a = 0; a < 2; a++) {
                    const buf = state.allpassBuffers[a];
                    const pos = state.allpassPositions[a];
                    const delayed = buf[pos];

                    const apOut = -ALLPASS_GAIN * wet + delayed;
                    buf[pos] = wet + ALLPASS_GAIN * delayed;
                    wet = apOut;
                    state.allpassPositions[a] = (pos + 1) % buf.length;
                }

                output[i] = dry * (1 - mix) + wet * mix;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default ReverbPlugin;
