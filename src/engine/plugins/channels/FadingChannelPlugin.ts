/**
 * Fading Channel — Канал с замираниями (Рэлея / Райса)
 *
 * Назначение:
 *   Моделирует канал связи с многолучевым замиранием.
 *   Рэлеевское замирание — модель без прямой видимости (NLOS).
 *   Райсовское замирание — модель с прямой видимостью (LOS), где прямой
 *   луч (LOS) суммируется с рассеянными компонентами (Rayleigh).
 *
 * Алгоритм:
 *   1. Генерация двух независимых гауссовых процессов (Box-Muller)
 *   2. Фильтрация IIR-фильтром для формирования доплеровского спектра
 *      (Jakes модель): H(z) = (1-a²) / (1 - a·z⁻¹), a = 2πfd/fs
 *   3. Rayleigh: h = (g1 + j·g2) / √2
 *   4. Rician: h = √(K/(K+1)) + √(1/(K+1)) · (g1 + j·g2) / √2
 *      где K — K-фактор (отношение мощности LOS к рассеянной)
 *   5. Выход: y = h · x (комплексное умножение)
 *
 * Параметры:
 *   - fadingType (string) — 'rayleigh' или 'rician'
 *   - dopplerFrequency (float, 0.1–1000) — максимальная доплеровская частота (Гц)
 *   - kFactor (float, 0–20) — K-фактор Райса (дБ), только для 'rician'
 *
 * Вход:  complex
 * Выход: complex
 */

import type { PluginDefinition } from '../../types';

interface FadingChannelState {
    prevG1: number;
    prevG2: number;
}

function gaussianRandom(): number {
    let u1 = Math.random();
    const u2 = Math.random();
    while (u1 === 0) u1 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

const FadingChannelPlugin = {
    type: 'Канал с замираниями',
    id: 'fading-channel',
    icon: 'dsp-fading',
    description: 'Рэлеевское/Райсовское замирание',
    group: 'channels',

    signals: {
        input: 'complex',
        output: 'complex'
    } as const,

    defaultParams: {
        fadingType: 'rayleigh',
        dopplerFrequency: 10,
        kFactor: 3,
    },

    processor: {
        states: new Map<string, FadingChannelState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize * 2);
            const input = inputs[0];
            if (!input) return output;

            const fadingType = (params.fadingType ?? 'rayleigh') as string;
            const fd = (params.dopplerFrequency ?? 10) as number;
            const kFactorDb = (params.kFactor ?? 3) as number;
            const sampleRate = (params.sampleRate ?? 48000) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { prevG1: 0, prevG2: 0 });
            }
            const state = this.states.get(nodeId)!;

            // IIR Doppler filter coefficient with variance normalization
            const a = Math.exp(-2 * Math.PI * fd / sampleRate);
            const normGain = Math.sqrt(1 - a * a);

            // Rician parameters
            const kLinear = Math.pow(10, kFactorDb / 10);
            const losAmp = fadingType === 'rician' ? Math.sqrt(kLinear / (kLinear + 1)) : 0;
            const scatterAmp = fadingType === 'rician'
                ? Math.sqrt(1 / (kLinear + 1))
                : 1;
            const invSqrt2 = 1 / Math.SQRT2;

            for (let i = 0; i < chunkSize; i++) {
                // Generate filtered Gaussian processes (Doppler shaping)
                const n1 = gaussianRandom();
                const n2 = gaussianRandom();
                state.prevG1 = a * state.prevG1 + normGain * n1;
                state.prevG2 = a * state.prevG2 + normGain * n2;

                // Channel coefficient h = LOS + scatter
                const hR = losAmp + scatterAmp * state.prevG1 * invSqrt2;
                const hI = scatterAmp * state.prevG2 * invSqrt2;

                // Complex multiplication: y = h · x
                const xR = input[i * 2];
                const xI = input[i * 2 + 1];
                output[i * 2] = hR * xR - hI * xI;
                output[i * 2 + 1] = hR * xI + hI * xR;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default FadingChannelPlugin;
