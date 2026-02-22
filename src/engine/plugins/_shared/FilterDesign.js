/**
 * Алгоритмы проектирования фильтров
 */

import WindowFunctions from './WindowFunctions.js';

/**
 * Sinc function
 */
export const sinc = (x) => {
    if (x === 0) return 1;
    const piX = Math.PI * x;
    return Math.sin(piX) / piX;
};

/**
 * Filter Design: Windowed Sinc
 */
export const designWindowedSinc = (type, cutoff, sampleRate, order, windowName) => {
    const M = order - 1;
    const fc = cutoff / sampleRate;
    const coeffs = new Float32Array(order);
    const window = WindowFunctions[windowName] || WindowFunctions.rectangular;

    for (let i = 0; i < order; i++) {
        if (i === M / 2) {
            coeffs[i] = 2 * fc;
        } else {
            coeffs[i] = 2 * fc * sinc(2 * fc * (i - M / 2));
        }
        coeffs[i] *= window(i, order);
    }

    // Normalize for unity gain
    if (type === 'highpass') {
        // Highpass: normalize at Nyquist (alternating sum)
        let sum = 0;
        for (let i = 0; i < order; i++) {
            sum += (i % 2 === 0 ? coeffs[i] : -coeffs[i]);
        }
        if (sum !== 0) {
            for (let i = 0; i < order; i++) coeffs[i] /= sum;
        }
    } else {
        // Lowpass: normalize at DC
        let sum = 0;
        for (let i = 0; i < order; i++) sum += coeffs[i];
        if (sum !== 0) {
            for (let i = 0; i < order; i++) coeffs[i] /= sum;
        }
    }

    // Spectral Inversion for Highpass
    if (type === 'highpass') {
        for (let i = 0; i < order; i++) coeffs[i] *= -1;
        coeffs[Math.floor(order / 2)] += 1;
    }

    return coeffs;
};

/**
 * Filter Design: Placeholder for Remez
 */
export const designRemez = (type, cutoff, sampleRate, order) => {
    const coeffs = designWindowedSinc(type, cutoff, sampleRate, order, 'blackman');
    coeffs._remezFallback = true;
    return coeffs;
};
