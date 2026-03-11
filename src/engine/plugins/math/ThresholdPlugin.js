/**
 * Компаратор / Пороговый детектор (Threshold) — Бинаризация сигнала с гистерезисом
 *
 * Назначение:
 *   Сравнивает входной сигнал с пороговым уровнем и формирует на выходе
 *   двухуровневый (бинарный) сигнал. В цифровой электронике это аналог
 *   компаратора напряжения или триггера Шмитта (при включённом гистерезисе).
 *   Компаратор применяется для преобразования аналогового сигнала в
 *   прямоугольный, детектирования пересечения нуля, формирования
 *   тактовых импульсов и пороговой обработки.
 *
 * Алгоритм:
 *   Без гистерезиса: y[n] = x[n] > threshold ? outputHigh : outputLow
 *   С гистерезисом (триггер Шмитта):
 *     - Верхний порог = threshold + hysteresis/2
 *     - Нижний порог = threshold - hysteresis/2
 *     - Переключение HIGH→LOW: только при x < нижнего порога
 *     - Переключение LOW→HIGH: только при x > верхнего порога
 *   Гистерезис предотвращает дребезг (быстрые переключения) при медленном
 *   пересечении порога зашумлённым сигналом.
 *
 * Параметры:
 *   - threshold (float, по умолчанию 0) — пороговый уровень.
 *     Центр зоны гистерезиса. Диапазон: любое значение.
 *   - outputHigh (float, по умолчанию 1) — значение выхода при превышении порога.
 *     Может быть любым числом (не обязательно 0 или 1).
 *   - outputLow (float, по умолчанию 0) — значение выхода ниже порога.
 *   - hysteresis (float, по умолчанию 0) — ширина зоны гистерезиса.
 *     0 = простой компаратор без гистерезиса. Положительные значения создают
 *     «мёртвую зону» вокруг порога. Рекомендуемый диапазон: 0–1.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Формирование меандра из синусоиды:
 *      Sine(1000 Гц) → Threshold(threshold: 0) → Oscilloscope
 *      На выходе — прямоугольные импульсы (0/1) с частотой 1 кГц.
 *
 *   2. Триггер Шмитта для зашумлённого сигнала:
 *      Sine + Noise → Threshold(threshold: 0, hysteresis: 0.3) → Oscilloscope
 *      Гистерезис 0.3 устраняет дребезг на фронтах переключения.
 *
 *   3. Уровневый детектор:
 *      AudioFile → Threshold(threshold: 0.5, high: 1, low: -1) → NumericIndicator
 *      Определяет моменты, когда сигнал превышает заданный уровень.
 */

const ThresholdPlugin = {
    type: 'Компаратор',
    id: 'threshold',
    icon: 'dsp-threshold',
    description: 'Пороговый компаратор с гистерезисом',
    group: 'math-blocks',

    signals: {
        input: 'real',
        output: 'real'
    },

    defaultParams: {
        threshold: 0,
        outputHigh: 1,
        outputLow: 0,
        hysteresis: 0
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const threshold = params.threshold ?? 0;
            const high = params.outputHigh ?? 1;
            const low = params.outputLow ?? 0;
            const hyst = params.hysteresis ?? 0;
            const output = new Float32Array(chunkSize);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentState: false });
            }
            const state = this.states.get(nodeId);

            const upperThreshold = threshold + hyst / 2;
            const lowerThreshold = threshold - hyst / 2;

            for (let i = 0; i < chunkSize; i++) {
                if (state.currentState) {
                    if (input[i] < lowerThreshold) {
                        state.currentState = false;
                    }
                } else {
                    if (input[i] > upperThreshold) {
                        state.currentState = true;
                    }
                }
                output[i] = state.currentState ? high : low;
            }

            return output;
        }
    }
};

export default ThresholdPlugin;
