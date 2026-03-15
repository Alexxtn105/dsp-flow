/**
 * SNR Meter — Измеритель отношения сигнал/шум
 *
 * Назначение:
 *   Измеряет SNR по двум входам: сигнал и опорный (чистый) сигнал.
 *   Шум вычисляется как разность: noise = signal − reference.
 *   SNR = 10·log₁₀(P_ref / P_noise) в дБ.
 *
 * Параметры: нет
 *
 * Вход:  2× real (сигнал + опорный)
 * Выход: null (визуализация — SNR в дБ)
 */

import type { PluginDefinition } from '../../types';

export default {
    type: 'Измеритель ОСШ',
    id: 'snr-meter',
    icon: 'dsp-snr-meter',
    description: 'Измеритель отношения сигнал/шум (SNR)',
    group: 'visualization',
    signals: {
        input: 'real',
        output: null,
        inputsCount: 2,
        inputLabels: ['Signal', 'Reference']
    } as const,
    defaultParams: {},
    processor: {
        process(inputs: (Float32Array | null)[], _params: Record<string, unknown>, chunkSize: number) {
            const signal = inputs[0];
            const reference = inputs[1];

            if (!signal || !reference) {
                return { snr: 0, signalPower: 0, noisePower: 0 };
            }

            let refPower = 0;
            let noisePower = 0;
            for (let i = 0; i < chunkSize; i++) {
                const ref = i < reference.length ? reference[i] : 0;
                const sig = i < signal.length ? signal[i] : 0;
                const noise = sig - ref;
                refPower += ref * ref;
                noisePower += noise * noise;
            }
            refPower /= chunkSize;
            noisePower /= chunkSize;

            const snr = noisePower > 1e-20
                ? 10 * Math.log10(refPower / noisePower)
                : Infinity;

            return { snr, signalPower: refPower, noisePower };
        }
    }
} satisfies PluginDefinition;
