import { describe, it, expect } from 'vitest';
import LMSFilterPlugin from '../../src/engine/plugins/filters/LMSFilterPlugin';
import RLSFilterPlugin from '../../src/engine/plugins/filters/RLSFilterPlugin';
import MatchedFilterPlugin from '../../src/engine/plugins/filters/MatchedFilterPlugin';
import ZFEqualizerPlugin from '../../src/engine/plugins/filters/ZFEqualizerPlugin';
import PIDControllerPlugin from '../../src/engine/plugins/filters/PIDControllerPlugin';

describe('LMS Filter', () => {
    const proc = LMSFilterPlugin.processor;

    it('metadata', () => {
        expect(LMSFilterPlugin.id).toBe('lms-filter');
        expect(LMSFilterPlugin.group).toBe('filters');
        expect(LMSFilterPlugin.signals.input).toBe('real');
        expect(LMSFilterPlugin.signals.output).toBe('real');
        expect(LMSFilterPlugin.signals.inputsCount).toBe(2);
    });

    it('produces output of correct length', () => {
        proc.clearStates();
        const signal = new Float32Array(256).fill(1);
        const desired = new Float32Array(256).fill(1);
        const out = proc.process([signal, desired], {
            sampleRate: 48000, ...LMSFilterPlugin.defaultParams
        }, 256, 'test-lms');
        expect(out.length).toBe(256);
    });

    it('converges: error decreases over time', () => {
        proc.clearStates();
        const chunkSize = 1024;
        const signal = new Float32Array(chunkSize);
        const desired = new Float32Array(chunkSize);

        for (let i = 0; i < chunkSize; i++) {
            signal[i] = Math.sin(2 * Math.PI * 100 * i / 48000);
            desired[i] = i > 0 ? 0.5 * signal[i - 1] : 0;
        }

        const out = proc.process([signal, desired], {
            sampleRate: 48000, adaptiveAlgorithm: 'lms', numTaps: 16, stepSize: 0.01
        }, chunkSize, 'test-lms-converge');

        let startError = 0, endError = 0;
        const quarter = Math.floor(chunkSize / 4);
        for (let i = 0; i < quarter; i++) startError += out[i] ** 2;
        for (let i = chunkSize - quarter; i < chunkSize; i++) endError += out[i] ** 2;
        expect(endError).toBeLessThan(startError);
    });

    it('NLMS mode works', () => {
        proc.clearStates();
        const signal = new Float32Array(256);
        const desired = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            signal[i] = Math.random();
            desired[i] = signal[i] * 0.5;
        }
        const out = proc.process([signal, desired], {
            sampleRate: 48000, adaptiveAlgorithm: 'nlms', numTaps: 16, stepSize: 0.5
        }, 256, 'test-nlms');
        expect(out.length).toBe(256);
    });

    it('passes signal through when desired is null', () => {
        proc.clearStates();
        const signal = new Float32Array(64);
        for (let i = 0; i < 64; i++) signal[i] = i * 0.1;
        const out = proc.process([signal, null], { ...LMSFilterPlugin.defaultParams }, 64, 'test-lms-null');
        expect(out[0]).toBeCloseTo(0);
        expect(out[10]).toBeCloseTo(1.0);
    });
});

describe('RLS Filter', () => {
    const proc = RLSFilterPlugin.processor;

    it('metadata', () => {
        expect(RLSFilterPlugin.id).toBe('rls-filter');
        expect(RLSFilterPlugin.group).toBe('filters');
        expect(RLSFilterPlugin.signals.inputsCount).toBe(2);
    });

    it('produces output of correct length', () => {
        proc.clearStates();
        const signal = new Float32Array(128).fill(0.5);
        const desired = new Float32Array(128).fill(0.5);
        const out = proc.process([signal, desired], {
            sampleRate: 48000, ...RLSFilterPlugin.defaultParams
        }, 128, 'test-rls');
        expect(out.length).toBe(128);
    });

    it('converges for simple scenario', () => {
        proc.clearStates();
        const chunkSize = 512;
        const signal = new Float32Array(chunkSize);
        const desired = new Float32Array(chunkSize);

        for (let i = 0; i < chunkSize; i++) {
            signal[i] = Math.sin(2 * Math.PI * 200 * i / 48000);
            desired[i] = i > 0 ? 0.7 * signal[i - 1] : 0;
        }

        const out = proc.process([signal, desired], {
            sampleRate: 48000, numTaps: 8, forgettingFactor: 0.99
        }, chunkSize, 'test-rls-converge');

        let startError = 0, endError = 0;
        const q = Math.floor(chunkSize / 4);
        for (let i = 0; i < q; i++) startError += out[i] ** 2;
        for (let i = chunkSize - q; i < chunkSize; i++) endError += out[i] ** 2;
        expect(endError).toBeLessThanOrEqual(startError);
    });
});

