/**
 * Multipath Channel — Многолучевой канал
 *
 * Назначение:
 *   Моделирует многолучевое распространение сигнала. Каждый луч имеет
 *   свою задержку и коэффициент усиления (затухание).
 *   Используется для моделирования каналов связи с ISI.
 *
 * Алгоритм:
 *   y[n] = Σ g_k · x[n - d_k]    (FIR с разреженными коэффициентами)
 *
 *   Реализация: кольцевой буфер для I и Q компонент, задержки и усиления
 *   задаются как comma-separated строки.
 *
 * Параметры:
 *   - delays (string) — задержки в отсчётах, через запятую (напр. "0,5,12")
 *   - gains (string) — усиления лучей, через запятую (напр. "1.0,0.5,0.3")
 *
 * Вход:  complex
 * Выход: complex
 */

import type { PluginDefinition } from '../../types';

interface MultipathChannelState {
    bufferI: Float32Array;
    bufferQ: Float32Array;
    bufferIdx: number;
    bufferSize: number;
    parsedDelays: number[];
    parsedGains: number[];
    cachedKey: string;
}

function parseNumArray(str: string): number[] {
    return str.split(',')
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));
}

const MultipathChannelPlugin = {
    type: 'Многолучевой канал',
    id: 'multipath-channel',
    icon: 'dsp-multipath',
    description: 'Многолучевой канал с настраиваемыми задержками',
    group: 'channels',

    signals: {
        input: 'complex',
        output: 'complex'
    } as const,

    defaultParams: {
        delays: '0,5,12',
        gains: '1.0,0.5,0.3',
    },

    processor: {
        states: new Map<string, MultipathChannelState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize * 2);
            const input = inputs[0];
            if (!input) return output;

            const delaysStr = (params.delays ?? '0,5,12') as string;
            const gainsStr = (params.gains ?? '1.0,0.5,0.3') as string;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    bufferI: new Float32Array(0),
                    bufferQ: new Float32Array(0),
                    bufferIdx: 0,
                    bufferSize: 0,
                    parsedDelays: [],
                    parsedGains: [],
                    cachedKey: ''
                });
            }
            const state = this.states.get(nodeId)!;

            const key = `${delaysStr}|${gainsStr}`;
            if (state.cachedKey !== key) {
                state.parsedDelays = parseNumArray(delaysStr).map(d => Math.max(0, Math.round(d)));
                state.parsedGains = parseNumArray(gainsStr);

                // Ensure same length
                const len = Math.min(state.parsedDelays.length, state.parsedGains.length);
                state.parsedDelays = state.parsedDelays.slice(0, len);
                state.parsedGains = state.parsedGains.slice(0, len);

                const maxDelay = state.parsedDelays.reduce((a, b) => Math.max(a, b), 0);
                state.bufferSize = maxDelay + 1;
                state.bufferI = new Float32Array(state.bufferSize);
                state.bufferQ = new Float32Array(state.bufferSize);
                state.bufferIdx = 0;
                state.cachedKey = key;
            }

            const delays = state.parsedDelays;
            const gains = state.parsedGains;
            const numPaths = delays.length;
            const bufSize = state.bufferSize;
            const bufI = state.bufferI;
            const bufQ = state.bufferQ;

            if (numPaths === 0 || bufSize === 0) {
                // Passthrough
                for (let i = 0; i < chunkSize; i++) {
                    output[i * 2] = input[i * 2];
                    output[i * 2 + 1] = input[i * 2 + 1];
                }
                return output;
            }

            for (let i = 0; i < chunkSize; i++) {
                bufI[state.bufferIdx] = input[i * 2];
                bufQ[state.bufferIdx] = input[i * 2 + 1];

                let sumI = 0, sumQ = 0;
                for (let p = 0; p < numPaths; p++) {
                    const idx = (state.bufferIdx - delays[p] + bufSize) % bufSize;
                    sumI += gains[p] * bufI[idx];
                    sumQ += gains[p] * bufQ[idx];
                }

                output[i * 2] = sumI;
                output[i * 2 + 1] = sumQ;
                state.bufferIdx = (state.bufferIdx + 1) % bufSize;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default MultipathChannelPlugin;
