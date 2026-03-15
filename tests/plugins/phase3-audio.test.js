import { describe, it, expect, beforeEach } from 'vitest';
import CompressorPlugin from '../../src/engine/plugins/audio/CompressorPlugin';
import EqualizerPlugin from '../../src/engine/plugins/audio/EqualizerPlugin';
import ReverbPlugin from '../../src/engine/plugins/audio/ReverbPlugin';

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

// ─── Compressor ──────────────────────────────────────────────

describe('Compressor', () => {
    const proc = CompressorPlugin.processor;

    beforeEach(() => {
        proc.clearStates();
    });

    it('should be registered with correct metadata', () => {
        expect(CompressorPlugin.id).toBe('compressor');
        expect(CompressorPlugin.group).toBe('audio');
        expect(CompressorPlugin.signals.input).toBe('real');
        expect(CompressorPlugin.signals.output).toBe('real');
    });

    it('output length equals chunkSize', () => {
        const input = makeSine(1000, 1.0, chunkSize);
        const out = proc.process([input], { sampleRate }, chunkSize, 'test-comp-len');
        expect(out).toBeInstanceOf(Float32Array);
        expect(out.length).toBe(chunkSize);
    });

    it('loud signal is compressed below input level', () => {
        const input = makeSine(440, 2.0, chunkSize);
        const out = proc.process([input], {
            sampleRate,
            threshold: -6,
            ratio: 4,
            attackTime: 0.1,
            releaseTime: 0.1,
            makeupGain: 0
        }, chunkSize, 'test-comp-loud');

        // After envelope settles, compressed peaks should be lower than input peaks
        let inputEnergy = 0;
        let outputEnergy = 0;
        const skip = Math.floor(chunkSize / 4); // skip attack transient
        for (let i = skip; i < chunkSize; i++) {
            inputEnergy += input[i] * input[i];
            outputEnergy += out[i] * out[i];
        }
        expect(outputEnergy).toBeLessThan(inputEnergy);
    });

    it('silent input produces silent output', () => {
        const input = new Float32Array(chunkSize); // all zeros
        const out = proc.process([input], { sampleRate }, chunkSize, 'test-comp-silent');
        for (let i = 0; i < chunkSize; i++) {
            expect(out[i]).toBe(0);
        }
    });

    it('threshold 0 dB with ratio 1 acts as passthrough', () => {
        const input = makeSine(1000, 0.5, chunkSize);
        const out = proc.process([input], {
            sampleRate,
            threshold: 0,
            ratio: 1,
            attackTime: 5,
            releaseTime: 50,
            makeupGain: 0
        }, chunkSize, 'test-comp-pass');

        // ratio=1 means no compression, threshold=0dB means nothing exceeds threshold for amp<1
        for (let i = 0; i < chunkSize; i++) {
            expect(out[i]).toBeCloseTo(input[i], 2);
        }
    });
});

// ─── Equalizer ───────────────────────────────────────────────

describe('Equalizer', () => {
    const proc = EqualizerPlugin.processor;

    beforeEach(() => {
        proc.clearStates();
    });

    it('should be registered with correct metadata', () => {
        expect(EqualizerPlugin.id).toBe('equalizer');
        expect(EqualizerPlugin.group).toBe('audio');
        expect(EqualizerPlugin.signals.input).toBe('real');
        expect(EqualizerPlugin.signals.output).toBe('real');
    });

    it('output length equals chunkSize', () => {
        const input = makeSine(1000, 1.0, chunkSize);
        const out = proc.process([input], { sampleRate }, chunkSize, 'test-eq-len');
        expect(out).toBeInstanceOf(Float32Array);
        expect(out.length).toBe(chunkSize);
    });

    it('all gains at 0 dB approximates passthrough', () => {
        const input = makeSine(1000, 1.0, chunkSize);
        const out = proc.process([input], {
            sampleRate,
            lowFreq: 200, lowGain: 0, lowQ: 0.7,
            midFreq: 1000, midGain: 0, midQ: 0.7,
            highFreq: 5000, highGain: 0, highQ: 0.7
        }, chunkSize, 'test-eq-flat');

        // Allow biquad transient at start; check steady-state portion
        const skip = 64;
        for (let i = skip; i < chunkSize; i++) {
            expect(Math.abs(out[i] - input[i])).toBeLessThan(0.01);
        }
    });

    it('non-zero gain changes the signal', () => {
        const input = makeSine(1000, 1.0, chunkSize);
        const out = proc.process([input], {
            sampleRate,
            lowFreq: 200, lowGain: 0, lowQ: 0.7,
            midFreq: 1000, midGain: 12, midQ: 0.7,
            highFreq: 5000, highGain: 0, highQ: 0.7
        }, chunkSize, 'test-eq-boost');

        let diffCount = 0;
        for (let i = 0; i < chunkSize; i++) {
            if (Math.abs(out[i] - input[i]) > 0.01) diffCount++;
        }
        expect(diffCount).toBeGreaterThan(chunkSize / 2);
    });
});

