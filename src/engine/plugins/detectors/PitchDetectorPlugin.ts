/**
 * Pitch Detector — Автокорреляционный детектор высоты тона
 *
 * Назначение:
 *   Определяет основную частоту (pitch) звукового сигнала
 *   методом автокорреляции. Диапазон: 50–2000 Гц.
 *
 * Алгоритм:
 *   1. Буферизация входных отсчётов (окно windowSize).
 *   2. Нормализованная автокорреляция R(τ) = Σ x[n]·x[n+τ] / Σ x[n]².
 *   3. Поиск первого значимого пика R(τ) > threshold после нулевого пересечения.
 *   4. Частота = sampleRate / τ.
 *
 * Параметры:
 *   - windowSize (int, 2048) — размер окна анализа
 *   - minFreq (float, 50) — минимальная детектируемая частота (Гц)
 *   - maxFreq (float, 2000) — максимальная детектируемая частота (Гц)
 *   - confidenceThreshold (float, 0.3) — порог уверенности (0–1)
 *
 * Вход:  real
 * Выход: real (частота в Гц, 0 если не определена)
 */

import type { PluginDefinition } from '../../types';

interface PitchDetectorState {
    buffer: Float32Array;
    bufPos: number;
    lastPitch: number;
}

const PitchDetectorPlugin = {
    type: 'Детектор тона',
    id: 'pitch-detector',
    icon: 'dsp-pitch-detect',
    description: 'Автокорреляционный детектор высоты тона (50–2000 Гц)',
    group: 'detectors',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        windowSize: 2048,
        minFreq: 50,
        maxFreq: 2000,
        confidenceThreshold: 0.3
    },

    processor: {
        states: new Map<string, PitchDetectorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const sampleRate = (params.sampleRate ?? 48000) as number;
            const windowSize = Math.max(256, Math.min(4096, (params.windowSize ?? 2048) as number));
            const minFreq = (params.minFreq ?? 50) as number;
            const maxFreq = (params.maxFreq ?? 2000) as number;
            const threshold = (params.confidenceThreshold ?? 0.3) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    buffer: new Float32Array(windowSize),
                    bufPos: 0,
                    lastPitch: 0
                });
            }
            const state = this.states.get(nodeId)!;

            // Resize buffer if needed
            if (state.buffer.length !== windowSize) {
                state.buffer = new Float32Array(windowSize);
                state.bufPos = 0;
            }

            const output = new Float32Array(chunkSize);

            const minLag = Math.max(1, Math.floor(sampleRate / maxFreq));
            const maxLag = Math.min(windowSize - 1, Math.ceil(sampleRate / minFreq));

            for (let i = 0; i < chunkSize; i++) {
                state.buffer[state.bufPos] = i < input.length ? input[i] : 0;
                state.bufPos = (state.bufPos + 1) % windowSize;

                // Run analysis when buffer wraps
                if (state.bufPos === 0) {
                    const buf = state.buffer;

                    // Energy normalization
                    let energy = 0;
                    for (let n = 0; n < windowSize; n++) {
                        energy += buf[n] * buf[n];
                    }

                    if (energy < 1e-10) {
                        state.lastPitch = 0;
                    } else {
                        // Autocorrelation
                        let bestLag = 0;
                        let bestCorr = -1;
                        let foundZeroCrossing = false;
                        let prevCorr = 1;

                        for (let lag = minLag; lag <= maxLag; lag++) {
                            let corr = 0;
                            for (let n = 0; n < windowSize - lag; n++) {
                                corr += buf[n] * buf[n + lag];
                            }
                            corr /= energy;

                            // Wait for first zero-crossing from positive
                            if (!foundZeroCrossing) {
                                if (corr < 0) foundZeroCrossing = true;
                                prevCorr = corr;
                                continue;
                            }

                            // Find first peak above threshold after zero crossing
                            if (corr > bestCorr) {
                                bestCorr = corr;
                                bestLag = lag;
                            }

                            // If we're descending from a good peak, stop
                            if (corr < prevCorr && bestCorr > threshold) {
                                break;
                            }
                            prevCorr = corr;
                        }

                        state.lastPitch = (bestCorr > threshold && bestLag > 0)
                            ? sampleRate / bestLag
                            : 0;
                    }
                }

                output[i] = state.lastPitch;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default PitchDetectorPlugin;
