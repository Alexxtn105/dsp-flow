/**
 * Синусный генератор — Источник синусоидального сигнала
 *
 * Назначение:
 *   Генерирует непрерывный синусоидальный сигнал вида s(t) = A · sin(2π·f·t + φ).
 *   Это самый базовый блок в цифровой обработке сигналов, используемый как тестовый
 *   сигнал, несущая частота, опорный тон и строительный кирпичик для сложных сигналов.
 *
 * Алгоритм:
 *   Используется фазовый аккумулятор (phase accumulator) — на каждом отсчёте фаза
 *   увеличивается на Δφ = 2π·f / sampleRate. Значение синуса вычисляется как
 *   Math.sin(currentPhase + phaseOffset). Фаза нормализуется в диапазоне [0, 2π)
 *   для предотвращения потери точности при длительной работе. Аккумулятор сохраняет
 *   состояние между чанками, обеспечивая непрерывность сигнала без щелчков и разрывов.
 *
 * Параметры:
 *   - frequency (float, по умолчанию 1000) — частота синусоиды в Гц.
 *     Допустимый диапазон: 0 до sampleRate/2 (по Найквисту, обычно до 24000 Гц).
 *     Типичные значения: 440 (нота «ля»), 1000 (тестовый тон), 10000 (несущая).
 *   - amplitude (float, по умолчанию 1.0) — амплитуда сигнала.
 *     Диапазон: 0.0–1.0. Значения > 1.0 допустимы, но могут вызвать клиппинг
 *     при воспроизведении через Speaker. Значение 0 даёт тишину.
 *   - phase (float, по умолчанию 0) — начальное смещение фазы в градусах.
 *     Диапазон: 0–360°. Преобразуется в радианы: phaseOffset = phase · π/180.
 *     Используется для задания начальной фазы, например 90° превратит синус в косинус.
 *
 * Вход:  нет (автономный источник)
 * Выход: real (Float32Array длиной chunkSize)
 *
 * Примеры использования:
 *
 *   1. Простое наблюдение синусоиды:
 *      Sine(1000 Гц) → Oscilloscope
 *      На осциллографе видна чистая синусоида с частотой 1 кГц.
 *
 *   2. Спектральный анализ суммы тонов:
 *      Sine(1000 Гц) + Sine(3000 Гц) → Summer → SpectrumAnalyzer
 *      На спектре видны два пика: на 1 кГц и 3 кГц.
 *
 *   3. Модуляция несущей:
 *      Sine(100 Гц, амплитуда 0.5) → AMFMPMModulator(FM, несущая 10000 Гц)
 *      Синусоида 100 Гц используется как модулирующий сигнал для FM-модуляции.
 *
 *   4. Тестирование фильтра:
 *      Sine(5000 Гц) → LowpassFIR(cutoff 3000 Гц) → Oscilloscope
 *      Сигнал 5 кГц подавляется фильтром — на выходе почти тишина.
 */

export default {
    type: 'Синусный генератор',
    id: 'sine-generator',
    icon: 'dsp-sine',
    description: 'Синусный генератор',
    group: 'generators',
    signals: { input: null, output: 'real' },
    defaultParams: {
        frequency: 1000,
        amplitude: 1.0,
        phase: 0,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const output = new Float32Array(chunkSize);
            const frequency = params.frequency ?? 1000;
            const amplitude = params.amplitude ?? 1.0;
            const phaseOffset = (params.phase ?? 0) * (Math.PI / 180);
            const sampleRate = params.sampleRate ?? 48000;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentPhase: 0 });
            }
            const state = this.states.get(nodeId);

            const phaseIncrement = (2 * Math.PI * frequency) / sampleRate;

            for (let i = 0; i < chunkSize; i++) {
                output[i] = amplitude * Math.sin(state.currentPhase + phaseOffset);
                state.currentPhase += phaseIncrement;
                if (state.currentPhase >= 2 * Math.PI) {
                    state.currentPhase %= (2 * Math.PI);
                }
            }

            return output;
        }
    }
};
