/**
 * Частотный дискриминатор — Извлечение мгновенной частоты из комплексного сигнала
 *
 * Назначение:
 *   Вычисляет мгновенную частоту комплексного (аналитического) сигнала путём
 *   дифференцирования фазы. В отличие от FrequencyDetector, этот блок выдаёт
 *   «сырое» значение частоты без фильтрации по полосе, что делает его
 *   универсальным инструментом для анализа частотных характеристик.
 *
 *   Мгновенная частота — это скорость изменения фазы сигнала в данный момент
 *   времени. Для синусоиды с постоянной частотой мгновенная частота постоянна
 *   и равна частоте синусоиды. Для ЧМ-сигнала она изменяется во времени,
 *   повторяя форму модулирующего сигнала.
 *
 * Алгоритм:
 *   1. Из комплексного отсчёта z[n] = I + jQ извлекается фаза: φ[n] = atan2(Q, I)
 *   2. Вычисляется разность фаз: Δφ = φ[n] − φ[n−1]
 *   3. Производится развёртка фазы (phase unwrapping): если |Δφ| > π,
 *      корректируем на ±2π, чтобы избежать скачков при переходе через ±π.
 *   4. Мгновенная частота: f = Δφ · sampleRate / (2π) [Гц]
 *
 *   Защита от деления на ноль: при магнитуде |z| < 1e-10 выход обнуляется,
 *   так как фаза при нулевом сигнале не определена.
 *
 * Параметры:
 *   - outputMode (string, по умолчанию 'deviation') — режим выхода:
 *     'deviation' — отклонение от центральной частоты (f − centerFrequency).
 *       Удобно для анализа ЧМ-модуляции, когда нужно видеть только девиацию.
 *     'absolute' — абсолютное значение мгновенной частоты в Гц.
 *       Удобно для общего анализа частоты сигнала.
 *   - centerFrequency (float, по умолчанию 1000, Гц) — центральная частота,
 *     вычитаемая в режиме 'deviation'. Задайте частоту несущей, чтобы на выходе
 *     получить только отклонение.
 *     Рекомендуемый диапазон: 0–sampleRate/2.
 *
 * Отличие от FrequencyDetector:
 *   FrequencyDetector имеет полосовую фильтрацию (обнуляет выход вне заданной
 *   полосы bandwidth) и коэффициент чувствительности. FrequencyDiscriminator
 *   выдаёт нефильтрованное значение частоты — полезно для широкополосного
 *   анализа и ЧМ-демодуляции, где нужен полный диапазон девиации.
 *
 * Вход:  complex (interleaved Float32Array [I0, Q0, I1, Q1, ...])
 * Выход: real (Float32Array) — мгновенная частота (Гц или отклонение в Гц)
 *
 * Примеры использования:
 *
 *   1. Демодуляция ЧМ-сигнала:
 *      AMFMPMModulator(FM, fc=1000, dev=200) → HilbertTransformer
 *      → FrequencyDiscriminator(deviation, fc=1000) → Oscilloscope
 *      На осциллографе видно отклонение частоты, повторяющее форму
 *      модулирующего сигнала с амплитудой ±200 Гц.
 *
 *   2. Измерение абсолютной частоты:
 *      RefSine(1000) → FrequencyDiscriminator(absolute) → NumericIndicator
 *      Индикатор показывает значение ~1000 Гц (мгновенная частота синусоиды).
 *
 *   3. Анализ частотной нестабильности:
 *      RefSine(1000) → ComplexComposer → FrequencyDiscriminator(absolute)
 *      → Oscilloscope
 *      Позволяет увидеть флуктуации частоты генератора на осциллографе.
 */
export default {
    type: 'Частотный дискриминатор',
    id: 'frequency-discriminator',
    icon: 'dsp-freq-discrim',
    description: 'Мгновенная частота из производной фазы (без фильтрации и масштабирования)',
    group: 'detectors',
    signals: { input: 'complex', output: 'real' },
    defaultParams: {
        outputMode: 'deviation',
        centerFrequency: 1000,
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
            const outputMode = params.outputMode ?? 'deviation';
            const centerFreq = params.centerFrequency ?? 1000;

            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                const I = input[i * 2];
                const Q = input[i * 2 + 1];

                const mag = Math.hypot(I, Q);
                if (mag < 1e-10) {
                    output[i] = 0;
                    continue;
                }

                const phase = Math.atan2(Q, I);

                let dPhase = phase - state.prevPhase;
                while (dPhase > Math.PI) dPhase -= 2 * Math.PI;
                while (dPhase < -Math.PI) dPhase += 2 * Math.PI;
                state.prevPhase = phase;

                // Мгновенная частота (Гц)
                const instFreq = dPhase * sampleRate / (2 * Math.PI);

                output[i] = outputMode === 'absolute'
                    ? instFreq
                    : instFreq - centerFreq;
            }

            return output;
        }
    }
};
