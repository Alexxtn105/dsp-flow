/**
 * Смеситель / Микшер (Mixer) — Перенос спектра сигнала по частоте
 *
 * Назначение:
 *   Умножает входной действительный сигнал на комплексную экспоненту
 *   exp(j·2π·f·t), выполняя перенос (сдвиг) спектра на заданную частоту.
 *   Это ключевая операция в супергетеродинных приёмниках, SDR (Software
 *   Defined Radio) и системах частотного мультиплексирования. На выходе —
 *   комплексный (I/Q) сигнал, представляющий аналитический образ входного
 *   сигнала, сдвинутый по частоте.
 *
 * Алгоритм:
 *   I[n] = x[n] · cos(φ[n])
 *   Q[n] = x[n] · sin(φ[n])
 *   φ[n] = φ[n-1] + 2π · fShift / sampleRate
 *   Фаза непрерывно накапливается от чанка к чанку и нормализуется
 *   в диапазон [0, 2π) для предотвращения потери точности.
 *
 * Параметры:
 *   - shiftFrequency (float, Гц, по умолчанию 1000) — частота сдвига.
 *     Положительные значения — сдвиг вверх по частоте,
 *     отрицательные — вниз. Диапазон: -sampleRate/2 .. +sampleRate/2.
 *
 * Вход:  real (Float32Array)
 * Выход: complex (interleaved Float32Array [I0, Q0, I1, Q1, ...])
 *
 * Примеры использования:
 *
 *   1. Перенос спектра вверх:
 *      Sine(500 Гц) → Mixer(shiftFrequency: 1000 Гц) → SpectrumAnalyzer
 *      На спектре виден пик на 1500 Гц (500+1000) — спектр
 *      сдвинулся вверх на 1000 Гц.
 *
 *   2. Частотное преобразование в приёмнике:
 *      Входной сигнал → Mixer(-fc) → LowpassFIR → Демодулятор
 *      Перенос радиосигнала с частоты fc на нулевую частоту
 *      (baseband) — стандартная операция в SDR-приёмнике.
 *
 *   3. Формирование SSB (однополосной модуляции):
 *      AudioFile → Mixer(1500 Гц) → RealPart → SpectrumAnalyzer
 *      Перенос спектра речи в область ПЧ. Взятие Re-части
 *      даёт действительный сигнал с верхней боковой полосой.
 */

const MixerPlugin = {
    type: 'Смеситель',
    id: 'mixer',
    icon: 'dsp-mixer',
    description: 'Перенос спектра (умножение на exp(j·2π·f·t))',
    group: 'math-blocks',

    signals: {
        input: 'real',
        output: 'complex'
    },

    defaultParams: {
        shiftFrequency: 1000
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            const sampleRate = params.sampleRate ?? 48000;
            const fShift = params.shiftFrequency ?? 1000;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { phase: 0 });
            }
            const state = this.states.get(nodeId);

            const output = new Float32Array(chunkSize * 2);
            const phaseInc = (2 * Math.PI * fShift) / sampleRate;

            for (let i = 0; i < chunkSize; i++) {
                const cosP = Math.cos(state.phase);
                const sinP = Math.sin(state.phase);

                output[i * 2] = input[i] * cosP;
                output[i * 2 + 1] = input[i] * sinP;

                state.phase += phaseInc;
                if (state.phase >= 2 * Math.PI) {
                    state.phase -= 2 * Math.PI;
                }
                if (state.phase < 0) {
                    state.phase += 2 * Math.PI;
                }
            }

            return output;
        }
    }
};

export default MixerPlugin;
