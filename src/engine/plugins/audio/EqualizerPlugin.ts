/**
 * Equalizer — 3-полосный параметрический эквалайзер
 *
 * Назначение:
 *   Регулирует АЧХ сигнала в трёх частотных полосах (low/mid/high).
 *   Каждая полоса реализована как biquad peaking EQ по формулам Audio EQ Cookbook.
 *
 * Алгоритм:
 *   Три каскадных biquad-секции (Direct Form II Transposed).
 *   Коэффициенты пересчитываются при изменении параметров.
 *
 * Параметры:
 *   - lowFreq (float, 200) — центральная частота низкой полосы (Гц)
 *   - lowGain (float, 0) — усиление низкой полосы (дБ)
 *   - lowQ (float, 0.7) — добротность низкой полосы
 *   - midFreq (float, 1000) — центральная частота средней полосы
 *   - midGain (float, 0) — усиление средней полосы (дБ)
 *   - midQ (float, 0.7) — добротность средней полосы
 *   - highFreq (float, 5000) — центральная частота высокой полосы
 *   - highGain (float, 0) — усиление высокой полосы (дБ)
 *   - highQ (float, 0.7) — добротность высокой полосы
 *
 * Вход:  real
 * Выход: real
 */

import type { PluginDefinition } from '../../types';

interface BiquadState {
    z1: number;
    z2: number;
}

interface EqualizerState {
    bands: BiquadState[];
    cachedKey: string;
    coeffs: number[][]; // [b0, b1, b2, a1, a2] per band
}

/** Compute peaking EQ biquad coefficients (Audio EQ Cookbook) */
function peakingEQ(freq: number, gainDb: number, Q: number, sampleRate: number): number[] {
    const A = Math.pow(10, gainDb / 40);
    const w0 = 2 * Math.PI * freq / sampleRate;
    const sinW = Math.sin(w0);
    const cosW = Math.cos(w0);
    const alpha = sinW / (2 * Q);

    const b0 = 1 + alpha * A;
    const b1 = -2 * cosW;
    const b2 = 1 - alpha * A;
    const a0 = 1 + alpha / A;
    const a1 = -2 * cosW;
    const a2 = 1 - alpha / A;

    // Normalize by a0
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

const EqualizerPlugin = {
    type: 'Эквалайзер',
    id: 'equalizer',
    icon: 'dsp-equalizer',
    description: '3-полосный параметрический эквалайзер (biquad)',
    group: 'audio',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        lowFreq: 200,
        lowGain: 0,
        lowQ: 0.7,
        midFreq: 1000,
        midGain: 0,
        midQ: 0.7,
        highFreq: 5000,
        highGain: 0,
        highQ: 0.7
    },

    processor: {
        states: new Map<string, EqualizerState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const sampleRate = (params.sampleRate ?? 48000) as number;
            const lowFreq = (params.lowFreq ?? 200) as number;
            const lowGain = (params.lowGain ?? 0) as number;
            const lowQ = (params.lowQ ?? 0.7) as number;
            const midFreq = (params.midFreq ?? 1000) as number;
            const midGain = (params.midGain ?? 0) as number;
            const midQ = (params.midQ ?? 0.7) as number;
            const highFreq = (params.highFreq ?? 5000) as number;
            const highGain = (params.highGain ?? 0) as number;
            const highQ = (params.highQ ?? 0.7) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    bands: [
                        { z1: 0, z2: 0 },
                        { z1: 0, z2: 0 },
                        { z1: 0, z2: 0 }
                    ],
                    cachedKey: '',
                    coeffs: []
                });
            }
            const state = this.states.get(nodeId)!;

            // Recompute coefficients if params changed
            const key = `${lowFreq}_${lowGain}_${lowQ}_${midFreq}_${midGain}_${midQ}_${highFreq}_${highGain}_${highQ}_${sampleRate}`;
            if (state.cachedKey !== key) {
                state.coeffs = [
                    peakingEQ(lowFreq, lowGain, lowQ, sampleRate),
                    peakingEQ(midFreq, midGain, midQ, sampleRate),
                    peakingEQ(highFreq, highGain, highQ, sampleRate)
                ];
                state.cachedKey = key;
            }

            const output = new Float32Array(chunkSize);

            for (let i = 0; i < chunkSize; i++) {
                let x = i < input.length ? input[i] : 0;

                // Process through 3 cascaded biquads (Direct Form II Transposed)
                for (let b = 0; b < 3; b++) {
                    const [b0, b1, b2, a1, a2] = state.coeffs[b];
                    const band = state.bands[b];

                    const y = b0 * x + band.z1;
                    band.z1 = b1 * x - a1 * y + band.z2;
                    band.z2 = b2 * x - a2 * y;

                    x = y;
                }

                output[i] = x;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default EqualizerPlugin;
