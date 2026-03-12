/**
 * Комплексный сумматор (Complex Summer) — Сложение двух комплексных сигналов
 *
 * Назначение:
 *   Складывает два комплексных сигнала поэлементно: действительные части
 *   складываются отдельно, мнимые — отдельно. Это комплексный аналог
 *   обычного сумматора (Summer). Применяется для комбинирования
 *   I/Q-сигналов, суммирования каналов в многоканальных системах,
 *   формирования суммарных и разностных диаграмм в антенных решётках.
 *
 * Алгоритм:
 *   Re_out[n] = Re1[n] + Re2[n]
 *   Im_out[n] = Im1[n] + Im2[n]
 *   Если один из входов не подключён, его вклад равен нулю.
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  complex (2 входа, interleaved Float32Array)
 * Выход: complex (interleaved Float32Array)
 *
 * Примеры использования:
 *
 *   1. Сложение двух комплексных сигналов:
 *      RefSine(1000 Гц) + RefSine(3000 Гц) → ComplexSummer → SpectrumAnalyzer
 *      На спектре видны два пика — суперпозиция комплексных синусоид.
 *
 *   2. Добавление шума к сигналу:
 *      Сигнал + Комплексный_шум → ComplexSummer → Constellation
 *      Моделирование зашумлённого канала связи — точки созвездия
 *      «размываются» вокруг номинальных позиций.
 *
 *   3. Формирование суммарного канала:
 *      Антенна_1 + Антенна_2 → ComplexSummer → Демодулятор
 *      Когерентное сложение сигналов от нескольких антенн
 *      для повышения отношения сигнал/шум (diversity combining).
 */
export default {
    type: 'Комплексный сумматор',
    id: 'complex-summer',
    icon: 'dsp-sum',
    description: 'Сложение двух комплексных сигналов',
    group: 'math-blocks',
    signals: { input: 'complex', output: 'complex', inputsCount: 2 },
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const a = inputs[0];
            const b = inputs[1];

            if (!a && !b) return new Float32Array(chunkSize * 2);
            if (!a) return new Float32Array(b);
            if (!b) return new Float32Array(a);

            const len = a.length;
            const output = new Float32Array(len);

            for (let i = 0; i < len; i++) {
                output[i] = a[i] + (i < b.length ? b[i] : 0);
            }

            return output;
        }
    }
};
