/**
 * Абсолютное значение (Absolute Value) — Двухполупериодный выпрямитель
 *
 * Назначение:
 *   Вычисляет модуль (абсолютное значение) каждого отсчёта сигнала: y[n] = |x[n]|.
 *   В аналоговой электронике это эквивалент двухполупериодного выпрямителя —
 *   отрицательные полуволны «отражаются» вверх. Блок применяется для
 *   детектирования огибающей (в сочетании с ФНЧ), измерения мощности
 *   сигнала, а также в нелинейных преобразованиях.
 *
 * Алгоритм:
 *   y[n] = |x[n]| = Math.abs(x[n])
 *   Без параметров, без состояния — чисто комбинационная операция.
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Детектирование огибающей:
 *      Sine(1000 Гц) → AbsoluteValue → LowpassFIR(fc: 100 Гц) → Oscilloscope
 *      Выпрямление + ФНЧ выделяет огибающую (постоянную составляющую)
 *      синусоиды — на выходе примерно 2A/π ≈ 0.637·A.
 *
 *   2. Спектральные эффекты выпрямления:
 *      Sine(1000 Гц) → AbsoluteValue → SpectrumAnalyzer
 *      На спектре вместо одного пика на 1 кГц видны постоянная составляющая
 *      и чётные гармоники (2 кГц, 4 кГц, ...) — результат нелинейного
 *      преобразования.
 *
 *   3. Измерение уровня сигнала:
 *      AudioFile → AbsoluteValue → Integrator → NumericIndicator
 *      Показывает среднее абсолютное значение (MAV) аудиосигнала.
 */
export default {
    type: 'Абсолютное значение',
    id: 'absolute-value',
    icon: 'dsp-abs',
    description: 'Модуль (абсолютное значение) сигнала',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const output = new Float32Array(chunkSize);
            for (let i = 0; i < chunkSize; i++) {
                output[i] = Math.abs(i < input.length ? input[i] : 0);
            }

            return output;
        }
    }
};
