/**
 * Утилиты для БПФ (Fast Fourier Transform)
 */

/**
 * In-place Cooley-Tukey FFT
 */
export function fft(real, imag) {
    const n = real.length;
    if (n <= 1) return;

    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
        }
    }

    for (let len = 2; len <= n; len <<= 1) {
        const angle = (2 * Math.PI) / len;
        const wReal = Math.cos(angle);
        const wImag = -Math.sin(angle);
        for (let i = 0; i < n; i += len) {
            let curReal = 1;
            let curImag = 0;
            for (let j = 0; j < len / 2; j++) {
                const uReal = real[i + j];
                const uImag = imag[i + j];
                const vReal = real[i + j + len / 2] * curReal - imag[i + j + len / 2] * curImag;
                const vImag = real[i + j + len / 2] * curImag + imag[i + j + len / 2] * curReal;
                real[i + j] = uReal + vReal;
                imag[i + j] = uImag + vImag;
                real[i + j + len / 2] = uReal - vReal;
                imag[i + j + len / 2] = uImag - vImag;
                const temp = curReal * wReal - curImag * wImag;
                curImag = curReal * wImag + curImag * wReal;
                curReal = temp;
            }
        }
    }
}

/**
 * Вычисляет магнитуду в дБ (половина спектра)
 */
export function computeMagnitudeDB(real, imag) {
    const n = real.length;
    const magnitude = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
        magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }

    const N = n;
    const scale = 2 / N;

    for (let i = 0; i < magnitude.length; i++) {
        const mag = magnitude[i] * scale;
        magnitude[i] = 20 * Math.log10(mag + 1e-10);
    }
    return magnitude;
}
