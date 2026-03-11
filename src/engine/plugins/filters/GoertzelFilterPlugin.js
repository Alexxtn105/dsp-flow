/**
 * Фильтр Гёрцеля (Goertzel) — обнаружение одной частоты в сигнале
 *
 * Назначение:
 *   Вычисляет мощность (магнитуду) сигнала на одной заданной частоте.
 *   Это аналог одного «бина» (ячейки) ДПФ/БПФ, но значительно
 *   эффективнее, когда нужно проанализировать лишь одну-две частоты,
 *   а не весь спектр. Классические применения: детектирование DTMF-тонов,
 *   определение наличия пилот-тона, измерение уровня сигнала на
 *   конкретной частоте, простейший частотный анализ.
 *
 * Алгоритм:
 *   Алгоритм Гёрцеля — рекурсивный метод вычисления одного элемента ДПФ.
 *   Вместо вычисления всех N частотных бинов (как в БПФ), считается только один.
 *   На каждом отсчёте обновляются два состояния s1 и s2 по формуле:
 *     s0 = x[n] + coeff * s1 - s2,  где coeff = 2*cos(2π*k/N)
 *   После накопления N отсчётов вычисляется результат:
 *     Re = s1 - s2*cos(2π*k/N),  Im = s2*sin(2π*k/N)
 *     magnitude = sqrt(Re² + Im²) / (N/2)
 *   Затем состояния сбрасываются и начинается новый блок.
 *
 *   Вычислительная сложность: O(N) на блок для одной частоты,
 *   тогда как БПФ потребовало бы O(N*log(N)) для всех частот.
 *
 * Параметры:
 *   - targetFrequency (float, по умолчанию 1000) — частота анализа в Гц.
 *     Именно на этой частоте измеряется мощность сигнала.
 *     Допустимый диапазон: 0 .. sampleRate/2.
 *   - N (int, по умолчанию 256) — размер блока анализа (количество
 *     отсчётов для одного вычисления). Определяет частотное разрешение:
 *     Δf = sampleRate / N. Например, при sampleRate=48000 и N=256
 *     разрешение = 187.5 Гц. Больший N → лучшее разрешение, но
 *     медленнее обновление. Рекомендуемый диапазон: 64–4096.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array) — магнитуда на целевой частоте (обновляется каждые N отсчётов)
 *
 * Примеры использования:
 *
 *   1. Измерение мощности тона:
 *      Sine(1000, amplitude=0.5) → Goertzel(1000Hz, N=256) → NumericIndicator
 *      Индикатор покажет значение ~0.5 (амплитуда синусоиды на 1 кГц).
 *
 *   2. Детектирование наличия сигнала:
 *      AudioFile → Goertzel(440Hz, N=1024) → Threshold(0.1) → NumericIndicator
 *      Определяет, присутствует ли в сигнале нота «Ля» первой октавы (440 Гц).
 *
 *   3. Сравнение с полным спектром:
 *      Sine(1000) → Goertzel(1000Hz) → Oscilloscope  (быстро, одна частота)
 *      Sine(1000) → SpectrumAnalyzer                  (медленнее, весь спектр)
 *      Goertzel эффективнее, когда интересует только одна частота.
 */
export default {
    type: 'Фильтр Герцеля',
    id: 'goertzel-filter',
    icon: 'dsp-goertzel',
    description: 'Фильтр Герцеля',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        targetFrequency: 1000,
        N: 256,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { s1: 0, s2: 0, count: 0, magnitude: 0 });
            }
            const state = this.states.get(nodeId);

            const sampleRate = params.sampleRate ?? 48000;
            const targetFreq = Math.min(params.targetFrequency ?? 1000, sampleRate / 2);
            const N = params.N ?? 256;

            const k = Math.min(Math.max(0, Math.floor(N * targetFreq / sampleRate)), N - 1);
            const coeff = 2 * Math.cos(2 * Math.PI * k / N);

            const output = new Float32Array(input.length);

            const cosW = Math.cos(2 * Math.PI * k / N);
            const sinW = Math.sin(2 * Math.PI * k / N);

            for (let i = 0; i < input.length; i++) {
                const s0 = input[i] + coeff * state.s1 - state.s2;
                state.s2 = state.s1;
                state.s1 = s0;
                state.count++;

                if (state.count >= N) {
                    // Вычисляем магнитуду по формуле Гёрцеля, нормализуем на N/2
                    const real = state.s1 - state.s2 * cosW;
                    const imag = state.s2 * sinW;
                    state.magnitude = Math.sqrt(real * real + imag * imag) / (N / 2);
                    // Сброс
                    state.s1 = 0;
                    state.s2 = 0;
                    state.count = 0;
                } else if (state.magnitude === 0 && state.count > 0) {
                    // До первого полного блока: промежуточная магнитуда (нормализуем на count/2)
                    const real = state.s1 - state.s2 * cosW;
                    const imag = state.s2 * sinW;
                    state.magnitude = Math.sqrt(real * real + imag * imag) / (state.count / 2);
                }

                output[i] = state.magnitude;
            }

            return output;
        }
    }
};
