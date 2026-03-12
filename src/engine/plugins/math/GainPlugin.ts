/**
 * Усилитель / Аттенюатор (Gain) — Масштабирование амплитуды сигнала
 *
 * Назначение:
 *   Умножает каждый отсчёт сигнала на заданный коэффициент усиления.
 *   Это простейший, но один из самых часто используемых блоков DSP.
 *   Усилитель применяется для согласования уровней между блоками,
 *   ослабления (аттенюации) сигнала, инвертирования фазы и пересчёта
 *   масштаба. В отличие от АРУ (AGC), здесь усиление постоянное и
 *   задаётся вручную.
 *
 * Алгоритм:
 *   В линейном режиме: y[n] = x[n] · gain · (invert ? -1 : 1)
 *   В режиме дБ: linearGain = 10^(gaindB / 20), затем y[n] = x[n] · linearGain
 *   Формула дБ: 0 дБ = усиление 1× (без изменения), +6 дБ ≈ 2×,
 *   -6 дБ ≈ 0.5×, +20 дБ = 10×, -20 дБ = 0.1×.
 *
 * Параметры:
 *   - gain (float, по умолчанию 1.0) — коэффициент усиления.
 *     В линейном режиме: 0 = тишина, 1.0 = без изменения, 2.0 = удвоение.
 *     В режиме дБ: 0 = без изменения, -6 ≈ половина, +20 = десятикратное.
 *     Диапазон: -100..+100 дБ или 0..100 (linear).
 *   - gainMode (string, по умолчанию 'linear') — единицы измерения:
 *     'linear' — линейный коэффициент (безразмерный);
 *     'dB' — децибелы (логарифмическая шкала, удобна для больших диапазонов).
 *   - invert (bool, по умолчанию false) — инверсия фазы (умножение на -1).
 *     Эквивалент сдвига фазы на 180°. Используется для формирования
 *     противофазного сигнала в дифференциальных схемах.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Ослабление сигнала на 6 дБ:
 *      Sine(1000 Гц) → Gain(-6 дБ, mode: dB) → Oscilloscope
 *      Амплитуда уменьшается примерно вдвое (коэффициент ~0.5).
 *
 *   2. Инверсия фазы:
 *      Sine → Gain(invert: true) → Summer (с оригиналом)
 *      Сумма сигнала и его инвертированной копии даёт ноль —
 *      принцип активного шумоподавления.
 *
 *   3. Согласование уровней:
 *      Слабый сигнал → Gain(10.0, linear) → SpectrumAnalyzer
 *      Усиление в 10 раз перед анализом для лучшей видимости
 *      на спектрограмме.
 */

const GainPlugin = {
    type: 'Усилитель',
    id: 'gain',
    icon: 'dsp-gain',
    description: 'Усилитель / аттенюатор',
    group: 'math-blocks',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        gain: 1.0,
        gainMode: 'linear',
        invert: false
    },

    processor: {
        states: new Map<string, Record<string, never>>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const gainValue = (params.gain ?? 1.0) as number;
            const mode = (params.gainMode ?? 'linear') as string;
            const invert = (params.invert ?? false) as boolean;

            let linearGain;
            if (mode === 'dB') {
                linearGain = Math.pow(10, gainValue / 20);
            } else {
                linearGain = gainValue;
            }

            if (invert) linearGain = -linearGain;

            const output = new Float32Array(chunkSize);
            for (let i = 0; i < chunkSize; i++) {
                output[i] = input[i] * linearGain;
            }

            return output;
        }
    }
};

export default GainPlugin;
