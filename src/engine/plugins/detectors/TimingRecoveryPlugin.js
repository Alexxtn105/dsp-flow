/**
 * Timing Recovery — Символьная (тактовая) синхронизация
 *
 * Назначение:
 *   Восстанавливает оптимальные моменты стробирования (sampling instants)
 *   в цифровом приёмнике. На входе — поток отсчётов с избыточной дискретизацией
 *   (несколько отсчётов на символ), на выходе — по одному отсчёту на символ,
 *   взятому в наилучший момент времени. Это ключевой блок в цепочке демодуляции,
 *   без которого фазовое созвездие будет «размазанным».
 *
 * Алгоритм:
 *   Используется Gardner Timing Error Detector (TED) — некогерентный детектор
 *   ошибки синхронизации, не требующий знания несущей частоты.
 *   Формула ошибки: e = Re{(prev_symbol - current_symbol) * conj(midpoint)},
 *   где midpoint — отсчёт посередине между двумя символами.
 *   Ошибка подаётся в петлевой PI-фильтр (пропорционально-интегральный),
 *   который плавно подстраивает интервал стробирования (период символа).
 *
 * Параметры:
 *   - samplesPerSymbol (int, по умолчанию 4) — количество отсчётов на символ
 *     во входном сигнале. Определяется параметрами модулятора/канала.
 *     Типичные значения: 2, 4, 8.
 *   - loopBandwidth (float, по умолчанию 0.01) — нормированная полоса петли
 *     синхронизации. Меньшие значения → медленнее захват, но точнее слежение.
 *     Большие значения → быстрее захват, но больше джиттер.
 *     Рекомендуемый диапазон: 0.001–0.05.
 *   - damping (float, по умолчанию 0.707) — коэффициент демпфирования петли.
 *     Значение 1/√2 ≈ 0.707 обеспечивает критическое демпфирование (оптимальный
 *     баланс между скоростью и устойчивостью). Обычно не требует настройки.
 *
 * Вход:  complex (interleaved Float32Array [I0, Q0, I1, Q1, ...])
 * Выход: complex (символы в моментах стробирования, ~chunkSize/samplesPerSymbol символов)
 *
 * Примеры использования:
 *
 *   1. Демодуляция QPSK:
 *      PSKModulator(QPSK, sps=4) → канал с шумом →
 *      → TimingRecovery(sps=4, BW=0.01) → PLL → Constellation
 *      Тактовая синхронизация выделяет символы из потока отсчётов,
 *      после чего PLL компенсирует фазовый сдвиг, и на созвездии
 *      видны чёткие 4 точки QPSK.
 *
 *   2. Демодуляция 8-PSK:
 *      PSKModulator(8PSK, sps=8) → BandpassFIR →
 *      → TimingRecovery(sps=8, BW=0.005) → Constellation
 *      При большем количестве точек созвездия рекомендуется снизить
 *      loopBandwidth для уменьшения джиттера стробирования.
 *
 *   3. Анализ качества синхронизации:
 *      PSKModulator → TimingRecovery → Oscilloscope
 *      На осциллографе видно, что выход содержит прореженный сигнал
 *      (в sps раз меньше отсчётов) — по одному на символ.
 *      Амплитуды символов группируются около номинальных значений.
 */

const TimingRecoveryPlugin = {
    type: 'Символьная синхронизация',
    id: 'timing-recovery',
    icon: 'dsp-timing',
    description: 'Timing Recovery (алгоритм Gardner)',
    group: 'detectors',

    signals: {
        input: 'complex',
        output: 'complex'
    },

    defaultParams: {
        samplesPerSymbol: 4,
        loopBandwidth: 0.01,
        damping: 0.707
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            const sps = params.samplesPerSymbol ?? 4;
            const Bn = params.loopBandwidth ?? 0.01;
            const zeta = params.damping ?? 0.707;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    counter: 0,
                    prevI: 0,
                    prevQ: 0,
                    prevMidI: 0,
                    prevMidQ: 0,
                    loopIntegrator: 0,
                    kp: 0,
                    ki: 0,
                    period: sps,
                    lastKey: ''
                });
            }
            const state = this.states.get(nodeId);

            // Пересчёт коэффициентов при изменении параметров
            const key = `${sps}_${Bn}_${zeta}`;
            if (state.lastKey !== key) {
                const theta = Bn / (zeta + 1 / (4 * zeta));
                const d = 1 + 2 * zeta * theta + theta * theta;
                state.kp = (4 * zeta * theta) / d;
                state.ki = (4 * theta * theta) / d;
                state.period = sps;
                state.lastKey = key;
            }

            const output = new Float32Array(chunkSize * 2);
            let outIdx = 0;
            const inputLen = Math.floor(input.length / 2);

            for (let i = 0; i < inputLen && outIdx < chunkSize; i++) {
                const inI = input[i * 2];
                const inQ = input[i * 2 + 1];

                state.counter++;

                // Достигнут момент стробирования
                if (state.counter >= Math.round(state.period)) {
                    // Текущий символ (момент стробирования)
                    const symI = inI;
                    const symQ = inQ;

                    // Gardner TED (Timing Error Detector)
                    // e = Re{(prev - current) * conj(mid)}
                    const diffI = state.prevI - symI;
                    const diffQ = state.prevQ - symQ;
                    const ted = diffI * state.prevMidI + diffQ * state.prevMidQ;

                    // Петлевой фильтр (PI)
                    state.loopIntegrator += state.ki * ted;
                    const loopOut = state.kp * ted + state.loopIntegrator;

                    // Подстройка периода
                    state.period = sps + loopOut;
                    if (state.period < sps * 0.5) state.period = sps * 0.5;
                    if (state.period > sps * 1.5) state.period = sps * 1.5;

                    // Сохраняем предыдущий символ
                    state.prevI = symI;
                    state.prevQ = symQ;

                    // Записываем символ на выход
                    output[outIdx * 2] = symI;
                    output[outIdx * 2 + 1] = symQ;
                    outIdx++;

                    state.counter = 0;
                } else if (state.counter === Math.round(state.period / 2)) {
                    // Середина между символами (для Gardner TED)
                    state.prevMidI = inI;
                    state.prevMidQ = inQ;
                }
            }

            return output;
        }
    }
};

export default TimingRecoveryPlugin;
