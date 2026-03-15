/**
 * Polyphase Filter — Полифазный фильтр для ресемплинга
 *
 * Назначение:
 *   Эффективное изменение частоты дискретизации с использованием
 *   полифазной декомпозиции. Более эффективен, чем классическая
 *   схема «вставка нулей + фильтр + прореживание».
 *
 * Алгоритм:
 *   Upsample:
 *     1. Проектируем lowpass FIR с fc = 1/(2·L), длина = numTaps.
 *     2. Разбиваем на L полифазных компонент.
 *     3. Для каждого входного отсчёта вычисляем L выходных через полифазы.
 *   Downsample:
 *     1. lowpass FIR с fc = 1/(2·M).
 *     2. Разбиваем на M полифазных компонент.
 *     3. Для каждого M-го входного отсчёта — один выход.
 *
 * Параметры:
 *   - resampleMode (string, 'upsample'/'downsample') — режим
 *   - factor (int, 2–16) — коэффициент ресемплинга
 *   - numTaps (int, 64) — длина прототипного фильтра
 *
 * Вход:  real
 * Выход: real
 */

import type { PluginDefinition } from '../../types';
import { sinc } from '../_shared/FilterDesign';
import WindowFunctions from '../_shared/WindowFunctions';

interface PolyphaseState {
    history: Float32Array;
    histPos: number;
    polyCoeffs: Float32Array[]; // L phases, each with numTaps/L coefficients
    cachedKey: string;
    phase: number; // for downsample: tracks input phase
}

function designPolyphaseCoeffs(factor: number, numTaps: number): Float32Array[] {
    // Design lowpass prototype
    const fc = 1 / (2 * factor);
    const M = numTaps - 1;
    const proto = new Float32Array(numTaps);
    let sum = 0;

    for (let i = 0; i < numTaps; i++) {
        const m = i - M / 2;
        proto[i] = 2 * fc * sinc(2 * fc * m) * WindowFunctions.blackman(i, numTaps);
        sum += proto[i];
    }
    // Normalize
    if (Math.abs(sum) > 1e-10) {
        for (let i = 0; i < numTaps; i++) proto[i] /= sum;
    }
    // Scale for interpolation
    for (let i = 0; i < numTaps; i++) proto[i] *= factor;

    // Decompose into polyphase components
    const tapsPerPhase = Math.ceil(numTaps / factor);
    const phases: Float32Array[] = [];
    for (let p = 0; p < factor; p++) {
        const phase = new Float32Array(tapsPerPhase);
        for (let k = 0; k < tapsPerPhase; k++) {
            const idx = k * factor + p;
            if (idx < numTaps) phase[k] = proto[idx];
        }
        phases.push(phase);
    }
    return phases;
}

const PolyphaseFilterPlugin = {
    type: 'Полифазный фильтр',
    id: 'polyphase-filter',
    icon: 'dsp-polyphase',
    description: 'Полифазный фильтр (up/down resampling)',
    group: 'filters',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        resampleMode: 'upsample',
        factor: 2,
        numTaps: 64
    },

    processor: {
        states: new Map<string, PolyphaseState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const mode = (params.resampleMode ?? 'upsample') as string;
            const factor = Math.max(1, Math.min(16, Math.round((params.factor ?? 2) as number)));
            const numTaps = Math.max(8, Math.round((params.numTaps ?? 64) as number));

            const key = `${mode}_${factor}_${numTaps}`;

            if (!this.states.has(nodeId)) {
                const polyCoeffs = designPolyphaseCoeffs(factor, numTaps);
                const tapsPerPhase = polyCoeffs[0].length;
                this.states.set(nodeId, {
                    history: new Float32Array(tapsPerPhase),
                    histPos: 0,
                    polyCoeffs,
                    cachedKey: key,
                    phase: 0
                });
            }
            const state = this.states.get(nodeId)!;

            // Recompute if params changed
            if (state.cachedKey !== key) {
                state.polyCoeffs = designPolyphaseCoeffs(factor, numTaps);
                state.history = new Float32Array(state.polyCoeffs[0].length);
                state.histPos = 0;
                state.cachedKey = key;
                state.phase = 0;
            }

            const output = new Float32Array(chunkSize);
            const hist = state.history;
            const tapsPerPhase = hist.length;

            if (mode === 'upsample') {
                // For each input sample, produce 'factor' output samples
                let outIdx = 0;
                for (let i = 0; i < input.length && outIdx < chunkSize; i++) {
                    // Push sample into history
                    hist[state.histPos] = input[i];
                    state.histPos = (state.histPos + 1) % tapsPerPhase;

                    // Compute each polyphase output
                    for (let p = 0; p < factor && outIdx < chunkSize; p++) {
                        const coeffs = state.polyCoeffs[p];
                        let acc = 0;
                        for (let k = 0; k < tapsPerPhase; k++) {
                            const idx = (state.histPos + tapsPerPhase - 1 - k) % tapsPerPhase;
                            acc += hist[idx] * coeffs[k];
                        }
                        output[outIdx++] = acc;
                    }
                }
            } else {
                // Downsample: take every factor-th input, filtered
                let outIdx = 0;
                for (let i = 0; i < input.length && outIdx < chunkSize; i++) {
                    hist[state.histPos] = input[i];
                    state.histPos = (state.histPos + 1) % tapsPerPhase;
                    state.phase++;

                    if (state.phase >= factor) {
                        state.phase = 0;
                        // Use phase 0 for downsample filter
                        const coeffs = state.polyCoeffs[0];
                        let acc = 0;
                        for (let k = 0; k < tapsPerPhase; k++) {
                            const idx = (state.histPos + tapsPerPhase - 1 - k) % tapsPerPhase;
                            acc += hist[idx] * coeffs[k];
                        }
                        output[outIdx++] = acc;
                    }
                }
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default PolyphaseFilterPlugin;
