import { describe, it, expect } from 'vitest';
import PeakDetectorPlugin from '../../src/engine/plugins/detectors/PeakDetectorPlugin';
import PitchDetectorPlugin from '../../src/engine/plugins/detectors/PitchDetectorPlugin';
import ZeroCrossingPlugin from '../../src/engine/plugins/detectors/ZeroCrossingPlugin';

describe('Peak Detector', () => {
    const proc = PeakDetectorPlugin.processor;
    const chunkSize = 1024;
    const sampleRate = 48000;

    it('should be registered with correct metadata', () => {
        expect(PeakDetectorPlugin.id).toBe('peak-detector');
        expect(PeakDetectorPlugin.group).toBe('detectors');
        expect(PeakDetectorPlugin.signals.input).toBe('real');
        expect(PeakDetectorPlugin.signals.output).toBe('real');
    });

    it('output length equals chunkSize', () => {
        proc.clearStates();
        const input = new Float32Array(chunkSize);
        for (let i = 0; i < chunkSize; i++) input[i] = Math.sin(2 * Math.PI * 100 * i / sampleRate);
        const out = proc.process([input], { sampleRate, ...PeakDetectorPlugin.defaultParams }, chunkSize, 'test-peak-len');
        expect(out.length).toBe(chunkSize);
    });

    it('peak value is held (not immediately decaying)', () => {
        proc.clearStates();
        const input = new Float32Array(chunkSize);
        // Impulse at the beginning, then silence
        input[0] = 1.0;
        const out = proc.process([input], { sampleRate, ...PeakDetectorPlugin.defaultParams }, chunkSize, 'test-peak-hold');

        // Peak should be held for a while (holdTime=500ms = 24000 samples >> chunkSize)
        // So values near the end should still be close to the peak
        expect(out[0]).toBeGreaterThan(0);
        expect(out[chunkSize - 1]).toBeCloseTo(out[100], 1);
    });

    it('for constant signal, output approximates |input|', () => {
        proc.clearStates();
        const amplitude = 0.7;
        const input = new Float32Array(chunkSize).fill(amplitude);
        const out = proc.process([input], { sampleRate, ...PeakDetectorPlugin.defaultParams }, chunkSize, 'test-peak-const');

        // After attack settles, output should approach the constant amplitude
        const last = out[chunkSize - 1];
        expect(last).toBeGreaterThan(amplitude * 0.5);
        expect(last).toBeLessThanOrEqual(amplitude + 0.01);
    });

    it('silent input causes output to approach 0', () => {
        proc.clearStates();
        // First feed a signal to build up peak
        const loud = new Float32Array(chunkSize).fill(1.0);
        proc.process([loud], { sampleRate, ...PeakDetectorPlugin.defaultParams }, chunkSize, 'test-peak-silent');

        // Now feed many silent chunks to let it decay (holdTime=500ms, releaseTime=100ms)
        let out;
        for (let c = 0; c < 50; c++) {
            const silent = new Float32Array(chunkSize).fill(0);
            out = proc.process([silent], { sampleRate, ...PeakDetectorPlugin.defaultParams }, chunkSize, 'test-peak-silent');
        }
        // After ~50 chunks of silence (~1 second at 48kHz), output should be near 0
        expect(out[chunkSize - 1]).toBeLessThan(0.1);
    });
});

describe('Pitch Detector', () => {
    const proc = PitchDetectorPlugin.processor;
    const chunkSize = 2048;
    const sampleRate = 48000;

    it('should be registered with correct metadata', () => {
        expect(PitchDetectorPlugin.id).toBe('pitch-detector');
        expect(PitchDetectorPlugin.group).toBe('detectors');
        expect(PitchDetectorPlugin.signals.input).toBe('real');
        expect(PitchDetectorPlugin.signals.output).toBe('real');
    });

    it('output length equals chunkSize', () => {
        proc.clearStates();
        const input = new Float32Array(chunkSize);
        for (let i = 0; i < chunkSize; i++) input[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
        const out = proc.process([input], { sampleRate, ...PitchDetectorPlugin.defaultParams }, chunkSize, 'test-pitch-len');
        expect(out.length).toBe(chunkSize);
    });

    it('detects 440 Hz sine within 10%', () => {
        proc.clearStates();
        const freq = 440;
        // Feed multiple chunks so the autocorrelation has enough data
        let out;
        for (let c = 0; c < 5; c++) {
            const input = new Float32Array(chunkSize);
            for (let i = 0; i < chunkSize; i++) {
                const t = (c * chunkSize + i);
                input[i] = Math.sin(2 * Math.PI * freq * t / sampleRate);
            }
            out = proc.process([input], { sampleRate, ...PitchDetectorPlugin.defaultParams }, chunkSize, 'test-pitch-440');
        }

        // Check the last sample of the last chunk — should have a stable pitch estimate
        const detectedPitch = out[chunkSize - 1];
        expect(detectedPitch).toBeGreaterThan(freq * 0.9);
        expect(detectedPitch).toBeLessThan(freq * 1.1);
    });

    it('silent input yields pitch = 0', () => {
        proc.clearStates();
        const silent = new Float32Array(chunkSize).fill(0);
        // Feed enough chunks for buffer to wrap
        let out;
        for (let c = 0; c < 3; c++) {
            out = proc.process([silent], { sampleRate, ...PitchDetectorPlugin.defaultParams }, chunkSize, 'test-pitch-silent');
        }
        expect(out[chunkSize - 1]).toBe(0);
    });
});

describe('Zero Crossing', () => {
    const proc = ZeroCrossingPlugin.processor;
    const chunkSize = 1024;
    const sampleRate = 48000;

    it('should be registered with correct metadata', () => {
        expect(ZeroCrossingPlugin.id).toBe('zero-crossing');
        expect(ZeroCrossingPlugin.group).toBe('detectors');
        expect(ZeroCrossingPlugin.signals.input).toBe('real');
        expect(ZeroCrossingPlugin.signals.output).toBe('real');
    });

    it('output length equals chunkSize', () => {
        proc.clearStates();
        const input = new Float32Array(chunkSize);
        for (let i = 0; i < chunkSize; i++) input[i] = Math.sin(2 * Math.PI * 1000 * i / sampleRate);
        const out = proc.process([input], { sampleRate, ...ZeroCrossingPlugin.defaultParams }, chunkSize, 'test-zc-len');
        expect(out.length).toBe(chunkSize);
    });

    it('detects 1000 Hz sine within 10%', () => {
        proc.clearStates();
        const freq = 1000;
        // Feed multiple chunks to get stable estimate
        let out;
        for (let c = 0; c < 5; c++) {
            const input = new Float32Array(chunkSize);
            for (let i = 0; i < chunkSize; i++) {
                const t = (c * chunkSize + i);
                input[i] = Math.sin(2 * Math.PI * freq * t / sampleRate);
            }
            out = proc.process([input], { sampleRate, ...ZeroCrossingPlugin.defaultParams }, chunkSize, 'test-zc-1000');
        }

        const detectedFreq = out[chunkSize - 1];
        expect(detectedFreq).toBeGreaterThan(freq * 0.9);
        expect(detectedFreq).toBeLessThan(freq * 1.1);
    });

    it('DC signal yields frequency = 0', () => {
        proc.clearStates();
        // A constant positive signal has no zero crossings
        let out;
        for (let c = 0; c < 3; c++) {
            const dc = new Float32Array(chunkSize).fill(1.0);
            out = proc.process([dc], { sampleRate, ...ZeroCrossingPlugin.defaultParams }, chunkSize, 'test-zc-dc');
        }
        expect(out[chunkSize - 1]).toBe(0);
    });
});
