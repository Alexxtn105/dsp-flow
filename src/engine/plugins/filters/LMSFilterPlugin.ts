/**
 * LMS/NLMS Adaptive Filter — Адаптивный фильтр на основе LMS/NLMS алгоритма
 *
 * Назначение:
 *   Адаптивная фильтрация для подавления шумов, эхо-компенсации, системной идентификации.
 *   LMS (Least Mean Squares) — наиболее распространённый адаптивный алгоритм благодаря
 *   простоте и устойчивости.
 *
 * Алгоритм:
 *   LMS:  w[n+1] = w[n] + 2·μ·e[n]·x[n]
 *   NLMS: w[n+1] = w[n] + (μ / (||x[n]||² + ε)) · e[n] · x[n]
 *
 *   где e[n] = d[n] - w[n]ᵀ·x[n] (ошибка: desired - output)
 *   Вход 1 (top): сигнал x[n]
 *   Вход 2 (bottom): желаемый отклик d[n]
 *   Выход: e[n] (сигнал ошибки)
 *
 * Параметры:
 *   - adaptiveAlgorithm (string) — 'lms' или 'nlms'
 *   - numTaps (int, 4–256) — длина фильтра
 *   - stepSize (float, 0.0001–1.0) — шаг адаптации μ
 *
 * Вход:  2× real (сигнал + desired)
 * Выход: real (сигнал ошибки)
 */

import type { PluginDefinition } from '../../types';

interface LMSFilterState {
    weights: Float32Array;
    buffer: Float32Array;
    bufferIdx: number;
    cachedTaps: number;
}

const LMSFilterPlugin = {
    type: 'LMS-фильтр',
    id: 'lms-filter',
    icon: 'dsp-lms',
    description: 'Адаптивный фильтр LMS/NLMS',
    group: 'filters',

    signals: {
        input: 'real',
        output: 'real',
        inputsCount: 2
    } as const,

    defaultParams: {
        adaptiveAlgorithm: 'lms',
        numTaps: 32,
        stepSize: 0.01,
    },

    processor: {
        states: new Map<string, LMSFilterState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const signal = inputs[0];
            const desired = inputs[1];
            if (!signal) return output;
            if (!desired) {
                output.set(signal.subarray(0, chunkSize));
                return output;
            }

            const algorithm = (params.adaptiveAlgorithm ?? 'lms') as string;
            const numTaps = (params.numTaps ?? 32) as number;
            const mu = (params.stepSize ?? 0.01) as number;
            const isNLMS = algorithm === 'nlms';
            const eps = 1e-8;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    weights: new Float32Array(numTaps),
                    buffer: new Float32Array(numTaps),
                    bufferIdx: 0,
                    cachedTaps: numTaps
                });
            }
            const state = this.states.get(nodeId)!;

            // Reset if taps changed
            if (state.cachedTaps !== numTaps) {
                state.weights = new Float32Array(numTaps);
                state.buffer = new Float32Array(numTaps);
                state.bufferIdx = 0;
                state.cachedTaps = numTaps;
            }

            const w = state.weights;
            const buf = state.buffer;
            const N = numTaps;

            for (let i = 0; i < chunkSize; i++) {
                // Insert new sample
                buf[state.bufferIdx] = signal[i];

                // Compute filter output y = wᵀx
                let y = 0;
                let normSq = 0;
                for (let k = 0; k < N; k++) {
                    const idx = (state.bufferIdx - k + N) % N;
                    const xk = buf[idx];
                    y += w[k] * xk;
                    if (isNLMS) normSq += xk * xk;
                }

                // Error
                const e = desired[i] - y;
                output[i] = e;

                // Update weights
                const stepMu = isNLMS ? mu / (normSq + eps) : 2 * mu;
                for (let k = 0; k < N; k++) {
                    const idx = (state.bufferIdx - k + N) % N;
                    w[k] += stepMu * e * buf[idx];
                }

                state.bufferIdx = (state.bufferIdx + 1) % N;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default LMSFilterPlugin;
