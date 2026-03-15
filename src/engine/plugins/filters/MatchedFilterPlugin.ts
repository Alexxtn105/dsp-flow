/**
 * Matched Filter — Согласованный фильтр
 *
 * Назначение:
 *   Согласованный фильтр — оптимальный линейный фильтр для обнаружения сигнала
 *   в белом гауссовом шуме. Импульсная характеристика — зеркально отражённый
 *   и нормализованный шаблон сигнала.
 *
 * Алгоритм:
 *   1. Выбор шаблона (template): прямоугольный, треугольный или синусоидальный импульс
 *   2. Зеркальное отражение: h[n] = template[N-1-n]
 *   3. Нормализация к единичной энергии: h[n] /= √(Σh²)
 *   4. FIR-фильтрация: y[n] = Σ h[k]·x[n-k]
 *
 * Параметры:
 *   - templateType (string) — 'rectangular', 'triangular', 'sinusoidal'
 *   - numTaps (int, 4–256) — длина шаблона
 *
 * Вход:  real
 * Выход: real
 */

import type { PluginDefinition } from '../../types';

interface MatchedFilterState {
    coeffs: Float32Array;
    buffer: Float32Array;
    bufferIdx: number;
    cachedKey: string;
}

function buildTemplate(type: string, N: number): Float32Array {
    const h = new Float32Array(N);

    if (type === 'triangular') {
        const mid = (N - 1) / 2;
        for (let i = 0; i < N; i++) {
            h[i] = 1 - Math.abs(i - mid) / (mid + 1);
        }
    } else if (type === 'sinusoidal') {
        for (let i = 0; i < N; i++) {
            h[i] = Math.sin(Math.PI * i / (N - 1));
        }
    } else {
        // rectangular
        for (let i = 0; i < N; i++) h[i] = 1;
    }

    // Time-reverse (matched filter = time-reversed template)
    for (let i = 0; i < Math.floor(N / 2); i++) {
        const tmp = h[i];
        h[i] = h[N - 1 - i];
        h[N - 1 - i] = tmp;
    }

    // Normalize to unit energy
    let energy = 0;
    for (let i = 0; i < N; i++) energy += h[i] * h[i];
    if (energy > 0) {
        const norm = 1 / Math.sqrt(energy);
        for (let i = 0; i < N; i++) h[i] *= norm;
    }

    return h;
}

const MatchedFilterPlugin = {
    type: 'Согласованный фильтр',
    id: 'matched-filter',
    icon: 'dsp-matched',
    description: 'Согласованный фильтр (Matched Filter)',
    group: 'filters',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        templateType: 'rectangular',
        numTaps: 32,
    },

    processor: {
        states: new Map<string, MatchedFilterState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const input = inputs[0];
            if (!input) return output;

            const templateType = (params.templateType ?? 'rectangular') as string;
            const numTaps = (params.numTaps ?? 32) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    coeffs: new Float32Array(0),
                    buffer: new Float32Array(0),
                    bufferIdx: 0,
                    cachedKey: ''
                });
            }
            const state = this.states.get(nodeId)!;

            const key = `${templateType}_${numTaps}`;
            if (state.cachedKey !== key) {
                state.coeffs = buildTemplate(templateType, numTaps);
                state.buffer = new Float32Array(numTaps);
                state.bufferIdx = 0;
                state.cachedKey = key;
            }

            const coeffs = state.coeffs;
            const N = coeffs.length;
            const buf = state.buffer;

            for (let i = 0; i < chunkSize; i++) {
                buf[state.bufferIdx] = input[i];

                let sum = 0;
                for (let k = 0; k < N; k++) {
                    const idx = (state.bufferIdx - k + N) % N;
                    sum += buf[idx] * coeffs[k];
                }
                output[i] = sum;

                state.bufferIdx = (state.bufferIdx + 1) % N;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default MatchedFilterPlugin;
