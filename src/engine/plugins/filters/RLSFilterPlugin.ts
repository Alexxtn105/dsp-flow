/**
 * RLS Adaptive Filter — Адаптивный фильтр на основе RLS алгоритма
 *
 * Назначение:
 *   RLS (Recursive Least Squares) — адаптивный фильтр с экспоненциальным взвешиванием.
 *   Быстрее сходится, чем LMS, но требует больше вычислений (O(N²) vs O(N)).
 *
 * Алгоритм:
 *   k[n] = P[n-1]·x[n] / (λ + xᵀ[n]·P[n-1]·x[n])
 *   e[n] = d[n] - wᵀ[n-1]·x[n]
 *   w[n] = w[n-1] + k[n]·e[n]
 *   P[n] = (P[n-1] - k[n]·xᵀ[n]·P[n-1]) / λ
 *
 * Параметры:
 *   - numTaps (int, 4–64) — длина фильтра (ограничена из-за P-матрицы N×N)
 *   - forgettingFactor (float, 0.9–1.0) — фактор забывания λ
 *
 * Вход:  2× real (сигнал + desired)
 * Выход: real (сигнал ошибки)
 */

import type { PluginDefinition } from '../../types';

interface RLSFilterState {
    weights: Float32Array;
    P: Float32Array;       // N×N correlation inverse matrix (flat)
    buffer: Float32Array;
    bufferIdx: number;
    cachedTaps: number;
}

const RLSFilterPlugin = {
    type: 'RLS-фильтр',
    id: 'rls-filter',
    icon: 'dsp-rls',
    description: 'Адаптивный фильтр RLS',
    group: 'filters',

    signals: {
        input: 'real',
        output: 'real',
        inputsCount: 2
    } as const,

    defaultParams: {
        numTaps: 16,
        forgettingFactor: 0.99,
    },

    processor: {
        states: new Map<string, RLSFilterState>(),

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

            const numTaps = Math.min((params.numTaps ?? 16) as number, 64);
            const lambda = (params.forgettingFactor ?? 0.99) as number;

            if (!this.states.has(nodeId)) {
                const P = new Float32Array(numTaps * numTaps);
                // Initialize P = δ·I, δ = 100
                for (let i = 0; i < numTaps; i++) P[i * numTaps + i] = 100;

                this.states.set(nodeId, {
                    weights: new Float32Array(numTaps),
                    P,
                    buffer: new Float32Array(numTaps),
                    bufferIdx: 0,
                    cachedTaps: numTaps
                });
            }
            const state = this.states.get(nodeId)!;

            if (state.cachedTaps !== numTaps) {
                const P = new Float32Array(numTaps * numTaps);
                for (let i = 0; i < numTaps; i++) P[i * numTaps + i] = 100;
                state.weights = new Float32Array(numTaps);
                state.P = P;
                state.buffer = new Float32Array(numTaps);
                state.bufferIdx = 0;
                state.cachedTaps = numTaps;
            }

            const w = state.weights;
            const P = state.P;
            const buf = state.buffer;
            const N = numTaps;
            const invLambda = 1 / lambda;

            // Temporary arrays
            const x = new Float32Array(N);
            const Px = new Float32Array(N);
            const k = new Float32Array(N);

            for (let i = 0; i < chunkSize; i++) {
                buf[state.bufferIdx] = signal[i];

                // Build x vector from circular buffer
                for (let j = 0; j < N; j++) {
                    x[j] = buf[(state.bufferIdx - j + N) % N];
                }

                // Px = P·x
                for (let r = 0; r < N; r++) {
                    let sum = 0;
                    for (let c = 0; c < N; c++) {
                        sum += P[r * N + c] * x[c];
                    }
                    Px[r] = sum;
                }

                // denominator = λ + xᵀ·Px
                let denom = lambda;
                for (let j = 0; j < N; j++) denom += x[j] * Px[j];

                // k = Px / denom
                const invDenom = 1 / denom;
                for (let j = 0; j < N; j++) k[j] = Px[j] * invDenom;

                // Error: e = d - wᵀx
                let y = 0;
                for (let j = 0; j < N; j++) y += w[j] * x[j];
                const e = desired[i] - y;
                output[i] = e;

                // Update weights: w = w + k·e
                for (let j = 0; j < N; j++) w[j] += k[j] * e;

                // Update P: P = (P - k·xᵀ·P) / λ
                // First compute kxᵀP = outer(k, Px)·invLambda applied to P
                for (let r = 0; r < N; r++) {
                    for (let c = 0; c < N; c++) {
                        P[r * N + c] = (P[r * N + c] - k[r] * Px[c]) * invLambda;
                    }
                }

                state.bufferIdx = (state.bufferIdx + 1) % N;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default RLSFilterPlugin;