// ─── Reverb ──────────────────────────────────────────────────

describe('Reverb', () => {
    const proc = ReverbPlugin.processor;

    beforeEach(() => {
        proc.clearStates();
    });

    it('should be registered with correct metadata', () => {
        expect(ReverbPlugin.id).toBe('reverb');
        expect(ReverbPlugin.group).toBe('audio');
        expect(ReverbPlugin.signals.input).toBe('real');
        expect(ReverbPlugin.signals.output).toBe('real');
    });

    it('output length equals chunkSize', () => {
        const input = makeSine(1000, 1.0, chunkSize);
        const out = proc.process([input], {
            sampleRate, roomSize: 0.5, damping: 0.5, mix: 0.3
        }, chunkSize, 'test-rev-len');
        expect(out).toBeInstanceOf(Float32Array);
        expect(out.length).toBe(chunkSize);
    });

    it('mix=0 produces output approximately equal to input (dry only)', () => {
        const input = makeSine(440, 1.0, chunkSize);
        const out = proc.process([input], {
            sampleRate, roomSize: 0.5, damping: 0.5, mix: 0
        }, chunkSize, 'test-rev-dry');

        for (let i = 0; i < chunkSize; i++) {
            expect(Math.abs(out[i] - input[i])).toBeLessThan(1e-6);
        }
    });

    it('mix=1 produces output that differs from input', () => {
        const input = makeSine(440, 1.0, chunkSize);
        const out = proc.process([input], {
            sampleRate, roomSize: 0.5, damping: 0.5, mix: 1
        }, chunkSize, 'test-rev-wet');

        let diffCount = 0;
        for (let i = 0; i < chunkSize; i++) {
            if (Math.abs(out[i] - input[i]) > 0.001) diffCount++;
        }
        expect(diffCount).toBeGreaterThan(chunkSize / 2);
    });

    it('impulse response has a decaying tail', () => {
        // Feed an impulse, then silence, collecting multiple chunks to let the tail develop
        const impulse = new Float32Array(chunkSize);
        impulse[0] = 1.0;
        const silence = new Float32Array(chunkSize);
        const reverbParams = { sampleRate, roomSize: 0.5, damping: 0.5, mix: 1 };
        const nodeId = 'test-rev-tail';

        // Process impulse + 3 chunks of silence to capture the full tail
        const allSamples = [];
        const out1 = proc.process([impulse], reverbParams, chunkSize, nodeId);
        for (let i = 0; i < out1.length; i++) allSamples.push(out1[i]);
        for (let c = 0; c < 3; c++) {
            const out = proc.process([silence], reverbParams, chunkSize, nodeId);
            for (let i = 0; i < out.length; i++) allSamples.push(out[i]);
        }

        const totalLen = allSamples.length;

        // Find the peak (skip sample 0)
        let peakIdx = 1;
        let peakVal = 0;
        for (let i = 1; i < totalLen; i++) {
            if (Math.abs(allSamples[i]) > peakVal) {
                peakVal = Math.abs(allSamples[i]);
                peakIdx = i;
            }
        }

        // Energy in the first half after peak should be greater than the second half (decaying)
        const midPoint = Math.floor((peakIdx + totalLen) / 2);
        let energyFirst = 0;
        let energySecond = 0;
        for (let i = peakIdx; i < midPoint; i++) {
            energyFirst += allSamples[i] * allSamples[i];
        }
        for (let i = midPoint; i < totalLen; i++) {
            energySecond += allSamples[i] * allSamples[i];
        }

        expect(peakVal).toBeGreaterThan(0);
        expect(energyFirst).toBeGreaterThan(energySecond);
    });
});
