import { describe, it, expect } from 'vitest';
import FadingChannelPlugin from '../../src/engine/plugins/channels/FadingChannelPlugin';
import MultipathChannelPlugin from '../../src/engine/plugins/channels/MultipathChannelPlugin';

describe('Fading Channel', () => {
    const proc = FadingChannelPlugin.processor;

    it('metadata', () => {
        expect(FadingChannelPlugin.id).toBe('fading-channel');
        expect(FadingChannelPlugin.group).toBe('channels');
        expect(FadingChannelPlugin.signals.input).toBe('complex');
        expect(FadingChannelPlugin.signals.output).toBe('complex');
    });

    it('produces complex output of correct length', () => {
        proc.clearStates();
        const chunkSize = 256;
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            input[i * 2] = 1.0;
            input[i * 2 + 1] = 0;
        }

        const out = proc.process([input], {
            sampleRate: 48000, fadingType: 'rayleigh', dopplerFrequency: 10
        }, chunkSize, 'test-fading');
        expect(out.length).toBe(chunkSize * 2);
    });

    it('Rayleigh fading modifies the signal', () => {
        proc.clearStates();
        const chunkSize = 512;
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            input[i * 2] = 1.0;
            input[i * 2 + 1] = 0;
        }

        const out = proc.process([input], {
            sampleRate: 48000, fadingType: 'rayleigh', dopplerFrequency: 100
        }, chunkSize, 'test-rayleigh');

        let diff = 0;
        for (let i = 0; i < chunkSize; i++) {
            diff += Math.abs(out[i * 2] - input[i * 2]);
            diff += Math.abs(out[i * 2 + 1] - input[i * 2 + 1]);
        }
        expect(diff / chunkSize).toBeGreaterThan(0.01);
    });

    it('Rician fading has stronger LOS component', () => {
        proc.clearStates();
        const chunkSize = 1024;
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            input[i * 2] = 1.0;
            input[i * 2 + 1] = 0;
        }

        const out = proc.process([input], {
            sampleRate: 48000, fadingType: 'rician', dopplerFrequency: 10, kFactor: 20
        }, chunkSize, 'test-rician');

        let avgI = 0;
        for (let i = 0; i < chunkSize; i++) avgI += out[i * 2];
        avgI /= chunkSize;
        expect(avgI).toBeGreaterThan(0.5);
    });

    it('returns zeros for null input', () => {
        proc.clearStates();
        const out = proc.process([null], {
            sampleRate: 48000, ...FadingChannelPlugin.defaultParams
        }, 128, 'test-fading-null');
        for (let i = 0; i < 256; i++) {
            expect(out[i]).toBe(0);
        }
    });
});

describe('Multipath Channel', () => {
    const proc = MultipathChannelPlugin.processor;

    it('metadata', () => {
        expect(MultipathChannelPlugin.id).toBe('multipath-channel');
        expect(MultipathChannelPlugin.group).toBe('channels');
        expect(MultipathChannelPlugin.signals.input).toBe('complex');
        expect(MultipathChannelPlugin.signals.output).toBe('complex');
    });

    it('single path with zero delay is passthrough', () => {
        proc.clearStates();
        const chunkSize = 64;
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            input[i * 2] = Math.sin(i * 0.1);
            input[i * 2 + 1] = Math.cos(i * 0.1);
        }

        const out = proc.process([input], {
            sampleRate: 48000, delays: '0', gains: '1.0'
        }, chunkSize, 'test-mp-pass');

        for (let i = 0; i < chunkSize * 2; i++) {
            expect(out[i]).toBeCloseTo(input[i], 5);
        }
    });

    it('delayed path produces shifted output', () => {
        proc.clearStates();
        const chunkSize = 32;
        const input = new Float32Array(chunkSize * 2);
        input[0] = 1.0;
        input[1] = 0.5;

        const out = proc.process([input], {
            sampleRate: 48000, delays: '0,3', gains: '1.0,0.5'
        }, chunkSize, 'test-mp-delay');

        expect(out[0]).toBeCloseTo(1.0);
        expect(out[1]).toBeCloseTo(0.5);
        expect(out[6]).toBeCloseTo(0.5);
        expect(out[7]).toBeCloseTo(0.25);
    });

    it('multiple paths sum correctly', () => {
        proc.clearStates();
        const chunkSize = 16;
        const input = new Float32Array(chunkSize * 2);
        input[0] = 1.0;

        const out = proc.process([input], {
            sampleRate: 48000, delays: '0,0', gains: '0.6,0.4'
        }, chunkSize, 'test-mp-sum');

        expect(out[0]).toBeCloseTo(1.0, 5);
    });

    it('returns zeros for null input', () => {
        proc.clearStates();
        const out = proc.process([null], {
            sampleRate: 48000, ...MultipathChannelPlugin.defaultParams
        }, 64, 'test-mp-null');
        for (let i = 0; i < 128; i++) {
            expect(out[i]).toBe(0);
        }
    });
});
