import { describe, it, expect } from 'vitest';
import PowerMeterPlugin from '../../src/engine/plugins/visualization/PowerMeterPlugin';
import SNRMeterPlugin from '../../src/engine/plugins/visualization/SNRMeterPlugin';
import BERCounterPlugin from '../../src/engine/plugins/visualization/BERCounterPlugin';
import HistogramPlugin from '../../src/engine/plugins/visualization/HistogramPlugin';
import EyeDiagramPlugin from '../../src/engine/plugins/visualization/EyeDiagramPlugin';

describe('PowerMeter', () => {
    const proc = PowerMeterPlugin.processor;

    it('metadata', () => {
        expect(PowerMeterPlugin.id).toBe('power-meter');
        expect(PowerMeterPlugin.signals.input).toBe('real');
        expect(PowerMeterPlugin.signals.output).toBeNull();
    });

    it('computes correct RMS for sine wave', () => {
        const chunkSize = 4096;
        const input = new Float32Array(chunkSize);
        for (let i = 0; i < chunkSize; i++) {
            input[i] = Math.sin(2 * Math.PI * 100 * i / 48000);
        }
        const result = proc.process([input], {}, chunkSize);
        // RMS of sine = 1/√2 ≈ 0.707
        expect(result.rms).toBeCloseTo(1 / Math.sqrt(2), 1);
        expect(result.peak).toBeCloseTo(1, 1);
        expect(result.average).toBeGreaterThan(0);
        expect(result.dbfs).toBeCloseTo(-3.01, 0); // 20*log10(0.707) ≈ -3.01
    });

    it('returns zeros for null input', () => {
        const result = proc.process([null], {}, 512);
        expect(result.rms).toBe(0);
        expect(result.peak).toBe(0);
    });
});

describe('SNRMeter', () => {
    const proc = SNRMeterPlugin.processor;

    it('metadata', () => {
        expect(SNRMeterPlugin.id).toBe('snr-meter');
        expect(SNRMeterPlugin.signals.inputsCount).toBe(2);
    });

    it('identical signals give very high SNR', () => {
        const signal = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) signal[i] = Math.sin(2 * Math.PI * 100 * i / 48000);
        const result = proc.process([signal, signal], {}, 1024);
        expect(result.snr).toBe(Infinity);
    });

    it('signal with noise gives finite SNR', () => {
        const clean = new Float32Array(4096);
        const noisy = new Float32Array(4096);
        for (let i = 0; i < 4096; i++) {
            clean[i] = Math.sin(2 * Math.PI * 100 * i / 48000);
            noisy[i] = clean[i] + (Math.random() - 0.5) * 0.1;
        }
        const result = proc.process([noisy, clean], {}, 4096);
        expect(isFinite(result.snr)).toBe(true);
        expect(result.snr).toBeGreaterThan(10); // Should be high since noise is small
    });
});

describe('BERCounter', () => {
    const proc = BERCounterPlugin.processor;

    it('metadata', () => {
        expect(BERCounterPlugin.id).toBe('ber-counter');
        expect(BERCounterPlugin.signals.inputsCount).toBe(2);
    });

    it('identical bit streams give BER=0', () => {
        proc.clearStates();
        const bits = new Float32Array([1, 0, 1, 1, 0, 0, 1, 0]);
        const result = proc.process([bits, bits], { threshold: 0.5 }, 8, 'n1');
        expect(result.ber).toBe(0);
        expect(result.errorBits).toBe(0);
        expect(result.totalBits).toBe(8);
    });

    it('all-error case gives BER=1', () => {
        proc.clearStates();
        const tx = new Float32Array([1, 1, 1, 1]);
        const rx = new Float32Array([0, 0, 0, 0]);
        const result = proc.process([tx, rx], { threshold: 0.5 }, 4, 'n2');
        expect(result.ber).toBe(1);
    });

    it('accumulates across chunks', () => {
        proc.clearStates();
        const tx = new Float32Array([1, 1]);
        const rx = new Float32Array([1, 0]); // 1 error in 2 bits
        proc.process([tx, rx], { threshold: 0.5 }, 2, 'n3');
        const result = proc.process([tx, rx], { threshold: 0.5 }, 2, 'n3');
        expect(result.totalBits).toBe(4);
        expect(result.errorBits).toBe(2);
        expect(result.ber).toBe(0.5);
    });
});

describe('Histogram', () => {
    const proc = HistogramPlugin.processor;

    it('metadata', () => {
        expect(HistogramPlugin.id).toBe('histogram');
        expect(HistogramPlugin.signals.output).toBeNull();
    });

    it('returns bins array', () => {
        const input = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) input[i] = Math.random() * 2 - 1;
        const result = proc.process([input], { bins: 32 }, 1024);
        expect(result.bins).toBeInstanceOf(Float32Array);
        expect(result.bins.length).toBe(32);
        expect(result.numBins).toBe(32);
    });

    it('bins sum to ~1 (normalized)', () => {
        const input = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) input[i] = Math.random();
        const result = proc.process([input], { bins: 16 }, 1024);
        let sum = 0;
        for (let i = 0; i < result.bins.length; i++) sum += result.bins[i];
        expect(sum).toBeCloseTo(1, 5);
    });

    it('constant signal concentrates in one bin', () => {
        const input = new Float32Array(100).fill(0.5);
        const result = proc.process([input], { bins: 10 }, 100);
        let maxBin = 0;
        for (let i = 0; i < result.bins.length; i++) {
            if (result.bins[i] > maxBin) maxBin = result.bins[i];
        }
        expect(maxBin).toBe(1); // All samples in one bin
    });
});

describe('EyeDiagram', () => {
    const proc = EyeDiagramPlugin.processor;

    it('metadata', () => {
        expect(EyeDiagramPlugin.id).toBe('eye-diagram');
        expect(EyeDiagramPlugin.signals.output).toBeNull();
    });

    it('returns traces array', () => {
        const input = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) input[i] = Math.sin(2 * Math.PI * 10 * i / 1000);
        const result = proc.process([input], { samplesPerSymbol: 10 }, 1024);
        expect(result.traces).toBeInstanceOf(Array);
        expect(result.traces.length).toBeGreaterThan(0);
        expect(result.samplesPerSymbol).toBe(10);
    });

    it('each trace has length 2*samplesPerSymbol', () => {
        const sps = 20;
        const input = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) input[i] = Math.random();
        const result = proc.process([input], { samplesPerSymbol: sps }, 1024);
        for (const trace of result.traces) {
            expect(trace.length).toBe(sps * 2);
        }
    });

    it('returns empty traces for null input', () => {
        const result = proc.process([null], { samplesPerSymbol: 10 }, 512);
        expect(result.traces.length).toBe(0);
    });
});
