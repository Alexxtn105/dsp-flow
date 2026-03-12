/**
 * Фаза комплексного сигнала (Complex Phase) — Вычисление аргумента arg(z)
 *
 * Назначение:
 *   Извлекает мгновенную фазу комплексного сигнала: arg(z) = atan2(Im, Re).
 *   Преобразует комплексный сигнал в действительный, сохраняя информацию
 *   о фазе и отбрасывая амплитуду. Мгновенная фаза — ключевое понятие
 *   в фазовой и частотной модуляции/демодуляции: производная фазы
 *   по времени даёт мгновенную частоту, а скачки фазы несут информацию
 *   в PSK-модуляции.
 *
 * Алгоритм:
 *   y[n] = atan2(Im[n], Re[n])
 *   Результат в радианах: от -π до +π.
 *   Фаза «оборачивается» (wrapping) при переходе через ±π.
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  complex (interleaved Float32Array [Re0, Im0, Re1, Im1, ...])
 * Выход: real (Float32Array, значения в радианах [-π, π])
 *
 * Примеры использования:
 *
 *   1. Визуализация фазового нарастания:
 *      RefSine(1000 Гц) → ComplexPhase → Oscilloscope
 *      На осциллографе видна «пилообразная» волна — фаза линейно
 *      нарастает от -π до π, затем «перескакивает» (wrapping).
 *
 *   2. Фазовая демодуляция (PSK):
 *      PSK-сигнал → PLL → ComplexPhase → Oscilloscope
 *      После синхронизации фаза принимает дискретные значения
 *      (например, 0, π/2, π, 3π/2 для QPSK).
 *
 *   3. Вычисление мгновенной частоты:
 *      Сигнал → ComplexPhase → производная (diff) → масштаб
 *      Разность фаз соседних отсчётов, делённая на 2π·dt,
 *      даёт мгновенную частоту сигнала в Гц.
 */
export default {
    type: 'Фаза (комплексная)',
    id: 'complex-phase',
    icon: 'dsp-phase',
    description: 'Извлечение фазы комплексного сигнала (atan2)',
    group: 'math-blocks',
    signals: { input: 'complex', output: 'real' } as const,
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                output[i] = Math.atan2(input[i * 2 + 1], input[i * 2]);
            }

            return output;
        }
    }
};
