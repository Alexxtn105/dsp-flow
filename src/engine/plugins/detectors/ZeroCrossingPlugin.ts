/**
 * Zero Crossing Detector — Детектор нулевых пересечений
 *
 * Назначение:
 *   Подсчитывает количество пересечений нуля в скользящем окне
 *   и преобразует в оценку частоты. Простой и быстрый метод
 *   оценки частоты для сигналов с одной доминирующей компонентой.
 *
 * Алгоритм:
 *   1. Обнаружение смены знака: sign(x[n]) ≠ sign(x[n-1]).
 *   2. Подсчёт пересечений в окне windowSize отсчётов.
 *   3. Частота ≈ crossings / (2 · windowSize) · sampleRate.
 *   4. Сглаживание между окнами для плавного выхода.
 *
 * Параметры:
 *   - windowSize (int, 1024) — размер окна подсчёта
 *
 * Вход:  real
 * Выход: real (оценка частоты в Гц)
 */

import type { PluginDefinition } from '../../types';

interface ZeroCrossingState {
    prevSample: number;
    crossings: number;
    windowCounter: number;
    lastFreq: number;
}

const ZeroCrossingPlugin = {
    type: 'Детектор нулевых пересечений',
    id: 'zero-crossing',
    icon: 'dsp-zero-cross',
    description: 'Оценка частоты по нулевым пересечениям',
    group: 'detectors',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        windowSize: 1024
    },

    processor: {
        states: new Map<string, ZeroCrossingState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const sampleRate = (params.sampleRate ?? 48000) as number;
            const windowSize = Math.max(16, (params.windowSize ?? 1024) as number);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    prevSample: 0,
                    crossings: 0,
                    windowCounter: 0,
                    lastFreq: 0
                });
            }
            const state = this.states.get(nodeId)!;

            const output = new Float32Array(chunkSize);

            for (let i = 0; i < chunkSize; i++) {
                const sample = i < input.length ? input[i] : 0;

                // Detect zero crossing
                if ((state.prevSample >= 0 && sample < 0) || (state.prevSample < 0 && sample >= 0)) {
                    state.crossings++;
                }
                state.prevSample = sample;
                state.windowCounter++;

                // Window complete
                if (state.windowCounter >= windowSize) {
                    // frequency = crossings / (2 * windowSize) * sampleRate
                    state.lastFreq = (state.crossings / (2 * windowSize)) * sampleRate;
                    state.crossings = 0;
                    state.windowCounter = 0;
                }

                output[i] = state.lastFreq;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default ZeroCrossingPlugin;
