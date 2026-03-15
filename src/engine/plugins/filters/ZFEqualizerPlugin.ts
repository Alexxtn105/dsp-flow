/**
 * Zero-Forcing Equalizer — ZF-эквалайзер
 *
 * Назначение:
 *   Компенсирует межсимвольную интерференцию (ISI) путём обращения
 *   частотной характеристики канала. ZF — простейший метод эквализации,
 *   используемый в OFDM-системах и как базовый эквалайзер.
 *
 * Алгоритм:
 *   1. FFT входного блока (complex I/Q)
 *   2. Оценка канала H(f) — усреднение по блокам (или начальная оценка)
 *   3. Обращение: Y_eq(f) = Y(f) · conj(H(f)) / (|H(f)|² + ε)
 *   4. IFFT → выход
 *
 *   ε (regularization) предотвращает усиление шума на частотах
 *   с малым |H(f)|.
 *
 * Параметры:
 *   - regularization (float, 1e-6–0.1) — параметр регуляризации ε
 *   - estimateChannel (boolean) — авто-оценка канала (первый блок = пилот)
 *
 * Вход:  complex
 * Выход: complex
 */

import type { PluginDefinition } from '../../types';
import { fft, ifft } from '../_shared/FFTUtils';

interface ZFEqualizerState {
    channelReal: Float32Array | null;
    channelImag: Float32Array | null;
    fftSize: number;
    initialized: boolean;
}

function nextPow2(n: number): number {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
}

const ZFEqualizerPlugin = {
    type: 'ZF-эквалайзер',
    id: 'zf-equalizer',
    icon: 'dsp-zf-eq',
    description: 'Zero-Forcing эквалайзер',
    group: 'filters',

    signals: {
        input: 'complex',
        output: 'complex'
    } as const,

    defaultParams: {
        regularization: 0.001,
        estimateChannel: true,
    },

    processor: {
        states: new Map<string, ZFEqualizerState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize * 2);
            const input = inputs[0];
            if (!input) return output;

            const eps = (params.regularization ?? 0.001) as number;
            const estimateChannel = (params.estimateChannel ?? true) as boolean;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    channelReal: null,
                    channelImag: null,
                    fftSize: 0,
                    initialized: false
                });
            }
            const state = this.states.get(nodeId)!;

            const N = nextPow2(chunkSize);

            // Deinterleave input into I and Q
            const inReal = new Float32Array(N);
            const inImag = new Float32Array(N);
            for (let i = 0; i < chunkSize; i++) {
                inReal[i] = input[i * 2];
                inImag[i] = input[i * 2 + 1];
            }

            // FFT of input
            fft(inReal, inImag);

            if (estimateChannel && !state.initialized) {
                // Use first block as channel estimate (pilot)
                state.channelReal = new Float32Array(N);
                state.channelImag = new Float32Array(N);
                state.channelReal.set(inReal);
                state.channelImag.set(inImag);
                state.fftSize = N;
                state.initialized = true;

                // First block output = equalized (should be flat)
                for (let i = 0; i < chunkSize; i++) {
                    output[i * 2] = 1;
                    output[i * 2 + 1] = 0;
                }
                return output;
            }

            if (state.channelReal) {
                // ZF equalization: Y_eq = Y · conj(H) / (|H|² + ε)
                const Hr = state.channelReal;
                const Hi = state.channelImag!;
                const Hlen = state.fftSize;

                const outReal = new Float32Array(N);
                const outImag = new Float32Array(N);

                for (let i = 0; i < N; i++) {
                    // Nearest-neighbor mapping when FFT sizes differ
                    const hi = (Hlen === N) ? i : Math.round(i * Hlen / N) % Hlen;
                    const magSq = Hr[hi] * Hr[hi] + Hi[hi] * Hi[hi] + eps;
                    // Y · conj(H) = (Yr + jYi)(Hr - jHi) = (YrHr + YiHi) + j(YiHr - YrHi)
                    outReal[i] = (inReal[i] * Hr[hi] + inImag[i] * Hi[hi]) / magSq;
                    outImag[i] = (inImag[i] * Hr[hi] - inReal[i] * Hi[hi]) / magSq;
                }

                // IFFT
                ifft(outReal, outImag);

                // Interleave to output
                for (let i = 0; i < chunkSize; i++) {
                    output[i * 2] = outReal[i];
                    output[i * 2 + 1] = outImag[i];
                }
            } else {
                // No channel estimate, passthrough
                for (let i = 0; i < chunkSize; i++) {
                    output[i * 2] = input[i * 2];
                    output[i * 2 + 1] = input[i * 2 + 1];
                }
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default ZFEqualizerPlugin;
