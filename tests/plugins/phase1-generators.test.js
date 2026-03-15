import { describe, it, expect } from 'vitest';
import SquareWavePlugin from '../../src/engine/plugins/generators/SquareWavePlugin';
import TriangleWavePlugin from '../../src/engine/plugins/generators/TriangleWavePlugin';
import ImpulsePlugin from '../../src/engine/plugins/generators/ImpulsePlugin';
import ChirpPlugin from '../../src/engine/plugins/generators/ChirpPlugin';
import StepPlugin from '../../src/engine/plugins/generators/StepPlugin';

describe('SquareWave', () => {
    const proc = SquareWavePlugin.processor;

    it('metadata', () => {
        expect(SquareWavePlugin.id).toBe('square-wave');
        expect(SquareWavePlugin.signals.input).toBeNull();
        expect(SquareWavePlugin.signals.output).toBe('real');
    });

    it('generates correct length output', () => {
        proc.clearStates();
        const out = proc.process([], { frequency: 1000, amplitude: 1, dutyCycle: 0.5, sampleRate: 48000 }, 1024, 'n1');
        expect(out).toBeInstanceOf(Float32Array);
        expect(out.length).toBe(1024);
    });

    it('duty cycle 0.5 — equal positive and negative samples', () => {
        proc.clearStates();
        const sr = 1000;
        const freq = 10; // 10 Hz → 100 samples/cycle, exactly 10 cycles in 1000 samples
        const out = proc.process([], { frequency: freq, amplitude: 1, dutyCycle: 0.5, sampleRate: sr }, 1000, 'n2');
        let pos = 0, neg = 0;
        for (let i = 0; i < 1000; i++) {
            if (out[i] > 0) pos++;
            else neg++;
        }
        expect(pos).toBe(500);
        expect(neg).toBe(500);
    });

    it('amplitude is respected', () => {
        proc.clearStates();
        const out = proc.process([], { frequency: 100, amplitude: 0.7, dutyCycle: 0.5, sampleRate: 48000 }, 512, 'n3');
        for (let i = 0; i < 512; i++) {
            expect(Math.abs(out[i])).toBeCloseTo(0.7, 5);
        }
    });

    it('duty cycle 0.1 — short positive pulses', () => {
        proc.clearStates();
        const sr = 1000;
        const freq = 10;
        const out = proc.process([], { frequency: freq, amplitude: 1, dutyCycle: 0.1, sampleRate: sr }, 1000, 'n4');
        let pos = 0;
        for (let i = 0; i < 1000; i++) if (out[i] > 0) pos++;
        // ~10% of 1000, allow ±2 for rounding
        expect(pos).toBeGreaterThanOrEqual(99);
        expect(pos).toBeLessThanOrEqual(102);
    });
});

describe('TriangleWave', () => {
    const proc = TriangleWavePlugin.processor;

    it('metadata', () => {
        expect(TriangleWavePlugin.id).toBe('triangle-wave');
        expect(TriangleWavePlugin.signals.output).toBe('real');
    });

    it('generates correct length', () => {
        proc.clearStates();
        const out = proc.process([], { frequency: 1000, amplitude: 1, symmetry: 0.5, sampleRate: 48000 }, 1024, 'n1');
        expect(out.length).toBe(1024);
    });

    it('amplitude is bounded', () => {
        proc.clearStates();
        const out = proc.process([], { frequency: 100, amplitude: 0.8, symmetry: 0.5, sampleRate: 48000 }, 4096, 'n2');
        for (let i = 0; i < out.length; i++) {
            expect(Math.abs(out[i])).toBeLessThanOrEqual(0.801);
        }
    });

    it('symmetry=0 generates sawtooth (mostly rising)', () => {
        proc.clearStates();
        // With symmetry close to 0, output rises slowly and drops quickly
        const out = proc.process([], { frequency: 10, amplitude: 1, symmetry: 0.001, sampleRate: 1000 }, 100, 'n3');
        // First sample should be near -1 (start of rising phase)
        expect(out[0]).toBeCloseTo(-1, 0);
    });
});

describe('Impulse', () => {
    const proc = ImpulsePlugin.processor;

    it('metadata', () => {
        expect(ImpulsePlugin.id).toBe('impulse');
    });

    it('single impulse at first sample (period=0)', () => {
        proc.clearStates();
        const out = proc.process([], { period: 0, amplitude: 1 }, 1024, 'n1');
        expect(out[0]).toBe(1);
        for (let i = 1; i < 1024; i++) {
            expect(out[i]).toBe(0);
        }
    });

    it('single impulse does not repeat in second chunk', () => {
        proc.clearStates();
        proc.process([], { period: 0, amplitude: 1 }, 1024, 'n2');
        const out2 = proc.process([], { period: 0, amplitude: 1 }, 1024, 'n2');
        for (let i = 0; i < 1024; i++) {
            expect(out2[i]).toBe(0);
        }
    });

    it('periodic impulses (period=100)', () => {
        proc.clearStates();
        const out = proc.process([], { period: 100, amplitude: 2.5 }, 500, 'n3');
        // Impulses at 0, 100, 200, 300, 400
        expect(out[0]).toBe(2.5);
        expect(out[100]).toBe(2.5);
        expect(out[200]).toBe(2.5);
        expect(out[50]).toBe(0);
        expect(out[150]).toBe(0);
    });
});

describe('Chirp', () => {
    const proc = ChirpPlugin.processor;

    it('metadata', () => {
        expect(ChirpPlugin.id).toBe('chirp');
    });

    it('generates correct length', () => {
        proc.clearStates();
        const out = proc.process([], { startFrequency: 100, endFrequency: 10000, duration: 1, amplitude: 1, sweepType: 'linear', sampleRate: 48000 }, 1024, 'n1');
        expect(out).toBeInstanceOf(Float32Array);
        expect(out.length).toBe(1024);
    });

    it('amplitude is bounded', () => {
        proc.clearStates();
        const out = proc.process([], { startFrequency: 100, endFrequency: 5000, duration: 0.5, amplitude: 0.9, sweepType: 'linear', sampleRate: 48000 }, 4096, 'n2');
        for (let i = 0; i < out.length; i++) {
            expect(Math.abs(out[i])).toBeLessThanOrEqual(0.901);
        }
    });

    it('exponential sweep works', () => {
        proc.clearStates();
        const out = proc.process([], { startFrequency: 100, endFrequency: 10000, duration: 1, amplitude: 1, sweepType: 'exponential', sampleRate: 48000 }, 1024, 'n3');
        expect(out.length).toBe(1024);
        // Should not contain NaN
        for (let i = 0; i < out.length; i++) {
            expect(isFinite(out[i])).toBe(true);
        }
    });
});

describe('Step', () => {
    const proc = StepPlugin.processor;

    it('metadata', () => {
        expect(StepPlugin.id).toBe('step');
    });

    it('step at correct time', () => {
        proc.clearStates();
        // stepTime=0.01s at 48000 Hz → step at sample 480
        const out = proc.process([], { stepTime: 0.01, amplitude: 1, sampleRate: 48000 }, 1024, 'n1');
        expect(out[0]).toBe(0);
        expect(out[479]).toBe(0);
        expect(out[480]).toBe(1);
        expect(out[1023]).toBe(1);
    });

    it('step at t=0 gives all ones', () => {
        proc.clearStates();
        const out = proc.process([], { stepTime: 0, amplitude: 2, sampleRate: 48000 }, 512, 'n2');
        for (let i = 0; i < 512; i++) {
            expect(out[i]).toBe(2);
        }
    });
});
