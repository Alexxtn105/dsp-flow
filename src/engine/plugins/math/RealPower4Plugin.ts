/**
 * Степень 4 действительного сигнала (Real Power 4) — Возведение в четвёртую степень x⁴
 *
 * Назначение:
 *   Возводит каждый отсчёт действительного сигнала в четвёртую степень:
 *   y[n] = x[n]⁴. Эта нелинейная операция широко применяется в методах
 *   спектральных линий (spectral line methods) для восстановления несущей
 *   частоты из сигналов с фазовой модуляцией. Если входной сигнал имеет
 *   M-PSK модуляцию с M=4 (QPSK), возведение в 4-ю степень устраняет
 *   фазовую модуляцию (все точки созвездия «схлопываются» в одну),
 *   и на частоте 4·fc появляется спектральная линия.
 *
 * Алгоритм:
 *   y[n] = x[n]² · x[n]² (два последовательных умножения для эффективности)
 *   Без параметров, без состояния.
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Восстановление несущей QPSK:
 *      QPSK-сигнал → RealPower4 → SpectrumAnalyzer
 *      На спектре появляется выраженный пик на частоте 4×fc (четырёхкратная
 *      несущая), который можно отфильтровать и поделить частоту на 4.
 *
 *   2. Анализ модуляции:
 *      Неизвестный сигнал → RealPower4 → SpectrumAnalyzer
 *      Если виден пик на 4×f — вероятно, сигнал модулирован QPSK/4-QAM.
 *      Пик на 2×f — BPSK, на 8×f — 8-PSK.
 *
 *   3. Цепочка с делением частоты:
 *      QPSK → RealPower4 → BandpassFIR(4·fc) → частотный делитель ÷4
 *      Классическая схема слепого восстановления несущей в демодуляторе.
 */
export default {
    type: 'Степень 4 (действ.)',
    id: 'real-power4',
    icon: 'dsp-power4',
    description: 'Возведение действительного сигнала в 4-ю степень',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const output = new Float32Array(chunkSize);
            for (let i = 0; i < chunkSize; i++) {
                const v = i < input.length ? input[i] : 0;
                const v2 = v * v;
                output[i] = v2 * v2;
            }

            return output;
        }
    }
};
