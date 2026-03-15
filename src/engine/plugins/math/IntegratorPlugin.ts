/**
 * Интегратор (Integrator) — Трапецеидальное численное интегрирование
 *
 * Назначение:
 *   Вычисляет накопительную сумму (интеграл) входного сигнала по времени.
 *   В DSP интеграторы используются для преобразования частоты в фазу
 *   (например, в генераторах с числовым управлением — NCO), для
 *   вычисления среднего значения, а также в системах управления (ПИД-
 *   регуляторы). Применяется метод трапеций — более точный, чем простое
 *   суммирование (метод прямоугольников), так как учитывает линейное
 *   изменение сигнала между отсчётами.
 *
 * Алгоритм:
 *   Метод трапеций: y[n] = y[n-1] + (x[n] + x[n-1]) · dt / 2,
 *   где dt = 1/sampleRate — период дискретизации.
 *   При достижении maxValue возможен сброс (reset) или насыщение (clamp),
 *   что предотвращает численное переполнение при длительной работе.
 *
 * Параметры:
 *   - resetOnOverflow (bool, по умолчанию true) — поведение при переполнении:
 *     true — сброс аккумулятора в 0 (пилообразный характер выхода);
 *     false — насыщение на уровне ±maxValue (выход ограничивается).
 *   - maxValue (float, по умолчанию 1000) — порог переполнения.
 *     Определяет максимальное абсолютное значение аккумулятора.
 *     Подбирается в зависимости от амплитуды входного сигнала и sampleRate.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Линейное нарастание (пилообразный сигнал):
 *      Constant(100) → Integrator → Oscilloscope
 *      Постоянный входной сигнал даёт линейно нарастающий выход.
 *      При resetOnOverflow=true — пилообразная волна.
 *
 *   2. Преобразование частоты в фазу:
 *      Частотный сигнал → Integrator → вход фазы для cos/sin
 *      Используется в реализации NCO (численно управляемого осциллятора).
 *
 *   3. Сглаживание сигнала:
 *      Шумовой сигнал → Integrator(maxValue: 10) → Oscilloscope
 *      Интегрирование подавляет высокочастотный шум (действует как ФНЧ).
 */

interface IntegratorState {
    prevInput: number;
    accumulator: number;
}

export default {
    type: 'Интегратор',
    id: 'integrator',
    icon: 'dsp-integrate',
    description: 'Интегратор',
    group: 'real-math',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {
        resetOnOverflow: true,
        maxValue: 1000,
    },
    processor: {
        states: new Map<string, IntegratorState>(),
        clearStates() { this.states.clear(); },

        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number, nodeId?: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            if (!this.states.has(nodeId!)) {
                this.states.set(nodeId!, { prevInput: 0, accumulator: 0 });
            }
            const state = this.states.get(nodeId!)!;

            const sampleRate = (params.sampleRate ?? 48000) as number;
            const dt = 1.0 / sampleRate;
            const resetOnOverflow = (params.resetOnOverflow ?? true) as boolean;
            const maxValue = (params.maxValue ?? 1000) as number;

            const output = new Float32Array(input.length);

            for (let i = 0; i < input.length; i++) {
                // Трапецеидальное интегрирование: y[n] = y[n-1] + (x[n] + x[n-1]) * dt / 2
                state.accumulator += (input[i] + state.prevInput) * dt / 2;
                state.prevInput = input[i];

                if (Math.abs(state.accumulator) > maxValue) {
                    if (resetOnOverflow) {
                        state.accumulator = 0;
                    } else {
                        // Saturation: clamp to maxValue
                        state.accumulator = Math.sign(state.accumulator) * maxValue;
                    }
                }

                output[i] = state.accumulator;
            }

            return output;
        }
    }
};
