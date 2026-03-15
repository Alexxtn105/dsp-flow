/**
 * THD Meter — Измеритель THD (Total Harmonic Distortion)
 *
 * Назначение:
 *   Измеряет суммарные гармонические искажения входного сигнала.
 *   Выполняет FFT, находит фундаментальную частоту (бин с максимальной
 *   амплитудой), затем суммирует мощность гармоник (2f, 3f, 4f, ...)
 *   до частоты Найквиста.
 *
 * Параметры:
 *   - fftSize (int, по умолчанию 4096) — размер FFT (определяет
 *     частотное разрешение анализа)
 *
 * Вход:  real (Float32Array)
 * Выход: null (визуализация — метрики THD)
 *
 * Возвращает объект:
 *   - fundamental: частота основного тона в Гц
 *   - thd: THD в процентах
 *   - thdDb: THD в дБ (20*log10(thd/100))
 *   - harmonics: массив объектов {freq, magnitude} для каждой гармоники
 */

import { fft } from '../_shared/FFTUtils';
import type { PluginDefinition } from '../../types';

export default {
    type: 'Измеритель THD',
    id: 'thd-meter',
    icon: 'dsp-thd-meter',
    description: 'Измеритель суммарных гармонических искажений (THD)',
    group: 'visualization',
    signals: { input: 'real', output: null } as const,
    defaultParams: { fftSize: 4096 },
    processor: {
        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number) {
            const input = inputs[0];
            if (!input) {
                return { fundamental: 0, thd: 0, thdDb: -Infinity, harmonics: [] };
            }

            const fftSize = (params.fftSize as number) ?? 4096;
            const sampleRate = (params.sampleRate as number) ?? 48000;

            // Pad or truncate input to fftSize
            const real = new Float32Array(fftSize);
            const imag = new Float32Array(fftSize);
            const copyLen = Math.min(chunkSize, fftSize);
            for (let i = 0; i < copyLen; i++) {
                real[i] = input[i];
            }

            fft(real, imag);

            // Compute magnitudes (skip DC bin 0)
            const halfN = fftSize >>> 1;
            const magnitudes = new Float32Array(halfN);
            for (let k = 1; k < halfN; k++) {
                magnitudes[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
            }

            // Find fundamental: bin with max magnitude (skip DC)
            let fundBin = 1;
            let fundMag = magnitudes[1];
            for (let k = 2; k < halfN; k++) {
                if (magnitudes[k] > fundMag) {
                    fundMag = magnitudes[k];
                    fundBin = k;
                }
            }

            if (fundMag === 0) {
                return { fundamental: 0, thd: 0, thdDb: -Infinity, harmonics: [] };
            }

            const freqPerBin = sampleRate / fftSize;
            const fundamentalFreq = fundBin * freqPerBin;

            // Sum power of harmonics: 2f, 3f, 4f, ... up to Nyquist
            const harmonics: Array<{ freq: number; magnitude: number }> = [];
            let harmonicPowerSum = 0;

            for (let h = 2; h * fundBin < halfN; h++) {
                const hBin = h * fundBin;
                const hMag = magnitudes[hBin];
                harmonicPowerSum += hMag * hMag;
                harmonics.push({
                    freq: hBin * freqPerBin,
                    magnitude: hMag,
                });
            }

            // THD = sqrt(sum of harmonic powers) / fundamental_magnitude * 100
            const thd = (Math.sqrt(harmonicPowerSum) / fundMag) * 100;
            const thdDb = thd > 0 ? 20 * Math.log10(thd / 100) : -Infinity;

            return { fundamental: fundamentalFreq, thd, thdDb, harmonics };
        }
    }
} satisfies PluginDefinition;
