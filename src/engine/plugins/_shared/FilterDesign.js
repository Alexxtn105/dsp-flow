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
    const NORM_EPSILON = 1e-10;
    if (type === 'highpass') {
        // Highpass: normalize at Nyquist (alternating sum)
        let sum = 0;
        for (let i = 0; i < order; i++) {
            sum += (i % 2 === 0 ? coeffs[i] : -coeffs[i]);
        }
        if (Math.abs(sum) > NORM_EPSILON) {
            for (let i = 0; i < order; i++) coeffs[i] /= sum;
        }
    } else {
        // Lowpass: normalize at DC
        let sum = 0;
        for (let i = 0; i < order; i++) sum += coeffs[i];
        if (Math.abs(sum) > NORM_EPSILON) {
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
 * Parks-McClellan (Remez exchange) algorithm for optimal equiripple FIR filter design.
 *
 * @param {string} type - 'lowpass' or 'highpass'
 * @param {number} cutoff - cutoff frequency in Hz
 * @param {number} sampleRate - sample rate in Hz
 * @param {number} order - filter order (number of taps)
 * @returns {Float32Array} filter coefficients
 */
export const designRemez = (type, cutoff, sampleRate, order) => {
    // For highpass: design lowpass then apply spectral inversion
    if (type === 'highpass') {
        const lpCoeffs = designRemez('lowpass', cutoff, sampleRate, order);
        const coeffs = new Float32Array(order);
        for (let i = 0; i < order; i++) coeffs[i] = -lpCoeffs[i];
        coeffs[Math.floor(order / 2)] += 1;
        return coeffs;
    }

    const numTaps = order;
    const L = Math.floor((numTaps - 1) / 2); // number of cosine coefficients
    const numExtrema = L + 2;

    // Normalized frequency (0..0.5)
    const fc = cutoff / sampleRate;
    const transitionWidth = Math.min(3.0 / order, 0.15);

    // Build bands, desired response, weights (lowpass only)
    const fPass = Math.max(0.01, fc - transitionWidth / 2);
    const fStop = Math.min(0.49, fc + transitionWidth / 2);
    const bands = [0, fPass, fStop, 0.5];
    const desired = [1, 1, 0, 0];
    const weights = [1, 1];

    // Build dense frequency grid (exclude transition band)
    const gridDensity = 16;
    const gridSize = gridDensity * numTaps;
    const grid = [];
    const desiredOnGrid = [];
    const weightOnGrid = [];

    const numBands = bands.length / 2;
    for (let b = 0; b < numBands; b++) {
        const fLow = bands[b * 2];
        const fHigh = bands[b * 2 + 1];
        const d0 = desired[b * 2];
        const d1 = desired[b * 2 + 1];
        const w = weights[b];
        const numPoints = Math.max(2, Math.round(gridSize * (fHigh - fLow) / 0.5));
        for (let i = 0; i < numPoints; i++) {
            const f = fLow + (fHigh - fLow) * i / (numPoints - 1);
            grid.push(f);
            // Linear interpolation of desired response within band
            const t = (fHigh > fLow) ? (f - fLow) / (fHigh - fLow) : 0;
            desiredOnGrid.push(d0 + (d1 - d0) * t);
            weightOnGrid.push(w);
        }
    }

    const G = grid.length;
    if (G < numExtrema) {
        // Not enough grid points — fallback
        return designWindowedSinc(type, cutoff, sampleRate, order, 'blackman');
    }

    // Initialize extremal frequencies: uniformly spaced indices into grid
    let extremalIndices = new Array(numExtrema);
    for (let i = 0; i < numExtrema; i++) {
        extremalIndices[i] = Math.round(i * (G - 1) / (numExtrema - 1));
    }

    // Map grid frequencies to cos(2*pi*f) for Chebyshev interpolation
    const cosGrid = new Float64Array(G);
    for (let i = 0; i < G; i++) {
        cosGrid[i] = Math.cos(2 * Math.PI * grid[i]);
    }

    const MAX_ITER = 40;
    const CONVERGE_EPS = 1e-6;
    let prevDelta = 0;
    let converged = false;
    let A = new Float64Array(G); // computed response on grid

    for (let iter = 0; iter < MAX_ITER; iter++) {
        // Step 1: Compute delta using Lagrange interpolation at extremal points
        const x = new Float64Array(numExtrema);
        const y = new Float64Array(numExtrema);
        const ad = new Float64Array(numExtrema);

        for (let i = 0; i < numExtrema; i++) {
            const idx = extremalIndices[i];
            x[i] = cosGrid[idx];
            y[i] = desiredOnGrid[idx];
            ad[i] = 1.0 / weightOnGrid[idx];
        }

        // Compute barycentric weights for extremal points
        const baryWeights = new Float64Array(numExtrema);
        for (let i = 0; i < numExtrema; i++) {
            let w = 1.0;
            for (let j = 0; j < numExtrema; j++) {
                if (j !== i) {
                    w *= (x[i] - x[j]);
                }
            }
            baryWeights[i] = 1.0 / w;
        }

        // Compute delta (deviation)
        let num = 0, den = 0;
        for (let i = 0; i < numExtrema; i++) {
            const sign = (i % 2 === 0) ? 1 : -1;
            num += baryWeights[i] * y[i];
            den += baryWeights[i] * sign * ad[i];
        }
        const delta = num / den;

        // Check convergence
        if (iter > 0 && Math.abs(delta - prevDelta) < CONVERGE_EPS * Math.abs(delta)) {
            converged = true;
        }
        prevDelta = delta;

        // Step 2: Compute desired response at extremal points adjusted by delta
        const yAdj = new Float64Array(numExtrema);
        for (let i = 0; i < numExtrema; i++) {
            const sign = (i % 2 === 0) ? 1 : -1;
            yAdj[i] = y[i] - sign * delta * ad[i];
        }

        // Step 3: Barycentric interpolation to compute A(f) on full grid
        for (let gi = 0; gi < G; gi++) {
            const xVal = cosGrid[gi];
            let num2 = 0, den2 = 0;
            let exactMatch = -1;

            for (let i = 0; i < numExtrema; i++) {
                const diff = xVal - x[i];
                if (Math.abs(diff) < 1e-12) {
                    exactMatch = i;
                    break;
                }
                const term = baryWeights[i] / diff;
                num2 += term * yAdj[i];
                den2 += term;
            }

            A[gi] = (exactMatch >= 0) ? yAdj[exactMatch] : num2 / den2;
        }

        if (converged) break;

        // Step 4: Compute weighted error and find new extremal points
        const error = new Float64Array(G);
        for (let i = 0; i < G; i++) {
            error[i] = weightOnGrid[i] * (desiredOnGrid[i] - A[i]);
        }

        // Find local extrema of |error|
        const newExtrema = [];

        // Check endpoints
        if (G > 1 && Math.abs(error[0]) >= Math.abs(error[1])) {
            newExtrema.push(0);
        }

        for (let i = 1; i < G - 1; i++) {
            if ((error[i] > 0 && error[i] >= error[i - 1] && error[i] >= error[i + 1]) ||
                (error[i] < 0 && error[i] <= error[i - 1] && error[i] <= error[i + 1])) {
                newExtrema.push(i);
            }
        }

        if (G > 1 && Math.abs(error[G - 1]) >= Math.abs(error[G - 2])) {
            newExtrema.push(G - 1);
        }

        if (newExtrema.length < numExtrema) {
            // Not enough extrema found — keep current set
            break;
        }

        // Sort by descending |error| and pick top numExtrema,
        // but maintain alternating sign (Remez condition)
        newExtrema.sort((a, b) => Math.abs(error[b]) - Math.abs(error[a]));

        // Select extrema maintaining alternating sign
        const selected = [newExtrema[0]];
        for (let i = 1; i < newExtrema.length && selected.length < numExtrema; i++) {
            const candidate = newExtrema[i];
            const lastIdx = selected[selected.length - 1];
            // Check alternating sign
            if (error[candidate] * error[lastIdx] < 0 || selected.length === 1) {
                // Accept if sign alternates or we need more points
                selected.push(candidate);
            }
        }

        // If not enough with alternating sign, just take top ones
        if (selected.length < numExtrema) {
            const selectedSet = new Set(selected);
            for (let i = 0; i < newExtrema.length && selected.length < numExtrema; i++) {
                if (!selectedSet.has(newExtrema[i])) {
                    selected.push(newExtrema[i]);
                    selectedSet.add(newExtrema[i]);
                }
            }
        }

        selected.sort((a, b) => a - b);
        extremalIndices = selected.slice(0, numExtrema);
    }

    // Step 5: Extract filter coefficients via cosine expansion from A(f)
    // A(f) is computed on the grid — use IDFT-like approach to get h[n]
    // For Type I linear phase (odd numTaps): h[n] = a[0] + 2*sum(a[k]*cos(2*pi*k*f))
    // Compute a[k] from A(f) using least-squares on the grid
    const coeffsA = new Float64Array(L + 1);

    // Use the computed A on a uniform grid for IDFT
    const uniformN = Math.max(512, numTaps * 8);
    const uniformA = new Float64Array(uniformN);

    // Interpolate A onto uniform grid [0, 0.5]
    for (let i = 0; i < uniformN; i++) {
        const f = 0.5 * i / (uniformN - 1);
        // Find in which band this frequency falls
        let inBand = false;
        for (let b = 0; b < numBands; b++) {
            if (f >= bands[b * 2] - 1e-10 && f <= bands[b * 2 + 1] + 1e-10) {
                inBand = true;
                break;
            }
        }
        if (!inBand) {
            // Transition band — interpolate from A grid
            // Find nearest grid points
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let gi = 0; gi < G; gi++) {
                const dist = Math.abs(grid[gi] - f);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = gi;
                }
            }
            uniformA[i] = A[bestIdx];
        } else {
            // In-band: find nearest grid point
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let gi = 0; gi < G; gi++) {
                const dist = Math.abs(grid[gi] - f);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = gi;
                }
            }
            uniformA[i] = A[bestIdx];
        }
    }

    // IDFT: a[k] = (2/N) * sum(A[i] * cos(2*pi*k*f_i)) for k > 0, (1/N) for k=0
    for (let k = 0; k <= L; k++) {
        let sum = 0;
        for (let i = 0; i < uniformN; i++) {
            const f = 0.5 * i / (uniformN - 1);
            sum += uniformA[i] * Math.cos(2 * Math.PI * k * f * 2); // cos(2*pi*k*(f/0.5)*0.5) = cos(2*pi*k*f)
        }
        if (k === 0) {
            coeffsA[k] = sum / uniformN;
        } else {
            coeffsA[k] = 2 * sum / uniformN;
        }
    }

    // Build symmetric FIR coefficients
    const coeffs = new Float32Array(numTaps);
    const center = L;
    coeffs[center] = coeffsA[0];
    for (let k = 1; k <= L; k++) {
        coeffs[center - k] = coeffsA[k] / 2;
        coeffs[center + k] = coeffsA[k] / 2;
    }

    // Normalize for unity gain at DC
    const NORM_EPSILON = 1e-10;
    let sum = 0;
    for (let i = 0; i < numTaps; i++) sum += coeffs[i];
    if (Math.abs(sum) > NORM_EPSILON) {
        for (let i = 0; i < numTaps; i++) coeffs[i] /= sum;
    }

    return coeffs;
};