describe('Matched Filter', () => {
    const proc = MatchedFilterPlugin.processor;

    it('metadata', () => {
        expect(MatchedFilterPlugin.id).toBe('matched-filter');
        expect(MatchedFilterPlugin.group).toBe('filters');
        expect(MatchedFilterPlugin.signals.input).toBe('real');
        expect(MatchedFilterPlugin.signals.output).toBe('real');
    });

    it('produces correlation peak for rectangular pulse', () => {
        proc.clearStates();
        const N = 16;
        const chunkSize = 64;
        const input = new Float32Array(chunkSize);
        for (let i = 0; i < N; i++) input[i] = 1;

        const out = proc.process([input], {
            sampleRate: 48000, templateType: 'rectangular', numTaps: N
        }, chunkSize, 'test-mf-rect');

        let maxVal = -Infinity, maxIdx = 0;
        for (let i = 0; i < chunkSize; i++) {
            if (out[i] > maxVal) { maxVal = out[i]; maxIdx = i; }
        }
        expect(maxVal).toBeGreaterThan(0);
        expect(maxIdx).toBeGreaterThanOrEqual(N - 2);
        expect(maxIdx).toBeLessThanOrEqual(N + 1);
    });

    it('supports triangular and sinusoidal templates', () => {
        for (const type of ['triangular', 'sinusoidal']) {
            proc.clearStates();
            const input = new Float32Array(64).fill(0.5);
            const out = proc.process([input], {
                sampleRate: 48000, templateType: type, numTaps: 16
            }, 64, `test-mf-${type}`);
            expect(out.length).toBe(64);
        }
    });
});

describe('ZF Equalizer', () => {
    const proc = ZFEqualizerPlugin.processor;

    it('metadata', () => {
        expect(ZFEqualizerPlugin.id).toBe('zf-equalizer');
        expect(ZFEqualizerPlugin.group).toBe('filters');
        expect(ZFEqualizerPlugin.signals.input).toBe('complex');
        expect(ZFEqualizerPlugin.signals.output).toBe('complex');
    });

    it('first block with estimateChannel returns pilot response', () => {
        proc.clearStates();
        const chunkSize = 256;
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            input[i * 2] = Math.cos(2 * Math.PI * i / chunkSize);
            input[i * 2 + 1] = Math.sin(2 * Math.PI * i / chunkSize);
        }

        const out = proc.process([input], {
            sampleRate: 48000, regularization: 0.001, estimateChannel: true
        }, chunkSize, 'test-zf-pilot');

        expect(out[0]).toBeCloseTo(1, 1);
        expect(out[1]).toBeCloseTo(0, 1);
    });

    it('passthrough when estimateChannel=false and no prior estimate', () => {
        proc.clearStates();
        const chunkSize = 128;
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize * 2; i++) input[i] = i * 0.001;

        const out = proc.process([input], {
            sampleRate: 48000, regularization: 0.001, estimateChannel: false
        }, chunkSize, 'test-zf-pass');

        for (let i = 0; i < chunkSize * 2; i++) {
            expect(out[i]).toBeCloseTo(input[i], 5);
        }
    });
});

describe('PID Controller', () => {
    const proc = PIDControllerPlugin.processor;

    it('metadata', () => {
        expect(PIDControllerPlugin.id).toBe('pid-controller');
        expect(PIDControllerPlugin.group).toBe('filters');
        expect(PIDControllerPlugin.signals.input).toBe('real');
        expect(PIDControllerPlugin.signals.output).toBe('real');
    });

    it('proportional response for step input', () => {
        proc.clearStates();
        const chunkSize = 64;
        const input = new Float32Array(chunkSize).fill(1.0);

        const out = proc.process([input], {
            sampleRate: 48000, kp: 2.0, ki: 0, kd: 0, outputLimit: 100
        }, chunkSize, 'test-pid-p');

        for (let i = 0; i < chunkSize; i++) {
            expect(out[i]).toBeCloseTo(2.0, 1);
        }
    });

    it('integral accumulates over time', () => {
        proc.clearStates();
        const chunkSize = 256;
        const input = new Float32Array(chunkSize).fill(1.0);

        const out = proc.process([input], {
            sampleRate: 48000, kp: 0, ki: 1.0, kd: 0, outputLimit: 100
        }, chunkSize, 'test-pid-i');

        expect(out[chunkSize - 1]).toBeGreaterThan(out[0]);
    });

    it('output is clamped to outputLimit', () => {
        proc.clearStates();
        const chunkSize = 64;
        const input = new Float32Array(chunkSize).fill(100.0);

        const out = proc.process([input], {
            sampleRate: 48000, kp: 1.0, ki: 0, kd: 0, outputLimit: 5.0
        }, chunkSize, 'test-pid-clamp');

        for (let i = 0; i < chunkSize; i++) {
            expect(Math.abs(out[i])).toBeLessThanOrEqual(5.0);
        }
    });
});
