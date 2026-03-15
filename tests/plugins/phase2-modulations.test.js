import { describe, it, expect } from 'vitest';
import QAMModulatorPlugin from '../../src/engine/plugins/generators/QAMModulatorPlugin';
import QAMDemodulatorPlugin from '../../src/engine/plugins/detectors/QAMDemodulatorPlugin';
import PulseShaperPlugin from '../../src/engine/plugins/filters/PulseShaperPlugin';

describe('QAM Modulator', () => {
    const proc = QAMModulatorPlugin.processor;

    it('metadata', () => {
        expect(QAMModulatorPlugin.id).toBe('qam-modulator');
        expect(QAMModulatorPlugin.group).toBe('generators');
        expect(QAMModulatorPlugin.signals.input).toBeNull();
        expect(QAMModulatorPlugin.signals.output).toBe('complex');
    });

    it('produces complex output of correct length', () => {
        proc.clearStates();
        const out = proc.process([], { sampleRate: 48000, qamOrder: '16QAM', symbolRate: 1000, amplitude: 1.0 }, 1024, 'test-qam');
        expect(out).toBeInstanceOf(Float32Array);
        expect(out.length).toBe(2048);
    });

    it('produces non-zero output', () => {
        proc.clearStates();
        const out = proc.process([], { sampleRate: 48000, qamOrder: '16QAM', symbolRate: 1000, amplitude: 1.0 }, 1024, 'test-qam2');
        let nonZero = false;
        for (let i = 0; i < out.length; i++) {
            if (out[i] !== 0) { nonZero = true; break; }
        }
        expect(nonZero).toBe(true);
    });

    it('16QAM constellation points have normalized power ≈ 1', () => {
        proc.clearStates();
        const chunkSize = 4096;
        const out = proc.process([], {
            sampleRate: 48000, qamOrder: '16QAM', symbolRate: 48000, amplitude: 1.0
        }, chunkSize, 'test-qam-norm');

        let totalPower = 0;
        for (let i = 0; i < chunkSize; i++) {
            totalPower += out[i * 2] ** 2 + out[i * 2 + 1] ** 2;
        }
        const avgPower = totalPower / chunkSize;
        expect(avgPower).toBeGreaterThan(0.5);
        expect(avgPower).toBeLessThan(2.0);
    });

    it('supports 64QAM and 256QAM orders', () => {
        for (const order of ['64QAM', '256QAM']) {
            proc.clearStates();
            const out = proc.process([], {
                sampleRate: 48000, qamOrder: order, symbolRate: 1000, amplitude: 1.0
            }, 256, `test-qam-${order}`);
            expect(out.length).toBe(512);
        }
    });
});

describe('QAM Demodulator', () => {
    const modProc = QAMModulatorPlugin.processor;
    const demodProc = QAMDemodulatorPlugin.processor;

    it('metadata', () => {
        expect(QAMDemodulatorPlugin.id).toBe('qam-demodulator');
        expect(QAMDemodulatorPlugin.group).toBe('detectors');
        expect(QAMDemodulatorPlugin.signals.input).toBe('complex');
        expect(QAMDemodulatorPlugin.signals.output).toBe('real');
    });

    it('hard decision produces output in [0, 1]', () => {
        modProc.clearStates();
        demodProc.clearStates();
        const chunkSize = 1024;

        const modOut = modProc.process([], {
            sampleRate: 48000, qamOrder: '16QAM', symbolRate: 48000, amplitude: 1.0
        }, chunkSize, 'test-demod-mod');

        const demodOut = demodProc.process([modOut], {
            sampleRate: 48000, qamOrder: '16QAM', decisionType: 'hard', symbolRate: 48000
        }, chunkSize, 'test-demod');

        for (let i = 0; i < chunkSize; i++) {
            expect(demodOut[i]).toBeGreaterThanOrEqual(0);
            expect(demodOut[i]).toBeLessThanOrEqual(1);
        }
    });

    it('soft decision produces real LLR values', () => {
        modProc.clearStates();
        demodProc.clearStates();
        const chunkSize = 256;

        const modOut = modProc.process([], {
            sampleRate: 48000, qamOrder: '16QAM', symbolRate: 48000, amplitude: 1.0
        }, chunkSize, 'test-soft-mod');

        const demodOut = demodProc.process([modOut], {
            sampleRate: 48000, qamOrder: '16QAM', decisionType: 'soft', symbolRate: 48000
        }, chunkSize, 'test-soft-demod');

        expect(demodOut.length).toBe(chunkSize);
        let hasNonZero = false;
        for (let i = 0; i < chunkSize; i++) {
            if (demodOut[i] !== 0) { hasNonZero = true; break; }
        }
        expect(hasNonZero).toBe(true);
    });

    it('returns zeros for null input', () => {
        demodProc.clearStates();
        const out = demodProc.process([null], { ...QAMDemodulatorPlugin.defaultParams }, 128, 'test-null');
        for (let i = 0; i < 128; i++) {
            expect(out[i]).toBe(0);
        }
    });
});

describe('Pulse Shaper', () => {
    const proc = PulseShaperPlugin.processor;

    it('metadata', () => {
        expect(PulseShaperPlugin.id).toBe('pulse-shaper');
        expect(PulseShaperPlugin.group).toBe('filters');
        expect(PulseShaperPlugin.signals.input).toBe('complex');
        expect(PulseShaperPlugin.signals.output).toBe('complex');
    });

    it('produces complex output', () => {
        proc.clearStates();
        const input = new Float32Array(512);
        input[0] = 1.0;
        const out = proc.process([input], {
            sampleRate: 48000, pulseType: 'rrc', rolloffFactor: 0.35, samplesPerSymbol: 4, numTaps: 33
        }, 256, 'test-pulse');
        expect(out.length).toBe(512);
    });

    it('shapes impulse into RRC form', () => {
        proc.clearStates();
        const chunkSize = 64;
        const input = new Float32Array(chunkSize * 2);
        input[0] = 1.0;
        const out = proc.process([input], {
            sampleRate: 48000, pulseType: 'rrc', rolloffFactor: 0.35, samplesPerSymbol: 4, numTaps: 33
        }, chunkSize, 'test-rrc-shape');

        let maxVal = 0;
        for (let i = 0; i < chunkSize; i++) {
            maxVal = Math.max(maxVal, Math.abs(out[i * 2]));
        }
        expect(maxVal).toBeGreaterThan(0);
    });

    it('supports RC and Gaussian types', () => {
        for (const type of ['rc', 'gaussian']) {
            proc.clearStates();
            const input = new Float32Array(128);
            input[0] = 1.0;
            const out = proc.process([input], {
                sampleRate: 48000, pulseType: type, rolloffFactor: 0.35, samplesPerSymbol: 4, numTaps: 33
            }, 64, `test-${type}`);
            expect(out.length).toBe(128);
        }
    });
});
