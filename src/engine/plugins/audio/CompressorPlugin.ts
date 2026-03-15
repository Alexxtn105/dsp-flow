/**
 * Compressor — Динамический компрессор
 *
 * Назначение:
 *   Уменьшает динамический диапазон сигнала. Сигналы выше порога
 *   сжимаются с заданным коэффициентом. Широко используется в
 *   аудиопроизводстве, вещании и мастеринге.
 *
 * Алгоритм:
 *   1. Envelope follower с раздельными attack/release.
 *   2. Если envelope > threshold: gain reduction = (env - threshold) * (1 - 1/ratio).
 *   3. Makeup gain компенсирует потерю уровня.
 *   4. Выход: y = x * gain.
 *
 * Параметры:
 *   - threshold (float, -20 дБ) — порог срабатывания
 *   - ratio (float, 4:1) — степень сжатия
 *   - attackTime (float, 5 мс) — время атаки
 *   - releaseTime (float, 50 мс) — время восстановления
 *   - makeupGain (float, 0 дБ) — компенсационное усиление
 *
 * Вход:  real
 * Выход: real
 */

import type { PluginDefinition } from '../../types';

interface CompressorState {
    envelope: number;
}

const CompressorPlugin = {
    type: 'Компрессор',
    id: 'compressor',
    icon: 'dsp-compressor',
    description: 'Динамический компрессор (threshold, ratio, attack/release)',
    group: 'audio',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        threshold: -20,
        ratio: 4,
        attackTime: 5,
        releaseTime: 50,
        makeupGain: 0
    },

    processor: {
        states: new Map<string, CompressorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const thresholdDb = (params.threshold ?? -20) as number;
            const ratio = Math.max(1, (params.ratio ?? 4) as number);
            const attackMs = (params.attackTime ?? 5) as number;
            const releaseMs = (params.releaseTime ?? 50) as number;
            const makeupDb = (params.makeupGain ?? 0) as number;
            const sampleRate = (params.sampleRate ?? 48000) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { envelope: 0 });
            }
            const state = this.states.get(nodeId)!;

            const thresholdLin = Math.pow(10, thresholdDb / 20);
            const makeupLin = Math.pow(10, makeupDb / 20);

            const attackCoeff = attackMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * attackMs * 0.001))
                : 1;
            const releaseCoeff = releaseMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * releaseMs * 0.001))
                : 1;

            const output = new Float32Array(chunkSize);
            let env = state.envelope;

            for (let i = 0; i < chunkSize; i++) {
                const sample = i < input.length ? input[i] : 0;
                const absSample = Math.abs(sample);

                // Envelope follower
                const coeff = absSample > env ? attackCoeff : releaseCoeff;
                env += coeff * (absSample - env);

                // Gain computation
                let gain = 1;
                if (env > thresholdLin && thresholdLin > 0) {
                    // dB domain compression
                    const envDb = 20 * Math.log10(env);
                    const thDb = 20 * Math.log10(thresholdLin);
                    const overDb = envDb - thDb;
                    const compressedDb = thDb + overDb / ratio;
                    gain = Math.pow(10, (compressedDb - envDb) / 20);
                }

                output[i] = sample * gain * makeupLin;
            }

            state.envelope = env;
            return output;
        }
    }
} satisfies PluginDefinition;

export default CompressorPlugin;
