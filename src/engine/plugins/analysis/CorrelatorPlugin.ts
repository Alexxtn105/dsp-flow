/**
 * Correlator — Взаимная корреляция двух сигналов
 *
 * Назначение:
 *   Взаимная корреляция (cross-correlation) — это мера сходства двух сигналов
 *   как функция временного сдвига (лага) между ними. Представьте, что вы
 *   «скользите» один сигнал вдоль другого и на каждом шаге считаете, насколько
 *   они похожи. Пик корреляционной функции указывает на лаг, при котором
 *   сигналы максимально совпадают.
 *
 *   Типичные применения:
 *   - Оценка временной задержки (time delay estimation): если один сигнал —
 *     задержанная копия другого, пик корреляции покажет величину задержки.
 *   - Обнаружение сигнала в шуме: корреляция с эталонным сигналом (matched filter)
 *     выделяет полезный сигнал даже при низком отношении сигнал/шум.
 *   - Измерение сходства: нормализованный коэффициент корреляции показывает
 *     степень линейной зависимости между сигналами (от -1 до +1).
 *
 * Алгоритм:
 *   Используется быстрый метод через БПФ: R(τ) = IFFT(FFT(x₁) · conj(FFT(x₂))),
 *   что даёт сложность O(N·log N) вместо O(N²) при прямом вычислении.
 *   Шаги:
 *   1. Если включена нормализация — вычитаются средние значения обоих сигналов
 *      и рассчитываются их энергии для последующего деления.
 *   2. Сигналы дополняются нулями до ближайшей степени двойки (zero-padding)
 *      для корректной линейной (а не циклической) корреляции.
 *   3. Вычисляются FFT(x₁) и FFT(x₂), затем поэлементное произведение
 *      FFT(x₁) · conj(FFT(x₂)), затем обратное БПФ.
 *   4. Результат нормализуется: делится на sqrt(E₁ · E₂), где E — энергия сигнала.
 *   5. Выходной массив центрирован: лаг 0 находится в середине,
 *      отрицательные лаги — слева, положительные — справа.
 *
 * Параметры:
 *   - normalize (boolean, по умолчанию true) — нормализация корреляции.
 *     При включении: вычитаются средние (убирается постоянная составляющая),
 *     результат делится на sqrt(E₁·E₂). Выходные значения в диапазоне [-1, +1],
 *     где +1 означает полное совпадение, 0 — отсутствие связи, -1 — противофазу.
 *     При выключении: выход — «сырая» корреляция (произведение амплитуд).
 *   - maxLag (int, по умолчанию 0) — максимальный лаг для вычисления.
 *     0 = полный диапазон (все лаги от -chunkSize/2 до +chunkSize/2).
 *     Ограничение лага ускоряет обработку, если известно, что задержка
 *     не превышает определённого значения.
 *
 * Вход:  2× real (Float32Array — два вещественных сигнала: «Вход 1» и «Вход 2»)
 * Выход: real (Float32Array — корреляционная функция, лаг 0 в центре массива)
 *
 * Примеры использования:
 *
 *   1. Измерение задержки:
 *      Sine(1000) → Коррелятор (Вход 1)
 *      Sine(1000) → DelayLine(задержка=50 отсчётов) → Коррелятор (Вход 2)
 *      → Oscilloscope
 *      На осциллографе виден пик корреляции со смещением 50 отсчётов вправо
 *      от центра — это и есть измеренная задержка.
 *
 *   2. Обнаружение сигнала в шуме:
 *      [Sine(1000) + NoiseGenerator(уровень=2)] → Коррелятор (Вход 1)
 *      Sine(1000) → Коррелятор (Вход 2, эталон)
 *      → Oscilloscope
 *      Даже при сильном шуме корреляция с чистым эталоном даёт выраженный пик.
 *
 *   3. Сравнение двух разных сигналов:
 *      Sine(1000) → Коррелятор (Вход 1)
 *      Sine(2000) → Коррелятор (Вход 2)
 *      → NumericIndicator
 *      Нормализованная корреляция близка к 0 — сигналы разных частот не коррелируют.
 */
import type { PluginDefinition } from '../../types';

