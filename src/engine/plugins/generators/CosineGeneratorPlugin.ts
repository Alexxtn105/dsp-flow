/**
 * Косинусный генератор — Источник косинусоидального сигнала
 *
 * Назначение:
 *   Генерирует непрерывный косинусоидальный сигнал вида s(t) = A · cos(2π·f·t + φ).
 *   Косинус — это тот же синус, но сдвинутый на 90° (π/2 радиан) вперёд по фазе.
 *   Такой сигнал необходим для формирования квадратурных пар (I/Q), где синус
 *   представляет квадратурную (Q) компоненту, а косинус — синфазную (I).
 *
 * Алгоритм:
 *   Идентичен синусному генератору, но вместо Math.sin используется Math.cos.
 *   Фазовый аккумулятор увеличивается на Δφ = 2π·f / sampleRate каждый отсчёт.
 *   Состояние аккумулятора сохраняется между чанками для непрерывности сигнала.
 *   Фаза нормализуется в [0, 2π) для предотвращения потери точности float.
 *
 * Отличие от синусного генератора:
 *   cos(x) = sin(x + π/2). Можно было бы использовать синусный генератор
 *   с phase=90°, но отдельный косинусный блок удобнее для наглядности схем
 *   и явного формирования квадратурных сигналов.
 *
 * Параметры:
 *   - frequency (float, по умолчанию 1000) — частота косинусоиды в Гц.
 *     Допустимый диапазон: 0 до sampleRate/2 (обычно до 24000 Гц).
 *   - amplitude (float, по умолчанию 1.0) — амплитуда сигнала.
 *     Диапазон: 0.0–1.0 (значения > 1.0 допустимы, но могут вызвать клиппинг).
 *   - phase (float, по умолчанию 0) — начальное смещение фазы в градусах.
 *     Диапазон: 0–360°. Преобразуется в радианы: phaseOffset = phase · π/180.
 *
 * Вход:  нет (автономный источник)
 * Выход: real (Float32Array длиной chunkSize)
 *
 * Примеры использования:
 *
 *   1. Формирование квадратурной пары (ручное):
 *      Sine(1000 Гц) → Multiplier (Q-ветка)
 *      Cosine(1000 Гц) → Multiplier (I-ветка)
 *      Два сигнала одной частоты, но со сдвигом 90°, образуют I/Q-пару.
 *
 *   2. Проверка ортогональности:
 *      Sine(1000 Гц) → Multiplier ← Cosine(1000 Гц) → Integrator
 *      Интеграл произведения sin·cos за целое число периодов стремится к нулю,
 *      что подтверждает ортогональность.
 *
 *   3. Когерентная демодуляция AM:
 *      AMFMPMModulator(AM, несущая 10000 Гц) → Multiplier ← Cosine(10000 Гц)
 *      → LowpassFIR → Oscilloscope
 *      Косинус той же частоты, что и несущая, используется для синхронного детектирования.
 */

import type { PluginDefinition } from '../../types';

interface CosineGeneratorState {
    currentPhase: number;
}

export default {
    type: 'Косинусный генератор',
    id: 'cosine-generator',
    icon: 'dsp-cosine',
    description: 'Косинусный генератор',
    group: 'generators',
    signals: { input: null, output: 'real' } as const,
    defaultParams: {
        frequency: 1000,
        amplitude: 1.0,
        phase: 0,
    },
    processor: {
        states: new Map<string, CosineGeneratorState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const frequency = params.frequency ?? 1000;
            const amplitude = params.amplitude ?? 1.0;
            const phaseOffset = ((params.phase ?? 0) as number) * (Math.PI / 180);
            const sampleRate = params.sampleRate ?? 48000;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentPhase: 0 });
            }
            const state = this.states.get(nodeId)!;

            const phaseIncrement = (2 * Math.PI * (frequency as number)) / (sampleRate as number);

            for (let i = 0; i < chunkSize; i++) {
                output[i] = (amplitude as number) * Math.cos(state.currentPhase + phaseOffset);
                state.currentPhase += phaseIncrement;
                if (state.currentPhase >= 2 * Math.PI) {
                    state.currentPhase %= (2 * Math.PI);
                }
            }

            return output;
        }
    }
};
