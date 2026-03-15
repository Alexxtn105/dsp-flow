/**
 * Комплексный перемножитель (Complex Multiplier) — Умножение двух комплексных сигналов
 *
 * Назначение:
 *   Перемножает два комплексных сигнала поэлементно. Комплексное умножение
 *   складывает фазы и перемножает амплитуды: если z1 = A·exp(jφ1) и
 *   z2 = B·exp(jφ2), то z1·z2 = A·B·exp(j(φ1+φ2)). Это фундаментальная
 *   операция для частотного преобразования (смешивания), фазового вращения,
 *   корреляции и работы NCO (численно управляемого осциллятора).
 *
 * Алгоритм:
 *   (a + jb) · (c + jd) = (ac - bd) + j(ad + bc)
 *   Re_out[n] = Re1[n]·Re2[n] - Im1[n]·Im2[n]
 *   Im_out[n] = Re1[n]·Im2[n] + Im1[n]·Re2[n]
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  complex (2 входа, interleaved Float32Array)
 * Выход: complex (interleaved Float32Array)
 *
 * Примеры использования:
 *
 *   1. Частотное преобразование (перенос спектра):
 *      Сигнал × NCO(RefSine) → ComplexMultiplier → SpectrumAnalyzer
 *      Умножение на комплексную экспоненту сдвигает спектр
 *      сигнала на частоту NCO (аналог Mixer для комплексных сигналов).
 *
 *   2. Фазовое вращение:
 *      Сигнал × Constant(cos(φ)+j·sin(φ)) → ComplexMultiplier
 *      Поворот всех точек созвездия на угол φ — используется
 *      в PLL для компенсации фазового сдвига.
 *
 *   3. Взаимная корреляция:
 *      Сигнал_A × ComplexConjugate(Сигнал_B) → ComplexMultiplier → FFT
 *      Произведение z1·conj(z2) в частотной области эквивалентно
 *      взаимной корреляции во временной области.
 */
export default {
    type: 'Комплексный перемножитель',
    id: 'complex-multiplier',
    icon: 'dsp-multiply',
    description: 'Перемножение двух комплексных сигналов',
    group: 'complex-math',
    signals: { input: 'complex', output: 'complex', inputsCount: 2 } as const,
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const a = inputs[0];
            const b = inputs[1];
            if (!a || !b) return new Float32Array(a ? a.length : b ? b.length : chunkSize * 2);

            const len = a.length;
            const output = new Float32Array(len);

            // (aRe + j*aIm) * (bRe + j*bIm) = (aRe*bRe - aIm*bIm) + j*(aRe*bIm + aIm*bRe)
            const numSamples = len >> 1;
            for (let i = 0; i < numSamples; i++) {
                const aRe = a[i * 2];
                const aIm = a[i * 2 + 1];
                const bRe = b[i * 2];
                const bIm = b[i * 2 + 1];
                output[i * 2] = aRe * bRe - aIm * bIm;
                output[i * 2 + 1] = aRe * bIm + aIm * bRe;
            }

            return output;
        }
    }
};
