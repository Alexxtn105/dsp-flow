/**
 * Phase Portrait — Фазовый портрет (траектория в пространстве состояний)
 *
 * Назначение:
 *   Визуализирует траекторию комплексного сигнала в пространстве состояний.
 *   Блок является «прозрачным» (passthrough) для комплексного сигнала:
 *   принимает interleaved Float32Array [I0, Q0, I1, Q1, ...] и передаёт
 *   его без изменений в компонент визуализации.
 *
 * Параметры:
 *   - trailLength (int, по умолчанию 2048) — длина «хвоста» траектории
 *     (количество последних отсчётов, отображаемых на фазовом портрете)
 *   - dotSize (int, по умолчанию 2) — размер точки визуализации в пикселях
 *
 * Вход:  complex (interleaved Float32Array [I0, Q0, I1, Q1, ...])
 * Выход: null (визуализация — фазовый портрет)
 *
 * Примеры использования:
 *   1. Визуализация аттрактора:
 *      Генератор → Нелинейная система → PhasePortrait
 *   2. Анализ модулированного сигнала:
 *      PSKModulator → AWGNChannel → PhasePortrait
 */

import type { PluginDefinition } from '../../types';

export default {
    type: 'Фазовый портрет',
    id: 'phase-portrait',
    icon: 'dsp-phase-portrait',
    description: 'Фазовый портрет (траектория в пространстве состояний)',
    group: 'visualization',
    signals: { input: 'complex', output: null } as const,
    defaultParams: {
        trailLength: 2048,
        dotSize: 2,
    },
    processor: {
        process(inputs: (Float32Array | null)[], _params: Record<string, unknown>, chunkSize: number) {
            return inputs[0] || new Float32Array(chunkSize * 2);
        }
    }
} satisfies PluginDefinition;
