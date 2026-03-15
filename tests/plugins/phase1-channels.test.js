import { describe, it, expect } from 'vitest';
import AWGNChannelPlugin from '../../src/engine/plugins/channels/AWGNChannelPlugin';

describe('AWGNChannel', () => {
    const proc = AWGNChannelPlugin.processor;

    it('metadata', () => {
        expect(AWGNChannelPlugin.id).toBe('awgn-channel');
        expect(AWGNChannelPlugin.group).toBe('channels');
        expect(AWGNChannelPlugin.signals.input).toBe('real');
        expect(AWGNChannelPlugin.signals.output).toBe('real');
    });

    it('returns correct length', () => {
        const input = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) input[i] = Math.sin(2 * Math.PI * 1000 * i / 48000);
        const out = proc.process([input], { snr: 20 }, 1024);
        expect(out).toBeInstanceOf(Float32Array);
        expect(out.length).toBe(1024);
    });

    it('output differs from input (noise added)', () => {
        const input = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) input[i] = Math.sin(2 * Math.PI * 1000 * i / 48000);
        const out = proc.process([input], { snr: 10 }, 1024);
        let diffCount = 0;
        for (let i = 0; i < 1024; i++) {
            if (Math.abs(out[i] - input[i]) > 1e-10) diffCount++;
        }
        expect(diffCount).toBeGreaterThan(900); // Almost all samples should differ
    });

    it('high SNR means low noise', () => {
        const input = new Float32Array(4096);
        for (let i = 0; i < 4096; i++) input[i] = Math.sin(2 * Math.PI * 1000 * i / 48000);
        const out = proc.process([input], { snr: 60 }, 4096);
        let maxDiff = 0;
        for (let i = 0; i < 4096; i++) {
            const diff = Math.abs(out[i] - input[i]);
            if (diff > maxDiff) maxDiff = diff;
        }
        expect(maxDiff).toBeLessThan(0.01);
    });

    it('low SNR means high noise', () => {
        const input = new Float32Array(4096);
        for (let i = 0; i < 4096; i++) input[i] = Math.sin(2 * Math.PI * 1000 * i / 48000);
        const out = proc.process([input], { snr: 0 }, 4096);
        let sumDiffSq = 0;
        for (let i = 0; i < 4096; i++) {
            const diff = out[i] - input[i];
            sumDiffSq += diff * diff;
        }
        const noisePower = sumDiffSq / 4096;
        expect(noisePower).toBeGreaterThan(0.1);
    });

    it('returns zeros for null input', () => {
        const out = proc.process([null], { snr: 20 }, 512);
        for (let i = 0; i < 512; i++) expect(out[i]).toBe(0);
    });
});
