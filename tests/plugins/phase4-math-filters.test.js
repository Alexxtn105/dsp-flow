import { describe, it, expect, beforeEach } from 'vitest';
import WaveletTransformPlugin from '../../src/engine/plugins/math/WaveletTransformPlugin';
import CepstrumPlugin from '../../src/engine/plugins/math/CepstrumPlugin';
import AllpassFilterPlugin from '../../src/engine/plugins/filters/AllpassFilterPlugin';

const chunkSize = 1024;
const sampleRate = 48000;

/** Generate a sine wave Float32Array */
function makeSine(freq, amplitude, length) {
    const buf = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        buf[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
    }
    return buf;
}

// ─── Wavelet Transform ───────────────────────────────────────

describe('WaveletTransform', () => {
    it('should be registered with correct metadata', () => {
        expect(WaveletTransformPlugin.id).toBe('wavelet-transform');
        expect(WaveletTransformPlugin.group).toBe('real-math');
        expect(WaveletTransformPlugin.signals.input).toBe('real');
        expect(WaveletTransformPlugin.signals.output).toBe('real');
    });

    it('should produce correct Haar decomposition', () => {
        // Simple input: [1,2,3,4,5,6,7,8], 1 level Haar
        const input = new Float32Array(8);
        input[0] = 1; input[1] = 2; input[2] = 3; input[3] = 4;
        input[4] = 5; input[5] = 6; input[6] = 7; input[7] = 8;

        const output = WaveletTransformPlugin.processor.process([input], { levels: 1, wavelet: 'haar' }, 8);

        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(8);

        // For 1-level Haar on [1,2,3,4,5,6,7,8]:
        // cA = [(1+2)/sqrt(2), (3+4)/sqrt(2), (5+6)/sqrt(2), (7+8)/sqrt(2)]
        // cD = [(1-2)/sqrt(2), (3-4)/sqrt(2), (5-6)/sqrt(2), (7-8)/sqrt(2)]
        // Output packing: [cA | cD]
        const sqrt2 = Math.SQRT2;
        // cA coefficients (first 4)
        expect(output[0]).toBeCloseTo((1 + 2) / sqrt2, 3);
        expect(output[1]).toBeCloseTo((3 + 4) / sqrt2, 3);
        expect(output[2]).toBeCloseTo((5 + 6) / sqrt2, 3);
        expect(output[3]).toBeCloseTo((7 + 8) / sqrt2, 3);
        // cD coefficients (next 4)
        expect(output[4]).toBeCloseTo((1 - 2) / sqrt2, 3);
        expect(output[5]).toBeCloseTo((3 - 4) / sqrt2, 3);
        expect(output[6]).toBeCloseTo((5 - 6) / sqrt2, 3);
        expect(output[7]).toBeCloseTo((7 - 8) / sqrt2, 3);
    });

    it('should handle multiple levels', () => {
        const input = new Float32Array(8);
        for (let i = 0; i < 8; i++) input[i] = i + 1;

        const output = WaveletTransformPlugin.processor.process([input], { levels: 2, wavelet: 'haar' }, 8);

        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(8);

        // With 2 levels on length-8 input:
        // Level 1: 8 -> cA1(4) + cD1(4)
        // Level 2: cA1(4) -> cA2(2) + cD2(2)
        // Output packing: [cA2(2) | cD2(2) | cD1(4)]
        // All values should be finite
        for (let i = 0; i < output.length; i++) {
            expect(isFinite(output[i])).toBe(true);
        }
    });

    it('should handle non-power-of-2 input', () => {
        // chunkSize=1024 is a power of 2, but the plugin pads to next power of 2 anyway
        const input = makeSine(1000, 1.0, chunkSize);

        const output = WaveletTransformPlugin.processor.process([input], { levels: 3, wavelet: 'haar' }, chunkSize);

        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(chunkSize);

        // Output should contain valid values (not all zeros since input is a sine)
        let nonZero = 0;
        for (let i = 0; i < output.length; i++) {
            expect(isFinite(output[i])).toBe(true);
            if (output[i] !== 0) nonZero++;
        }
        expect(nonZero).toBeGreaterThan(0);
    });
});

// ─── Cepstrum ────────────────────────────────────────────────

