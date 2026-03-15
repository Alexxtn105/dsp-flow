/**
 * Triangle Wave — Генератор треугольного/пилообразного сигнала
 *
 * Назначение:
 *   Генерирует треугольный или пилообразный сигнал с настраиваемой формой.
 *   Параметр symmetry определяет соотношение нарастающего и спадающего фронтов:
 *   0 = обратная пила, 0.5 = симметричный треугольник, 1 = прямая пила.
 *
 * Алгоритм:
 *   Фазовый аккумулятор (фаза в [0, 1)). На нарастающем участке [0, symmetry]
 *   выход линейно растёт от −1 до +1. На спадающем [symmetry, 1) — от +1 до −1.
 *
 * Параметры:
 *   - frequency (float, по умолчанию 1000) — частота в Гц.
 *   - amplitude (float, по умолчанию 1.0) — амплитуда.
 *   - symmetry (float, по умолчанию 0.5) — форма: 0=обратная пила, 0.5=треугольник, 1=прямая пила.
 *
 * Вход:  нет
 * Выход: real (Float32Array)
 */

import type { PluginDefinition } from '../../types';

interface TriangleWaveState {
    currentPhase: number;
}

export default {
    type: 'Генератор треугольного сигнала',
    id: 'triangle-wave',
    icon: 'dsp-triangle-wave',
    description: 'Треугольный/пилообразный сигнал',
    group: 'generators',
    signals: { input: null, output: 'real' } as const,
    defaultParams: {
        frequency: 1000,
        amplitude: 1.0,
        symmetry: 0.5,
    },
    processor: {
        states: new Map<string, TriangleWaveState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const frequency = (params.frequency ?? 1000) as number;
            const amplitude = (params.amplitude ?? 1.0) as number;
            const symmetry = Math.max(0.001, Math.min(0.999, (params.symmetry ?? 0.5) as number));
            const sampleRate = (params.sampleRate ?? 48000) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentPhase: 0 });
            }
            const state = this.states.get(nodeId)!;

            const phaseIncrement = frequency / sampleRate;

            for (let i = 0; i < chunkSize; i++) {
                const phase = state.currentPhase;
                if (phase < symmetry) {
                    // Нарастающий фронт: -1 → +1
                    output[i] = amplitude * (2.0 * phase / symmetry - 1.0);
                } else {
                    // Спадающий фронт: +1 → -1
                    output[i] = amplitude * (1.0 - 2.0 * (phase - symmetry) / (1.0 - symmetry));
                }

                state.currentPhase += phaseIncrement;
                if (state.currentPhase >= 1.0) {
                    state.currentPhase -= 1.0;
                }
            }

            return output;
        }
    }
} satisfies PluginDefinition;
