/**
 * Pulse Shaper — Формирователь импульсов (RRC/RC/Gaussian)
 *
 * Назначение:
 *   Формирует импульсы для ограничения полосы цифрового сигнала.
 *   RRC (Root Raised Cosine) — стандарт для систем связи (DVB, LTE, 5G).
 *   При каскаде двух RRC-фильтров (Tx + Rx) получается RC (Raised Cosine),
 *   обеспечивающий нулевую межсимвольную интерференцию (ISI).
 *
 * Алгоритм:
 *   1. При изменении параметров пересчитываются коэффициенты фильтра.
 *   2. FIR-свёртка отдельно для I и Q каналов.
 *   3. Коэффициенты кешируются в состоянии.
 *
 * Типы фильтров:
 *   - RRC: h[n] = sin(π·n/T·(1-α)) + 4α·n/T·cos(π·n/T·(1+α))
 *          / (π·n/T·(1-(4α·n/T)²))
 *   - RC: h[n] = sinc(n/T) · cos(πα·n/T) / (1-(2α·n/T)²)
 *   - Gaussian: h[n] = √(2π/ln2) · BT · exp(-2(πBT)²n²/ln2)
 *
 * Параметры:
 *   - pulseType (string) — 'rrc', 'rc', 'gaussian'
 *   - rolloffFactor (float, 0.1–1.0) — коэффициент сглаживания α (для RRC/RC)
 *   - samplesPerSymbol (int, 2–32) — отсчётов на символ
 *   - numTaps (int, 8–128) — длина фильтра
 *
 * Вход:  complex
 * Выход: complex
 */

import type { PluginDefinition } from '../../types';

interface PulseShaperState {
    coeffs: Float32Array;
    bufferI: Float32Array;
    bufferQ: Float32Array;
    bufferIdx: number;
    cachedKey: string;
}

function designRRC(numTaps: number, sps: number, alpha: number): Float32Array {
    const coeffs = new Float32Array(numTaps);
    const half = (numTaps - 1) / 2;
    let energy = 0;

    for (let i = 0; i < numTaps; i++) {
        const t = (i - half) / sps;
        if (Math.abs(t) < 1e-10) {
            coeffs[i] = 1 - alpha + 4 * alpha / Math.PI;
        } else if (Math.abs(Math.abs(4 * alpha * t) - 1) < 1e-10) {
            coeffs[i] = (alpha / Math.SQRT2) * (
                (1 + 2 / Math.PI) * Math.sin(Math.PI / (4 * alpha)) +
                (1 - 2 / Math.PI) * Math.cos(Math.PI / (4 * alpha))
            );
        } else {
            const pt = Math.PI * t;
            const num = Math.sin(pt * (1 - alpha)) + 4 * alpha * t * Math.cos(pt * (1 + alpha));
            const den = pt * (1 - (4 * alpha * t) * (4 * alpha * t));
            coeffs[i] = num / den;
        }
        energy += coeffs[i] * coeffs[i];
    }
    // Normalize to unit energy
    const norm = 1 / Math.sqrt(energy);
    for (let i = 0; i < numTaps; i++) coeffs[i] *= norm;
    return coeffs;
}

function designRC(numTaps: number, sps: number, alpha: number): Float32Array {
    const coeffs = new Float32Array(numTaps);
    const half = (numTaps - 1) / 2;
    let energy = 0;

    for (let i = 0; i < numTaps; i++) {
        const t = (i - half) / sps;
        if (Math.abs(t) < 1e-10) {
            coeffs[i] = 1;
        } else {
            const denom2 = 1 - (2 * alpha * t) * (2 * alpha * t);
            const sinc = Math.sin(Math.PI * t) / (Math.PI * t);
            if (Math.abs(denom2) < 1e-10) {
                coeffs[i] = (Math.PI / 4) * sinc;
            } else {
                coeffs[i] = sinc * Math.cos(Math.PI * alpha * t) / denom2;
            }
        }
        energy += coeffs[i] * coeffs[i];
    }
    const norm = 1 / Math.sqrt(energy);
    for (let i = 0; i < numTaps; i++) coeffs[i] *= norm;
    return coeffs;
}

function designGaussian(numTaps: number, sps: number, bt: number): Float32Array {
    const coeffs = new Float32Array(numTaps);
    const half = (numTaps - 1) / 2;
    const a = Math.PI * bt / Math.sqrt(Math.log(2));
    let energy = 0;

    for (let i = 0; i < numTaps; i++) {
        const t = (i - half) / sps;
        coeffs[i] = Math.exp(-a * a * t * t * 2);
        energy += coeffs[i] * coeffs[i];
    }
    const norm = 1 / Math.sqrt(energy);
    for (let i = 0; i < numTaps; i++) coeffs[i] *= norm;
    return coeffs;
}

const PulseShaperPlugin = {
    type: 'Формирователь импульсов',
    id: 'pulse-shaper',
    icon: 'dsp-pulse-shaper',
    description: 'RRC/RC/Gaussian формирование импульсов',
    group: 'filters',

    signals: {
        input: 'complex',
        output: 'complex'
    } as const,

    defaultParams: {
        pulseType: 'rrc',
        rolloffFactor: 0.35,
        samplesPerSymbol: 4,
        numTaps: 33,
    },

    processor: {
        states: new Map<string, PulseShaperState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize * 2);
            const input = inputs[0];
            if (!input) return output;

            const pulseType = (params.pulseType ?? 'rrc') as string;
            const alpha = (params.rolloffFactor ?? 0.35) as number;
            const sps = (params.samplesPerSymbol ?? 4) as number;
            const numTaps = (params.numTaps ?? 33) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    coeffs: new Float32Array(0),
                    bufferI: new Float32Array(0),
                    bufferQ: new Float32Array(0),
                    bufferIdx: 0,
                    cachedKey: ''
                });
            }
            const state = this.states.get(nodeId)!;

            const key = `${pulseType}_${alpha}_${sps}_${numTaps}`;
            if (state.cachedKey !== key) {
                if (pulseType === 'rc') {
                    state.coeffs = designRC(numTaps, sps, alpha);
                } else if (pulseType === 'gaussian') {
                    state.coeffs = designGaussian(numTaps, sps, alpha);
                } else {
                    state.coeffs = designRRC(numTaps, sps, alpha);
                }
                state.bufferI = new Float32Array(numTaps);
                state.bufferQ = new Float32Array(numTaps);
                state.bufferIdx = 0;
                state.cachedKey = key;
            }

            const coeffs = state.coeffs;
            const N = coeffs.length;
            const bufI = state.bufferI;
            const bufQ = state.bufferQ;

            for (let i = 0; i < chunkSize; i++) {
                // Push new sample into circular buffer
                bufI[state.bufferIdx] = input[i * 2];
                bufQ[state.bufferIdx] = input[i * 2 + 1];

                // FIR convolution
                let sumI = 0, sumQ = 0;
                for (let k = 0; k < N; k++) {
                    const idx = (state.bufferIdx - k + N) % N;
                    sumI += bufI[idx] * coeffs[k];
                    sumQ += bufQ[idx] * coeffs[k];
                }

                output[i * 2] = sumI;
                output[i * 2 + 1] = sumQ;
                state.bufferIdx = (state.bufferIdx + 1) % N;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default PulseShaperPlugin;
