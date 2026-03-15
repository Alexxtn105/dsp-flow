/**
 * Step — Ступенчатая функция (единичный скачок)
 *
 * Назначение:
 *   Генерирует ступенчатую функцию Хевисайда: 0 до момента stepTime, затем amplitude.
 *   Используется для тестирования переходных характеристик систем — подав скачок
 *   на фильтр, получаем его переходную характеристику h_step(t).
 *
 * Алгоритм:
 *   Счётчик отсчётов сравнивается с stepTime · sampleRate.
 *
 * Параметры:
 *   - stepTime (float, по умолчанию 0.01) — момент скачка в секундах.
 *   - amplitude (float, по умолчанию 1.0) — амплитуда после скачка.
 *
 * Вход:  нет
 * Выход: real (Float32Array)
 */

import type { PluginDefinition } from '../../types';

interface StepState {
    currentSample: number;
}

export default {
    type: 'Ступенчатая функция',
    id: 'step',
    icon: 'dsp-step',
    description: 'Единичный скачок в заданный момент',
    group: 'generators',
    signals: { input: null, output: 'real' } as const,
    defaultParams: {
        stepTime: 0.01,
        amplitude: 1.0,
    },
    processor: {
        states: new Map<string, StepState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const stepTime = (params.stepTime ?? 0.01) as number;
            const amplitude = (params.amplitude ?? 1.0) as number;
            const sampleRate = (params.sampleRate ?? 48000) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentSample: 0 });
            }
            const state = this.states.get(nodeId)!;

            const stepSample = Math.floor(stepTime * sampleRate);

            for (let i = 0; i < chunkSize; i++) {
                output[i] = state.currentSample >= stepSample ? amplitude : 0;
                // Остановить счётчик после срабатывания для предотвращения переполнения
                if (state.currentSample < stepSample + 1) {
                    state.currentSample++;
                }
            }

            return output;
        }
    }
} satisfies PluginDefinition;
