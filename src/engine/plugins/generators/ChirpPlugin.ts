/**
 * Chirp — ЛЧМ-сигнал (линейная частотная модуляция)
 *
 * Назначение:
 *   Генерирует сигнал с частотой, плавно изменяющейся от f₁ до f₂ за T секунд.
 *   Chirp-сигналы используются в радиолокации (сжатие импульсов), тестировании
 *   АЧХ фильтров (вместо шума) и спектральном анализе.
 *
 * Алгоритм:
 *   - Линейная развёртка: f(t) = f₁ + (f₂ − f₁) · t/T, фаза = ∫f(t)dt
 *   - Экспоненциальная развёртка: f(t) = f₁ · (f₂/f₁)^(t/T)
 *   После достижения времени T сигнал зацикливается.
 *
 * Параметры:
 *   - startFrequency (float, по умолчанию 100) — начальная частота f₁ (Гц).
 *   - endFrequency (float, по умолчанию 10000) — конечная частота f₂ (Гц).
 *   - duration (float, по умолчанию 1.0) — длительность развёртки T (секунды).
 *   - amplitude (float, по умолчанию 1.0) — амплитуда.
 *   - sweepType (string, по умолчанию 'linear') — тип развёртки: 'linear' или 'exponential'.
 *
 * Вход:  нет
 * Выход: real (Float32Array)
 */

import type { PluginDefinition } from '../../types';

interface ChirpState {
    currentSample: number;
    currentPhase: number;
}

export default {
    type: 'ЛЧМ-сигнал',
    id: 'chirp',
    icon: 'dsp-chirp',
    description: 'ЛЧМ-сигнал (частотная развёртка f₁→f₂)',
    group: 'generators',
    signals: { input: null, output: 'real' } as const,
    defaultParams: {
        startFrequency: 100,
        endFrequency: 10000,
        duration: 1.0,
        amplitude: 1.0,
        sweepType: 'linear',
    },
    processor: {
        states: new Map<string, ChirpState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const f1 = (params.startFrequency ?? 100) as number;
            const f2 = (params.endFrequency ?? 10000) as number;
            const duration = (params.duration ?? 1.0) as number;
            const amplitude = (params.amplitude ?? 1.0) as number;
            const sweepType = (params.sweepType ?? 'linear') as string;
            const sampleRate = (params.sampleRate ?? 48000) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentSample: 0, currentPhase: 0 });
            }
            const state = this.states.get(nodeId)!;

            const totalSamples = duration * sampleRate;
            const TWO_PI = 2 * Math.PI;

            for (let i = 0; i < chunkSize; i++) {
                const t = state.currentSample / sampleRate;
                let instantFreq: number;

                if (sweepType === 'exponential' && f1 > 0 && f2 > 0) {
                    // Экспоненциальная развёртка
                    const ratio = f2 / f1;
                    const tNorm = state.currentSample / totalSamples;
                    instantFreq = f1 * Math.pow(ratio, tNorm);
                } else {
                    // Линейная развёртка
                    const chirpRate = (f2 - f1) / duration;
                    instantFreq = f1 + chirpRate * t;
                }

                output[i] = amplitude * Math.sin(state.currentPhase);
                state.currentPhase += TWO_PI * instantFreq / sampleRate;

                // Нормализация фазы
                if (state.currentPhase >= TWO_PI) {
                    state.currentPhase -= TWO_PI * Math.floor(state.currentPhase / TWO_PI);
                }

                state.currentSample++;
                if (state.currentSample >= totalSamples) {
                    state.currentSample = 0;
                    // Сохраняем фазу по модулю 2π для плавного зацикливания
                    state.currentPhase %= TWO_PI;
                }
            }

            return output;
        }
    }
} satisfies PluginDefinition;
