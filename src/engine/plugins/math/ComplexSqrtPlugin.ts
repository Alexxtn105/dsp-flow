/**
 * Комплексный квадратный корень (Complex Sqrt) — Извлечение √z
 *
 * Назначение:
 *   Вычисляет квадратный корень комплексного числа через полярное
 *   представление: √z = √|z| · exp(jθ/2). Эта операция делит фазовые
 *   углы пополам — обратная операция к ComplexSquare. Используется
 *   в схемах восстановления несущей, где после квадрирования (удвоения
 *   частоты) необходимо вернуться к исходной частоте делением на 2.
 *
 * Алгоритм:
 *   r = sqrt(Re² + Im²)         — модуль
 *   θ = atan2(Im, Re)           — аргумент (фаза)
 *   Re_out = √r · cos(θ/2)     — действительная часть корня
 *   Im_out = √r · sin(θ/2)     — мнимая часть корня
 *   Возвращается главное значение корня (ветвь с θ/2 ∈ [-π/2, π/2]).
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  complex (interleaved Float32Array [Re0, Im0, Re1, Im1, ...])
 * Выход: complex (interleaved Float32Array)
 *
 * Примеры использования:
 *
 *   1. Деление частоты пополам:
 *      ComplexSquare → ComplexSqrt → Constellation
 *      Проверка: квадрирование с последующим извлечением корня
 *      должно вернуть исходный сигнал (с возможной 180°-неоднозначностью).
 *
 *   2. Восстановление несущей (вторая ступень):
 *      BPSK → ComplexSquare → PLL(2·fc) → ComplexSqrt
 *      PLL захватывает удвоенную несущую, ComplexSqrt возвращает
 *      её к исходной частоте fc.
 *
 *   3. Нелинейное преобразование амплитуды:
 *      Сигнал → ComplexSqrt → ComplexMagnitude → Oscilloscope
 *      Амплитуда на выходе = √|z| — сжатие динамического диапазона
 *      (аналог гамма-коррекции с γ=0.5).
 */
export default {
    type: 'Комплексный корень',
    id: 'complex-sqrt',
    icon: 'dsp-sqrt',
    description: 'Извлечение квадратного корня из комплексного сигнала',
    group: 'complex-math',
    signals: { input: 'complex', output: 'complex' } as const,
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            const numSamples = input.length >> 1;
            const output = new Float32Array(input.length);

            // sqrt(Re + j*Im): r = sqrt(Re^2 + Im^2), theta = atan2(Im, Re)
            // result = sqrt(r) * (cos(theta/2) + j*sin(theta/2))
            for (let i = 0; i < numSamples; i++) {
                const re = input[i * 2];
                const im = input[i * 2 + 1];
                const r = Math.sqrt(re * re + im * im);
                const theta = Math.atan2(im, re);
                const sqrtR = Math.sqrt(r);
                const halfTheta = theta * 0.5;
                output[i * 2] = sqrtR * Math.cos(halfTheta);
                output[i * 2 + 1] = sqrtR * Math.sin(halfTheta);
            }

            return output;
        }
    }
};
