import { describe, it, expect } from 'vitest';
import WindowFunctions from '../../src/engine/plugins/_shared/WindowFunctions.js';
import { sinc, designWindowedSinc, designRemez } from '../../src/engine/plugins/_shared/FilterDesign.js';
import { fft, computeMagnitudeDB } from '../../src/engine/plugins/_shared/FFTUtils.js';

describe('WindowFunctions', () => {
    it('rectangular всегда 1', () => {
        expect(WindowFunctions.rectangular(0, 10)).toBe(1);
        expect(WindowFunctions.rectangular(5, 10)).toBe(1);
    });

    it('hamming имеет значение ~0.08 на краях', () => {
        const v = WindowFunctions.hamming(0, 100);
        expect(v).toBeCloseTo(0.08, 1);
    });

    it('hanning начинается с 0', () => {
        const v = WindowFunctions.hanning(0, 100);
        expect(v).toBeCloseTo(0, 5);
    });

    it('blackman-harris определена', () => {
        const v = WindowFunctions['blackman-harris'](50, 100);
        expect(typeof v).toBe('number');
        expect(v).toBeGreaterThan(0);
    });
});

describe('sinc', () => {
    it('sinc(0) = 1', () => {
        expect(sinc(0)).toBe(1);
    });

    it('sinc(1) ≈ 0', () => {
        expect(sinc(1)).toBeCloseTo(0, 10);
    });

    it('sinc(0.5) = 2/π', () => {
        expect(sinc(0.5)).toBeCloseTo(2 / Math.PI, 5);
    });
});

describe('designWindowedSinc', () => {
    it('возвращает массив коэффициентов правильной длины', () => {
        const coeffs = designWindowedSinc('lowpass', 1000, 48000, 31, 'hamming');
        expect(coeffs).toBeInstanceOf(Float32Array);
        expect(coeffs.length).toBe(31);
    });

    it('lowpass: сумма коэффициентов ≈ 1 (unity gain)', () => {
        const coeffs = designWindowedSinc('lowpass', 5000, 48000, 31, 'hamming');
        let sum = 0;
        for (let i = 0; i < coeffs.length; i++) sum += coeffs[i];
        expect(sum).toBeCloseTo(1.0, 1);
    });
});

describe('designRemez', () => {
    it('возвращает Float32Array правильной длины', () => {
        const coeffs = designRemez('lowpass', 1000, 48000, 31);
        expect(coeffs).toBeInstanceOf(Float32Array);
        expect(coeffs.length).toBe(31);
    });

    it('lowpass: сумма коэффициентов ≈ 1 (unity gain at DC)', () => {
        const coeffs = designRemez('lowpass', 5000, 48000, 31);
        let sum = 0;
        for (let i = 0; i < coeffs.length; i++) sum += coeffs[i];
        expect(sum).toBeCloseTo(1.0, 1);
    });

    it('highpass: подавляет DC, пропускает Nyquist', () => {
        const coeffs = designRemez('highpass', 5000, 48000, 31);
        // DC gain — сумма коэффициентов — должна быть ≈ 0
        let dcSum = 0;
        for (let i = 0; i < coeffs.length; i++) dcSum += coeffs[i];
        expect(Math.abs(dcSum)).toBeLessThan(0.2);
        // Nyquist gain — знакочередующая сумма — должна быть ≈ 1
        let nyqSum = 0;
        for (let i = 0; i < coeffs.length; i++) {
            nyqSum += coeffs[i] * ((i % 2 === 0) ? 1 : -1);
        }
        expect(Math.abs(nyqSum)).toBeCloseTo(1.0, 0);
    });

    it('не содержит _remezFallback', () => {
        const coeffs = designRemez('lowpass', 2000, 48000, 31);
        expect(coeffs._remezFallback).toBeUndefined();
    });
});

describe('FFTUtils', () => {
    it('fft: DC вход', () => {
        const real = new Float32Array([1, 1, 1, 1]);
        const imag = new Float32Array(4);
        fft(real, imag);
        expect(real[0]).toBeCloseTo(4); // sum of all
        expect(real[1]).toBeCloseTo(0);
    });

    it('computeMagnitudeDB: возвращает половину размера', () => {
        const real = new Float32Array(8);
        const imag = new Float32Array(8);
        real[0] = 8; // DC
        const mag = computeMagnitudeDB(real, imag);
        expect(mag.length).toBe(4);
    });
});
