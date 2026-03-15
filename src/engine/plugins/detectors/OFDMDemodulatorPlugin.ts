/**
 * OFDM Demodulator — Демодулятор OFDM
 *
 * Назначение:
 *   Принимает OFDM-сигнал: удаление циклического префикса → FFT → извлечение поднесущих.
 *   Выход — комплексные QAM-символы с каждой поднесущей.
 *
 * Алгоритм:
 *   1. Накопление входных отсчётов до полного OFDM-символа (numSC + cpLen).
 *   2. Удаление CP (первые cpLen отсчётов).
 *   3. FFT оставшихся numSC отсчётов.
 *   4. Выход — комплексные значения поднесущих (1-tap ZF если включена оценка канала).
 *
 * Параметры:
 *   - numSubcarriers (int, 64/128/256)
 *   - cpLength (int, по умолчанию 16)
 *
 * Вход:  complex
 * Выход: complex
 */

import type { PluginDefinition } from '../../types';
import { fft } from '../_shared/FFTUtils';

interface OFDMDemodulatorState {
    inputBuffer: Float32Array;
    inputPos: number;
    outputBuffer: Float32Array;
    outputPos: number;
}

const OFDMDemodulatorPlugin = {
    type: 'OFDM демодулятор',
    id: 'ofdm-demodulator',
    icon: 'dsp-ofdm-demod',
    description: 'Демодулятор OFDM (remove CP → FFT → subcarriers)',
    group: 'detectors',

    signals: {
        input: 'complex',
        output: 'complex'
    } as const,

    defaultParams: {
        numSubcarriers: 64,
        cpLength: 16
    },

    processor: {
        states: new Map<string, OFDMDemodulatorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize * 2);
            const input = inputs[0];
            if (!input) return output;

            const numSC = (params.numSubcarriers ?? 64) as number;
            const cpLen = Math.max(0, Math.min(numSC / 2, (params.cpLength ?? 16) as number));
            const symbolLen = numSC + cpLen;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    inputBuffer: new Float32Array(symbolLen * 2),
                    inputPos: 0,
                    outputBuffer: new Float32Array(0),
                    outputPos: 0
                });
            }
            const state = this.states.get(nodeId)!;

            // Resize input buffer if params changed
            if (state.inputBuffer.length !== symbolLen * 2) {
                state.inputBuffer = new Float32Array(symbolLen * 2);
                state.inputPos = 0;
            }

            let outIdx = 0;

            // First, output any remaining from previous symbol
            while (outIdx < chunkSize && state.outputPos < state.outputBuffer.length / 2) {
                output[outIdx * 2] = state.outputBuffer[state.outputPos * 2];
                output[outIdx * 2 + 1] = state.outputBuffer[state.outputPos * 2 + 1];
                state.outputPos++;
                outIdx++;
            }

            // Process input samples
            for (let i = 0; i < chunkSize; i++) {
                if (i < input.length / 2) {
                    state.inputBuffer[state.inputPos * 2] = input[i * 2];
                    state.inputBuffer[state.inputPos * 2 + 1] = input[i * 2 + 1];
                    state.inputPos++;
                }

                if (state.inputPos >= symbolLen) {
                    // Full OFDM symbol received — remove CP and FFT
                    const real = new Float32Array(numSC);
                    const imag = new Float32Array(numSC);

                    for (let k = 0; k < numSC; k++) {
                        real[k] = state.inputBuffer[(cpLen + k) * 2];
                        imag[k] = state.inputBuffer[(cpLen + k) * 2 + 1];
                    }

                    fft(real, imag);

                    // No 1/N scaling: modulator's IFFT already includes 1/N,
                    // so FFT here recovers the original subcarrier values
                    state.outputBuffer = new Float32Array(numSC * 2);
                    for (let k = 0; k < numSC; k++) {
                        state.outputBuffer[k * 2] = real[k];
                        state.outputBuffer[k * 2 + 1] = imag[k];
                    }
                    state.outputPos = 0;
                    state.inputPos = 0;

                    // Copy to output
                    while (outIdx < chunkSize && state.outputPos < numSC) {
                        output[outIdx * 2] = state.outputBuffer[state.outputPos * 2];
                        output[outIdx * 2 + 1] = state.outputBuffer[state.outputPos * 2 + 1];
                        state.outputPos++;
                        outIdx++;
                    }
                }
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default OFDMDemodulatorPlugin;
