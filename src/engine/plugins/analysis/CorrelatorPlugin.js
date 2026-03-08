/**
 * Коррелятор
 *
 * Вычисляет взаимную корреляцию двух входных сигналов через БПФ.
 * Сложность O(N·log N) вместо O(N²).
 * Выход — нормализованный коэффициент корреляции или raw-корреляция.
 */

function fftReal(re, im, n, inverse) {
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

function nextPow2(n) {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
}

const CorrelatorPlugin = {
    type: 'Коррелятор',
    id: 'correlator',
    icon: 'dsp-correlator',
    description: 'Взаимная корреляция двух сигналов',
    group: 'math-blocks',

    signals: {
        input: 'real',
        output: 'real',
        inputsCount: 2,
        inputLabels: ['Вход 1', 'Вход 2']
    },

    defaultParams: {
        normalize: true,
        maxLag: 0
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize) {
            const input1 = inputs[0];
            const input2 = inputs[1];

            if (!input1 || !input2) return new Float32Array(chunkSize);

            const normalize = params.normalize ?? true;
            const maxLag = params.maxLag ?? 0;
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

export default CorrelatorPlugin;
