/**
 * Microphone Input — Источник аудиосигнала с микрофона или линейного входа
 *
 * Назначение:
 *   Захватывает аудио в реальном времени с микрофона или линейного входа (line-in)
 *   через Web Audio API (getUserMedia). Позволяет обрабатывать живой аудиосигнал
 *   в графе DSP: анализировать спектр речи, применять фильтры к голосу,
 *   детектировать тон в реальном времени и т.д.
 *
 * Архитектура:
 *   Данный плагин является «заглушкой» (placeholder). Фактический захват
 *   аудиоданных выполняется MicrophoneService, а DSPProcessor перехватывает
 *   обработку этого блока и подставляет данные из кольцевого буфера микрофона.
 *   Если process() вызывается напрямую (микрофон не активен), возвращается
 *   тишина (массив нулей).
 *
 * Параметры:
 *   - gain (number, по умолчанию 1.0) — усиление входного сигнала
 *
 * Вход:  нет (автономный источник)
 * Выход: real (Float32Array длиной chunkSize, данные с микрофона или тишина)
 *
 * Примеры использования:
 *
 *   1. Спектральный анализ голоса в реальном времени:
 *      MicrophoneInput → SpectrumAnalyzer
 *
 *   2. Фильтрация и воспроизведение:
 *      MicrophoneInput → LowpassFIR(3000 Hz) → Speaker
 *
 *   3. Детекция тона:
 *      MicrophoneInput → PitchDetector → NumericIndicator
 */

import type { PluginDefinition } from '../../types';

export default {
    type: 'Microphone Input',
    id: 'microphone-input',
    icon: 'dsp-microphone',
    description: 'Источник аудиосигнала с микрофона',
    group: 'generators',
    signals: { input: null, output: 'real' } as const,
    defaultParams: {
        gain: 1.0,
    },
    processor: {
        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            // Этот блок обрабатывается в DSPProcessor (читает данные MicrophoneService)
            // Если вызван process напрямую, возвращаем тишину
            return new Float32Array(chunkSize);
        }
    }
} satisfies PluginDefinition;