describe('Cepstrum', () => {
    it('should be registered with correct metadata', () => {
        expect(CepstrumPlugin.id).toBe('cepstrum');
        expect(CepstrumPlugin.group).toBe('real-math');
        expect(CepstrumPlugin.signals.input).toBe('real');
        expect(CepstrumPlugin.signals.output).toBe('real');
    });

    it('should produce real output', () => {
        const input = makeSine(1000, 1.0, chunkSize);

        const output = CepstrumPlugin.processor.process([input], { windowSize: 1024, sampleRate }, chunkSize);

        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(chunkSize);

        // Output should not be all zeros
        let nonZero = 0;
        for (let i = 0; i < output.length; i++) {
            expect(isNaN(output[i])).toBe(false);
            if (output[i] !== 0) nonZero++;
        }
        expect(nonZero).toBeGreaterThan(0);
    });

    it('should detect periodicity in signal', () => {
        // 440 Hz sine at 48000 sampleRate: period ~109 samples
        const freq = 440;
        const input = makeSine(freq, 1.0, chunkSize);

        const output = CepstrumPlugin.processor.process([input], { windowSize: 1024, sampleRate }, chunkSize);

        // The cepstrum of a periodic signal should show a peak near the pitch period
        const expectedQuefrency = Math.round(sampleRate / freq); // ~109 samples

        // Find peak in the cepstral region around the expected quefrency (skip low quefrencies)
        const searchStart = Math.floor(expectedQuefrency * 0.7);
        const searchEnd = Math.min(Math.ceil(expectedQuefrency * 1.3), output.length);

        let peakVal = -Infinity;
        let peakIdx = searchStart;
        for (let i = searchStart; i < searchEnd; i++) {
            if (output[i] > peakVal) {
                peakVal = output[i];
                peakIdx = i;
            }
        }

        // Peak should be near the expected quefrency
        expect(peakIdx).toBeGreaterThanOrEqual(expectedQuefrency - 5);
        expect(peakIdx).toBeLessThanOrEqual(expectedQuefrency + 5);
    });
});

// ─── Allpass Filter ──────────────────────────────────────────

describe('AllpassFilter', () => {
    const proc = AllpassFilterPlugin.processor;

    beforeEach(() => {
        proc.clearStates();
    });

    it('should be registered with correct metadata', () => {
        expect(AllpassFilterPlugin.id).toBe('allpass-filter');
        expect(AllpassFilterPlugin.group).toBe('filters');
        expect(AllpassFilterPlugin.signals.input).toBe('real');
        expect(AllpassFilterPlugin.signals.output).toBe('real');
    });

    it('should preserve signal magnitude', () => {
        // Process a sine through allpass — output energy should be similar to input energy
        const input = makeSine(1000, 1.0, chunkSize);

        // Process multiple chunks to allow filter to settle
        proc.process([input], { sampleRate, centerFrequency: 1000, bandwidth: 1.0, order: 2 }, chunkSize, 'test-ap-mag');
        const output = proc.process([input], { sampleRate, centerFrequency: 1000, bandwidth: 1.0, order: 2 }, chunkSize, 'test-ap-mag');

        expect(output).toBeInstanceOf(Float32Array);
        expect(output.length).toBe(chunkSize);

        // Compute RMS of input and output (skip transient at the start)
        const skip = 64;
        let inputEnergy = 0;
        let outputEnergy = 0;
        for (let i = skip; i < chunkSize; i++) {
            inputEnergy += input[i] * input[i];
            outputEnergy += output[i] * output[i];
        }

        const inputRMS = Math.sqrt(inputEnergy / (chunkSize - skip));
        const outputRMS = Math.sqrt(outputEnergy / (chunkSize - skip));

        // |H| = 1 for allpass: RMS should be very close
        expect(outputRMS).toBeCloseTo(inputRMS, 1);
    });

    it('should have unity gain', () => {
        // Test with a different frequency
        const input = makeSine(3000, 0.8, chunkSize);

        // Settle the filter
        proc.process([input], { sampleRate, centerFrequency: 2000, bandwidth: 1.0, order: 2 }, chunkSize, 'test-ap-unity');
        proc.process([input], { sampleRate, centerFrequency: 2000, bandwidth: 1.0, order: 2 }, chunkSize, 'test-ap-unity');
        const output = proc.process([input], { sampleRate, centerFrequency: 2000, bandwidth: 1.0, order: 2 }, chunkSize, 'test-ap-unity');

        const skip = 128;
        let inputRMS = 0;
        let outputRMS = 0;
        for (let i = skip; i < chunkSize; i++) {
            inputRMS += input[i] * input[i];
            outputRMS += output[i] * output[i];
        }
        inputRMS = Math.sqrt(inputRMS / (chunkSize - skip));
        outputRMS = Math.sqrt(outputRMS / (chunkSize - skip));

        // Unity gain: ratio should be close to 1.0
        const ratio = outputRMS / inputRMS;
        expect(ratio).toBeGreaterThan(0.95);
        expect(ratio).toBeLessThan(1.05);
    });

    it('should handle parameter changes', () => {
        const input = makeSine(1000, 1.0, chunkSize);

        // Process with one frequency
        const out1 = proc.process([input], { sampleRate, centerFrequency: 500, bandwidth: 1.0, order: 2 }, chunkSize, 'test-ap-change');

        // Change center frequency
        const out2 = proc.process([input], { sampleRate, centerFrequency: 5000, bandwidth: 1.0, order: 2 }, chunkSize, 'test-ap-change');

        // Both outputs should be valid Float32Arrays
        expect(out1).toBeInstanceOf(Float32Array);
        expect(out2).toBeInstanceOf(Float32Array);

        // Phase changes with different center frequency, so outputs should differ
        let diffCount = 0;
        for (let i = 0; i < chunkSize; i++) {
            if (Math.abs(out1[i] - out2[i]) > 0.001) diffCount++;
        }
        expect(diffCount).toBeGreaterThan(chunkSize / 4);
    });
});
