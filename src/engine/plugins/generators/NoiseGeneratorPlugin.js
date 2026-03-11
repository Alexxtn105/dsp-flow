/**
 * Генератор шума — Источник случайного сигнала (белый, розовый, красный)
 *
 * Назначение:
 *   Генерирует псевдослучайный шумовой сигнал трёх типов, каждый из которых
 *   имеет свою спектральную характеристику. Шум используется для тестирования
 *   фильтров (подача широкополосного сигнала и наблюдение АЧХ на выходе),
 *   моделирования каналов связи с аддитивным шумом, генерации dithering-сигнала,
 *   а также как источник для исследования статистических свойств.
 *
 * Типы шума и их спектральные характеристики:
 *
 *   - white (белый шум) — плоский спектр, равномерная мощность на всех частотах.
 *     Генерируется как Math.random() * 2 − 1 (равномерное распределение [−1, 1]).
 *     Применение: тестирование АЧХ фильтров, модель AWGN-канала, dithering.
 *
 *   - pink (розовый шум, 1/f) — мощность убывает обратно пропорционально частоте.
 *     На каждую октаву приходится одинаковая мощность (−3 дБ/октава).
 *     Реализация: фильтр Paul Kellet — каскад из 7 IIR-фильтров первого порядка,
 *     аппроксимирующих спектр 1/f в звуковом диапазоне. Выход нормализуется
 *     коэффициентом 0.11 для приведения амплитуды к диапазону ~±1.
 *     Применение: акустические тесты, модель фликкер-шума, психоакустика.
 *
 *   - brown (красный/броуновский шум, 1/f²) — мощность убывает как 1/f²
 *     (−6 дБ/октава). Похож на случайное блуждание (Brownian motion).
 *     Реализация: интеграция белого шума с ограничением: brownLast += white · 0.02,
 *     с клиппингом в [−1, 1] для предотвращения ухода.
 *     Применение: модель низкочастотных флуктуаций, генерация «тёплого» фона.
 *
 * Параметры:
 *   - noiseType (string, по умолчанию 'white') — тип шума: 'white', 'pink', 'brown'.
 *   - amplitude (float, по умолчанию 1.0) — амплитуда (множитель).
 *     Диапазон: 0.0–1.0. Значения > 1.0 допустимы, но могут вызвать клиппинг.
 *
 * Вход:  нет (автономный источник)
 * Выход: real (Float32Array длиной chunkSize)
 *
 * Примеры использования:
 *
 *   1. Визуализация АЧХ фильтра:
 *      NoiseGenerator(white) → LowpassFIR(cutoff 5000 Гц) → SpectrumAnalyzer
 *      Белый шум проходит через фильтр. На спектроанализаторе видна АЧХ фильтра:
 *      ровный уровень до 5 кГц и спад выше.
 *
 *   2. Моделирование шумового канала:
 *      Sine(1000 Гц) + NoiseGenerator(white, амплитуда 0.1) → Summer → Oscilloscope
 *      Синусоида с добавленным белым шумом — модель зашумлённого сигнала.
 *
 *   3. Сравнение спектров шума:
 *      NoiseGenerator(white) → SpectrumAnalyzer (плоский спектр)
 *      NoiseGenerator(pink) → SpectrumAnalyzer (спад 3 дБ/октава)
 *      NoiseGenerator(brown) → SpectrumAnalyzer (спад 6 дБ/октава)
 *
 *   4. Тестирование корреляции:
 *      NoiseGenerator(white) → Correlator
 *      Автокорреляция белого шума даёт дельта-функцию (острый пик при τ=0).
 */

export default {
    type: 'Генератор шума',
    id: 'noise-generator',
    icon: 'dsp-noise',
    description: 'Генератор белого/розового/красного шума',
    group: 'generators',
    signals: { input: null, output: 'real' },
    defaultParams: {
        noiseType: 'white',
        amplitude: 1.0,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const output = new Float32Array(chunkSize);
            const amplitude = params.amplitude ?? 1.0;
            const noiseType = params.noiseType ?? 'white';

            if (!this.states.has(nodeId)) {
                // Состояние для розового шума (алгоритм Voss-McCartney)
                this.states.set(nodeId, {
                    pinkB0: 0, pinkB1: 0, pinkB2: 0,
                    pinkB3: 0, pinkB4: 0, pinkB5: 0, pinkB6: 0,
                    // Состояние для красного (броуновского) шума
                    brownLast: 0
                });
            }
            const state = this.states.get(nodeId);

            for (let i = 0; i < chunkSize; i++) {
                const white = (Math.random() * 2 - 1);

                if (noiseType === 'white') {
                    output[i] = amplitude * white;
                } else if (noiseType === 'pink') {
                    // Фильтр Paul Kellet для розового шума
                    state.pinkB0 = 0.99886 * state.pinkB0 + white * 0.0555179;
                    state.pinkB1 = 0.99332 * state.pinkB1 + white * 0.0750759;
                    state.pinkB2 = 0.96900 * state.pinkB2 + white * 0.1538520;
                    state.pinkB3 = 0.86650 * state.pinkB3 + white * 0.3104856;
                    state.pinkB4 = 0.55000 * state.pinkB4 + white * 0.5329522;
                    state.pinkB5 = -0.7616 * state.pinkB5 - white * 0.0168980;
                    const pink = state.pinkB0 + state.pinkB1 + state.pinkB2
                        + state.pinkB3 + state.pinkB4 + state.pinkB5
                        + state.pinkB6 + white * 0.5362;
                    state.pinkB6 = white * 0.115926;
                    output[i] = amplitude * pink * 0.11; // нормализация ~±1
                } else if (noiseType === 'brown') {
                    // Броуновский (красный) шум: интеграция белого
                    state.brownLast = (state.brownLast + white * 0.02);
                    // Ограничение диапазона
                    if (state.brownLast > 1) state.brownLast = 1;
                    if (state.brownLast < -1) state.brownLast = -1;
                    output[i] = amplitude * state.brownLast;
                }
            }

            return output;
        }
    }
};
