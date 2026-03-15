/**
 * Квадрат действительного сигнала (Real Square) — Возведение в квадрат x²
 *
 * Назначение:
 *   Возводит каждый отсчёт действительного сигнала в квадрат: y[n] = x[n]².
 *   Квадрирование — важная нелинейная операция в DSP. Для синусоиды
 *   cos(2πft) результат содержит постоянную составляющую и гармонику
 *   на удвоенной частоте 2f (по тождеству cos²(α) = (1 + cos(2α))/2).
 *   Это свойство используется для удвоения частоты и детектирования
 *   мощности.
 *
 * Алгоритм:
 *   y[n] = x[n] · x[n]
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
 *   1. Удвоение частоты:
 *      Sine(1000 Гц) → RealSquare → SpectrumAnalyzer
 *      На спектре виден пик на 2000 Гц (и постоянная составляющая).
 *      Используется для восстановления несущей из BPSK-сигнала.
 *
 *   2. Оценка мощности:
 *      Сигнал → RealSquare → LowpassFIR → NumericIndicator
 *      Среднее значение x² — это среднеквадратичная мощность сигнала.
 *
 *   3. Восстановление несущей (BPSK):
 *      BPSK-сигнал → RealSquare → BandpassFIR(2·fc) → Oscilloscope
 *      Квадрирование устраняет модуляцию ±1, оставляя компоненту на 2·fc,
 *      из которой делением частоты на 2 восстанавливается несущая.
 */
export default {
    type: 'Квадрат (действ.)',
    id: 'real-square',
    icon: 'dsp-square',
    description: 'Возведение действительного сигнала в квадрат',
    group: 'real-math',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const output = new Float32Array(chunkSize);
            for (let i = 0; i < chunkSize; i++) {
                const v = i < input.length ? input[i] : 0;
                output[i] = v * v;
            }

            return output;
        }
    }
};