function fftReal(re: Float64Array, im: Float64Array, n: number, inverse: boolean): void {
    // Bit-reversal permutation
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) {
            j ^= bit;
        }
        j ^= bit;
        if (i < j) {
            let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
            tmp = im[i]; im[i] = im[j]; im[j] = tmp;
        }
    }
    // Cooley-Tukey
    for (let len = 2; len <= n; len <<= 1) {
        const ang = (inverse ? -1 : 1) * 2 * Math.PI / len;
        const wRe = Math.cos(ang);
        const wIm = Math.sin(ang);
        for (let i = 0; i < n; i += len) {
            let curRe = 1, curIm = 0;
            for (let j = 0; j < len / 2; j++) {
                const uRe = re[i + j], uIm = im[i + j];
                const vRe = re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm;
                const vIm = re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe;
                re[i + j] = uRe + vRe;
                im[i + j] = uIm + vIm;
                re[i + j + len / 2] = uRe - vRe;
                im[i + j + len / 2] = uIm - vIm;
                const newCurRe = curRe * wRe - curIm * wIm;
                curIm = curRe * wIm + curIm * wRe;
                curRe = newCurRe;
            }
        }
    }
    if (inverse) {
        for (let i = 0; i < n; i++) {
            re[i] /= n;
            im[i] /= n;
        }
    }
}

function nextPow2(n: number): number {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
}

const CorrelatorPlugin = {
    type: 'Коррелятор',
    id: 'correlator',
    icon: 'dsp-correlator',
    description: 'Взаимная корреляция двух сигналов',
    group: 'real-math',

    signals: {
        input: 'real' as const,
        output: 'real' as const,
        inputsCount: 2,
        inputLabels: ['Вход 1', 'Вход 2']
    },

    defaultParams: {
        normalize: true,
        maxLag: 0
    },

    processor: {
        states: new Map<string, unknown>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input1 = inputs[0];
            const input2 = inputs[1];

            if (!input1 || !input2) return new Float32Array(chunkSize);

            const normalize = (params.normalize ?? true) as boolean;
            const maxLag = (params.maxLag ?? 0) as number;
            const actualMaxLag = maxLag > 0 ? Math.min(maxLag, chunkSize - 1) : chunkSize - 1;

            // Средние и энергии для нормализации
            let mean1 = 0, mean2 = 0;
            if (normalize) {
                for (let i = 0; i < chunkSize; i++) {
                    mean1 += input1[i];
                    mean2 += input2[i];
                }
                mean1 /= chunkSize;
                mean2 /= chunkSize;
            }

            let energy1 = 0, energy2 = 0;
            if (normalize) {
                for (let i = 0; i < chunkSize; i++) {
                    energy1 += (input1[i] - mean1) * (input1[i] - mean1);
                    energy2 += (input2[i] - mean2) * (input2[i] - mean2);
                }
            }
            const normFactor = normalize ? Math.sqrt(energy1 * energy2) : 1;

            // FFT-based cross-correlation: IFFT(FFT(x1) * conj(FFT(x2)))
            const fftSize = nextPow2(chunkSize * 2);

            const re1 = new Float64Array(fftSize);
            const im1 = new Float64Array(fftSize);
            const re2 = new Float64Array(fftSize);
            const im2 = new Float64Array(fftSize);

            for (let i = 0; i < chunkSize; i++) {
                re1[i] = normalize ? (input1[i] - mean1) : input1[i];
                re2[i] = normalize ? (input2[i] - mean2) : input2[i];
            }

            fftReal(re1, im1, fftSize, false);
            fftReal(re2, im2, fftSize, false);

            // Multiply FFT(x1) * conj(FFT(x2))
            for (let i = 0; i < fftSize; i++) {
                const a = re1[i], b = im1[i];
                const c = re2[i], d = -im2[i]; // conj
                re1[i] = a * c - b * d;
                im1[i] = a * d + b * c;
            }

            fftReal(re1, im1, fftSize, true);

            // Выход: lag 0 в центре
            const output = new Float32Array(chunkSize);
            const halfChunk = Math.floor(chunkSize / 2);

            for (let lag = 0; lag <= actualMaxLag && lag < halfChunk; lag++) {
                const val = re1[lag];
                const normVal = normFactor > 1e-10 ? val / normFactor : 0;

                // Положительный лаг
                const posIdx = halfChunk + lag;
                if (posIdx < chunkSize) output[posIdx] = normVal;

                // Отрицательный лаг
                if (lag > 0) {
                    const negIdx = halfChunk - lag;
                    const negVal = re1[fftSize - lag];
                    if (negIdx >= 0) {
                        output[negIdx] = normFactor > 1e-10 ? negVal / normFactor : 0;
                    }
                }
            }

            return output;
        }
    }
};

export default CorrelatorPlugin satisfies PluginDefinition;
