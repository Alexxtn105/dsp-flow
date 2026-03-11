/**
 * Частотный детектор — Измерение мгновенной частоты с полосовой фильтрацией
 *
 * Назначение:
 *   Определяет мгновенную частоту комплексного сигнала и выделяет только
 *   компоненты, попадающие в заданную полосу пропускания вокруг центральной
 *   частоты. Это полезно, когда нужно отслеживать частоту конкретной
 *   спектральной компоненты в сигнале, игнорируя шум и помехи за пределами
 *   полосы.
 *
 * Алгоритм:
 *   1. Из комплексного отсчёта z[n] = I + jQ извлекается фаза: φ[n] = atan2(Q, I)
 *   2. Разность фаз с развёрткой (unwrapping): Δφ = unwrap(φ[n] − φ[n−1])
 *      Функция unwrapPhaseDelta корректирует скачки фазы через ±π.
 *   3. Мгновенная частота: f = Δφ · sampleRate / (2π) [Гц]
 *   4. Отклонение от центральной: deviation = f − centerFrequency
 *   5. Полосовая фильтрация: если |deviation| > bandwidth/2, выход = 0.
 *      Это эквивалент жёсткого окна (прямоугольного фильтра) по частоте.
 *   6. Результат масштабируется на коэффициент чувствительности: out = deviation × sensitivity
 *
 *   Защита от деления на ноль: при магнитуде |z| < 1e-10 выход обнуляется.
 *
 * Параметры:
 *   - centerFrequency (float, по умолчанию 1000, Гц) — центральная частота
 *     детектора. Выход показывает отклонение от этого значения.
 *     Рекомендуемый диапазон: 0–sampleRate/2.
 *   - bandwidth (float, по умолчанию 100, Гц) — ширина полосы пропускания.
 *     Отсчёты с отклонением больше bandwidth/2 обнуляются.
 *     Узкая полоса (10–50 Гц) — точное слежение за одной частотой.
 *     Широкая полоса (200–1000 Гц) — допуск большей девиации.
 *     Рекомендуемый диапазон: 1–10000 Гц.
 *   - sensitivity (float, по умолчанию 1.0) — коэффициент усиления выхода.
 *     Масштабирует значение отклонения. Значения > 1 усиливают,
 *     значения < 1 ослабляют выходной сигнал.
 *     Рекомендуемый диапазон: 0.01–100.
 *
 * Отличие от FrequencyDiscriminator:
 *   FrequencyDiscriminator выдаёт «сырую» мгновенную частоту без фильтрации —
 *   полезен для широкополосного анализа. FrequencyDetector добавляет полосовую
 *   фильтрацию и масштабирование — полезен для слежения за конкретной частотой
 *   в зашумлённом сигнале.
 *
 * Вход:  complex (interleaved Float32Array [I0, Q0, I1, Q1, ...])
 * Выход: real (Float32Array) — отклонение частоты от центральной (Гц × sensitivity)
 *
 * Примеры использования:
 *
 *   1. Слежение за частотой синусоиды:
 *      RefSine(1000) → ComplexComposer → FrequencyDetector(fc=1000, BW=100)
 *      → Oscilloscope
 *      Выход около нуля (синусоида точно на центральной частоте).
 *      При изменении частоты RefSine на осциллографе появится отклонение.
 *
 *   2. Детекция ЧМ-модуляции в узкой полосе:
 *      AMFMPMModulator(FM, fc=1000, dev=30) → HilbertTransformer
 *      → FrequencyDetector(fc=1000, BW=100, sens=1.0) → Oscilloscope
 *      Детектор пропускает девиацию ±30 Гц (в пределах полосы ±50 Гц).
 *      На осциллографе — восстановленный модулирующий сигнал.
 *
 *   3. Селективное измерение:
 *      [сигнал с несколькими тонами] → FrequencyDetector(fc=500, BW=50)
 *      → NumericIndicator
 *      Детектор реагирует только на компоненту вблизи 500 Гц,
 *      игнорируя остальные частоты в сигнале.
 */
import { unwrapPhaseDelta } from '../_shared/SignalUtils.js';

export default {
    type: 'Частотный детектор',
    id: 'frequency-detector',
    icon: 'dsp-freq-detect',
    description: 'Частотный детектор',
    group: 'detectors',
    signals: { input: 'complex', output: 'real' },
    defaultParams: {
        centerFrequency: 1000,
        bandwidth: 100,
        sensitivity: 1.0,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { prevPhase: 0 });
            }
            const state = this.states.get(nodeId);

            const sampleRate = params.sampleRate ?? 48000;
            const centerFreq = params.centerFrequency ?? 1000;
            const bandwidth = params.bandwidth ?? 100;
            const sensitivity = params.sensitivity ?? 1.0;
            const halfBw = bandwidth / 2;

            // Interleaved I/Q: input.length = chunkSize * 2, выход = chunkSize
            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                const I = input[i * 2];
                const Q = input[i * 2 + 1];

                // M5: Обработка нулевой магнитуды — фаза неопределена
                const mag = Math.hypot(I, Q);
                if (mag < 1e-10) {
                    output[i] = 0;
                    continue;
                }

                const phase = Math.atan2(Q, I);

                // Разность фаз с unwrapping
                const dPhase = unwrapPhaseDelta(phase - state.prevPhase);
                state.prevPhase = phase;

                // Мгновенная частота = dPhase * sampleRate / (2 * pi)
                const instFreq = dPhase * sampleRate / (2 * Math.PI);

                // Отклонение от центральной частоты
                const deviation = instFreq - centerFreq;

                // Обнуление если вне полосы пропускания
                if (Math.abs(deviation) > halfBw) {
                    output[i] = 0;
                } else {
                    output[i] = deviation * sensitivity;
                }
            }

            return output;
        }
    }
};
