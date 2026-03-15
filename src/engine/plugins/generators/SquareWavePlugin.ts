/**
 * Square Wave — Генератор прямоугольного сигнала (меандр)
 *
 * Назначение:
 *   Генерирует прямоугольный сигнал с настраиваемой скважностью (duty cycle).
 *   При duty = 0.5 получается классический меандр. Прямоугольные сигналы
 *   широко используются в цифровой электронике как тактовые импульсы,
 *   а в DSP — для тестирования переходных характеристик фильтров.
 *
 * Алгоритм:
 *   Фазовый аккумулятор аналогично синусоиде. Если текущая фаза (нормализованная
 *   к [0, 1)) меньше dutyCycle — выход +amplitude, иначе −amplitude.
 *
 * Параметры:
 *   - frequency (float, по умолчанию 1000) — частота в Гц.
 *   - amplitude (float, по умолчанию 1.0) — амплитуда сигнала.
 *   - dutyCycle (float, по умолчанию 0.5) — скважность, 0..1.
 *     0.5 = симметричный меандр, 0.1 = короткие импульсы, 0.9 = широкие импульсы.
 *
 * Вход:  нет
 * Выход: real (Float32Array)
 */

import type { PluginDefinition } from '../../types';

interface SquareWaveState {
    currentPhase: number;
}

export default {
    type: 'Генератор меандра',
    id: 'square-wave',
    icon: 'dsp-square-wave',
    description: 'Генератор прямоугольного сигнала (меандр)',
    group: 'generators',
    signals: { input: null, output: 'real' } as const,
    defaultParams: {
        frequency: 1000,
        amplitude: 1.0,
        dutyCycle: 0.5,
    },
    processor: {
        states: new Map<string, SquareWaveState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const frequency = (params.frequency ?? 1000) as number;
            const amplitude = (params.amplitude ?? 1.0) as number;
            const dutyCycle = (params.dutyCycle ?? 0.5) as number;
            const sampleRate = (params.sampleRate ?? 48000) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentPhase: 0 });
            }
            const state = this.states.get(nodeId)!;

            const phaseIncrement = frequency / sampleRate;

            for (let i = 0; i < chunkSize; i++) {
                output[i] = state.currentPhase < dutyCycle ? amplitude : -amplitude;
                state.currentPhase += phaseIncrement;
                if (state.currentPhase >= 1.0) {
                    state.currentPhase -= 1.0;
                }
            }

            return output;
        }
    }
} satisfies PluginDefinition;
