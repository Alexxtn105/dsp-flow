/**
 * Комплексный квадрат (Complex Square) — Возведение в квадрат z²
 *
 * Назначение:
 *   Возводит комплексный сигнал в квадрат: z² = (Re + jIm)².
 *   Эта операция удваивает фазовые углы всех точек на комплексной
 *   плоскости, что является ключевым свойством для обработки
 *   модулированных сигналов. Для BPSK-сигнала (фазы 0 и π)
 *   квадрирование «схлопывает» обе точки в одну (фазы 0 и 2π = 0),
 *   что позволяет восстановить несущую частоту. Для QPSK — снимает
 *   двухкратную неоднозначность (4 точки → 2 точки).
 *
 * Алгоритм:
 *   Re_out = Re² - Im²
 *   Im_out = 2 · Re · Im
 *   Эквивалентно в полярных координатах: |z²| = |z|², arg(z²) = 2·arg(z).
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  complex (interleaved Float32Array [Re0, Im0, Re1, Im1, ...])
 * Выход: complex (interleaved Float32Array)
 *
 * Примеры использования:
 *
 *   1. Восстановление несущей BPSK:
 *      BPSK-сигнал → ComplexSquare → BandpassFIR(2·fc) → SpectrumAnalyzer
 *      Квадрирование устраняет BPSK-модуляцию (±1), на частоте 2·fc
 *      появляется спектральная линия.
 *
 *   2. Петля Костаса (Costas Loop):
 *      Сигнал → ComplexSquare → PLL → ComplexSqrt
 *      ComplexSquare снимает модуляцию BPSK, PLL захватывает
 *      удвоенную несущую, ComplexSqrt делит частоту пополам.
 *
 *   3. Снятие QPSK-неоднозначности:
 *      QPSK → ComplexSquare → Constellation
 *      4 точки QPSK преобразуются в 2 точки (BPSK-подобный
 *      сигнал), упрощая дальнейшую синхронизацию.
 */
export default {
    type: 'Комплексный квадрат',
    id: 'complex-square',
    icon: 'dsp-square',
    description: 'Возведение комплексного сигнала в квадрат',
    group: 'complex-math',
    signals: { input: 'complex', output: 'complex' } as const,
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            const numSamples = input.length >> 1;
            const output = new Float32Array(input.length);

            // (Re + j*Im)^2 = (Re^2 - Im^2) + j*(2*Re*Im)
            for (let i = 0; i < numSamples; i++) {
                const re = input[i * 2];
                const im = input[i * 2 + 1];
                output[i * 2] = re * re - im * im;
                output[i * 2 + 1] = 2 * re * im;
            }

            return output;
        }
    }
};