/**
 * Parks-McClellan (Remez) for bandpass FIR filter design.
 *
 * @param {number} lowCutoff - lower cutoff frequency in Hz
 * @param {number} highCutoff - upper cutoff frequency in Hz
 * @param {number} sampleRate - sample rate in Hz
 * @param {number} order - filter order (number of taps)
 * @returns {Float32Array} filter coefficients
 */
export const designRemezBandpass = (lowCutoff, highCutoff, sampleRate, order) => {
    const numTaps = order;
    const L = Math.floor((numTaps - 1) / 2);
    const numExtrema = L + 2;

    const fLow = lowCutoff / sampleRate;
    const fHigh = highCutoff / sampleRate;
    const transitionWidth = Math.min(3.0 / order, 0.1);

    // Three bands: stopband1, passband, stopband2
    const f1Stop = Math.max(0.01, fLow - transitionWidth / 2);
    const f2Start = Math.min(0.49, fHigh + transitionWidth / 2);
    const bands = [0, f1Stop, fLow, fHigh, f2Start, 0.5];
    const desired = [0, 0, 1, 1, 0, 0];
    const weights = [1, 1, 1];

    // Build dense frequency grid
    const gridDensity = 16;
    const gridSize = gridDensity * numTaps;
    const grid = [];
    const desiredOnGrid = [];
    const weightOnGrid = [];

    const numBands = bands.length / 2;
    for (let b = 0; b < numBands; b++) {
        const bLow = bands[b * 2];
        const bHigh = bands[b * 2 + 1];
        const d0 = desired[b * 2];
        const d1 = desired[b * 2 + 1];
        const w = weights[b];
        const numPoints = Math.max(2, Math.round(gridSize * (bHigh - bLow) / 0.5));
        for (let i = 0; i < numPoints; i++) {
            const f = bLow + (bHigh - bLow) * i / (numPoints - 1);
            grid.push(f);
            const t = (bHigh > bLow) ? (f - bLow) / (bHigh - bLow) : 0;
            desiredOnGrid.push(d0 + (d1 - d0) * t);
            weightOnGrid.push(w);
        }
    }

    const G = grid.length;
    if (G < numExtrema) {
        // Fallback to windowed sinc bandpass
        const coeffsLP = designWindowedSinc('lowpass', highCutoff, sampleRate, order, 'blackman');
        const coeffsHP = designWindowedSinc('lowpass', lowCutoff, sampleRate, order, 'blackman');
        const result = new Float32Array(order);
        for (let i = 0; i < order; i++) result[i] = coeffsLP[i] - coeffsHP[i];
        return result;
    }

    let extremalIndices = new Array(numExtrema);
    for (let i = 0; i < numExtrema; i++) {
        extremalIndices[i] = Math.round(i * (G - 1) / (numExtrema - 1));
    }

    const cosGrid = new Float64Array(G);
    for (let i = 0; i < G; i++) {
        cosGrid[i] = Math.cos(2 * Math.PI * grid[i]);
    }

    const MAX_ITER = 40;
    const CONVERGE_EPS = 1e-6;
    let prevDelta = 0;
    let converged = false;
    let A = new Float64Array(G);

    for (let iter = 0; iter < MAX_ITER; iter++) {
        const x = new Float64Array(numExtrema);
        const y = new Float64Array(numExtrema);
        const ad = new Float64Array(numExtrema);

        for (let i = 0; i < numExtrema; i++) {
            const idx = extremalIndices[i];
            x[i] = cosGrid[idx];
            y[i] = desiredOnGrid[idx];
            ad[i] = 1.0 / weightOnGrid[idx];
        }

        const baryWeights = new Float64Array(numExtrema);
        for (let i = 0; i < numExtrema; i++) {
            let w = 1.0;
            for (let j = 0; j < numExtrema; j++) {
                if (j !== i) w *= (x[i] - x[j]);
            }
            baryWeights[i] = 1.0 / w;
        }

        let num = 0, den = 0;
        for (let i = 0; i < numExtrema; i++) {
            const sign = (i % 2 === 0) ? 1 : -1;
            num += baryWeights[i] * y[i];
            den += baryWeights[i] * sign * ad[i];
        }
        const delta = num / den;

        if (iter > 0 && Math.abs(delta - prevDelta) < CONVERGE_EPS * Math.abs(delta)) {
            converged = true;
        }
        prevDelta = delta;

        const yAdj = new Float64Array(numExtrema);
        for (let i = 0; i < numExtrema; i++) {
            const sign = (i % 2 === 0) ? 1 : -1;
            yAdj[i] = y[i] - sign * delta * ad[i];
        }

        for (let gi = 0; gi < G; gi++) {
            const xVal = cosGrid[gi];
            let num2 = 0, den2 = 0;
            let exactMatch = -1;

            for (let i = 0; i < numExtrema; i++) {
                const diff = xVal - x[i];
                if (Math.abs(diff) < 1e-12) {
                    exactMatch = i;
                    break;
                }
                const term = baryWeights[i] / diff;
                num2 += term * yAdj[i];
                den2 += term;
            }
            A[gi] = (exactMatch >= 0) ? yAdj[exactMatch] : num2 / den2;
        }

        if (converged) break;

        const error = new Float64Array(G);
        for (let i = 0; i < G; i++) {
            error[i] = weightOnGrid[i] * (desiredOnGrid[i] - A[i]);
        }

        const newExtrema = [];
        if (G > 1 && Math.abs(error[0]) >= Math.abs(error[1])) {
            newExtrema.push(0);
        }
        for (let i = 1; i < G - 1; i++) {
            if ((error[i] > 0 && error[i] >= error[i - 1] && error[i] >= error[i + 1]) ||
                (error[i] < 0 && error[i] <= error[i - 1] && error[i] <= error[i + 1])) {
                newExtrema.push(i);
            }
        }
        if (G > 1 && Math.abs(error[G - 1]) >= Math.abs(error[G - 2])) {
            newExtrema.push(G - 1);
        }

        if (newExtrema.length < numExtrema) break;

        newExtrema.sort((a, b) => Math.abs(error[b]) - Math.abs(error[a]));
        const selected = [newExtrema[0]];
        for (let i = 1; i < newExtrema.length && selected.length < numExtrema; i++) {
            const candidate = newExtrema[i];
            const lastIdx = selected[selected.length - 1];
            if (error[candidate] * error[lastIdx] < 0 || selected.length === 1) {
                selected.push(candidate);
            }
        }
        if (selected.length < numExtrema) {
            const selectedSet = new Set(selected);
            for (let i = 0; i < newExtrema.length && selected.length < numExtrema; i++) {
                if (!selectedSet.has(newExtrema[i])) {
                    selected.push(newExtrema[i]);
                    selectedSet.add(newExtrema[i]);
                }
            }
        }
        selected.sort((a, b) => a - b);
        extremalIndices = selected.slice(0, numExtrema);
    }

    // Extract coefficients via cosine expansion
    const uniformN = Math.max(512, numTaps * 8);
    const uniformA = new Float64Array(uniformN);

    for (let i = 0; i < uniformN; i++) {
        const f = 0.5 * i / (uniformN - 1);
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let gi = 0; gi < G; gi++) {
            const dist = Math.abs(grid[gi] - f);
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = gi;
            }
        }
        uniformA[i] = A[bestIdx];
    }

    const coeffsA = new Float64Array(L + 1);
    for (let k = 0; k <= L; k++) {
        let sum = 0;
        for (let i = 0; i < uniformN; i++) {
            const f = 0.5 * i / (uniformN - 1);
            sum += uniformA[i] * Math.cos(2 * Math.PI * k * f * 2);
        }
        coeffsA[k] = (k === 0) ? sum / uniformN : 2 * sum / uniformN;
    }

    const coeffs = new Float32Array(numTaps);
    const center = L;
    coeffs[center] = coeffsA[0];
    for (let k = 1; k <= L; k++) {
        coeffs[center - k] = coeffsA[k] / 2;
        coeffs[center + k] = coeffsA[k] / 2;
    }

    return coeffs;
};
