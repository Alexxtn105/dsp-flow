import { describe, it, expect } from 'vitest';
import THDMeterPlugin from '../../src/engine/plugins/visualization/THDMeterPlugin';
import PoleZeroDiagramPlugin from '../../src/engine/plugins/visualization/PoleZeroDiagramPlugin';
import PhasePortraitPlugin from '../../src/engine/plugins/visualization/PhasePortraitPlugin';
import GroupDelayPlotPlugin from '../../src/engine/plugins/visualization/GroupDelayPlotPlugin';

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

// ─── THD Meter ───────────────────────────────────────────────

describe('THDMeter', () => {
    it('should be registered with correct metadata', () => {
        expect(THDMeterPlugin.id).toBe('thd-meter');
        expect(THDMeterPlugin.group).toBe('visualization');
        expect(THDMeterPlugin.signals.input).toBe('real');
        expect(THDMeterPlugin.signals.output).toBeNull();
    });

    it('should measure low THD for pure sine', () => {
        // Pure 1kHz sine — should have very low THD
        const input = makeSine(1000, 1.0, 4096);

        const result = THDMeterPlugin.processor.process([input], { fftSize: 4096, sampleRate }, 4096);

        expect(result).toHaveProperty('fundamental');
        expect(result).toHaveProperty('thd');
        expect(result).toHaveProperty('thdDb');
        expect(result).toHaveProperty('harmonics');

        // Pure sine should have THD < 5%
        expect(result.thd).toBeLessThan(5);

        // Fundamental should be close to 1000 Hz
        expect(result.fundamental).toBeCloseTo(1000, -1);
    });

    it('should return correct metrics structure', () => {
        const input = makeSine(440, 1.0, 4096);

        const result = THDMeterPlugin.processor.process([input], { fftSize: 4096, sampleRate }, 4096);

        expect(typeof result.fundamental).toBe('number');
        expect(typeof result.thd).toBe('number');
        expect(typeof result.thdDb).toBe('number');
        expect(Array.isArray(result.harmonics)).toBe(true);

        // Each harmonic should have freq and magnitude
        for (const h of result.harmonics) {
            expect(h).toHaveProperty('freq');
            expect(h).toHaveProperty('magnitude');
            expect(typeof h.freq).toBe('number');
            expect(typeof h.magnitude).toBe('number');
        }
    });

    it('should detect harmonics', () => {
        // Create a signal with known harmonic content: fundamental + 3rd harmonic
        // Use a frequency that fits exactly into the FFT window to avoid spectral leakage
        const fftSize = 4096;
        const freqPerBin = sampleRate / fftSize;
        // Pick a fundamental at an exact bin frequency
        const fundBin = 50;
        const f0 = fundBin * freqPerBin;
        const input = new Float32Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
            // Fundamental at amplitude 1.0 + 3rd harmonic at amplitude 0.3
            input[i] = Math.sin(2 * Math.PI * f0 * i / sampleRate)
                     + 0.3 * Math.sin(2 * Math.PI * 3 * f0 * i / sampleRate);
        }

        const result = THDMeterPlugin.processor.process([input], { fftSize, sampleRate }, fftSize);

        // THD should be significant (3rd harmonic at 30% of fundamental)
        // THD = sqrt(0.3^2) / 1.0 * 100 = 30%
        expect(result.thd).toBeGreaterThan(20);
        expect(result.thd).toBeLessThan(40);

        // Fundamental should be detected at f0
        expect(result.fundamental).toBeCloseTo(f0, -1);

        // Should have at least one harmonic detected
        expect(result.harmonics.length).toBeGreaterThan(0);
    });
});

// ─── Pole-Zero Diagram ──────────────────────────────────────

describe('PoleZeroDiagram', () => {
    it('should be registered with correct metadata', () => {
        expect(PoleZeroDiagramPlugin.id).toBe('pole-zero-diagram');
        expect(PoleZeroDiagramPlugin.group).toBe('visualization');
        expect(PoleZeroDiagramPlugin.signals.input).toBeNull();
        expect(PoleZeroDiagramPlugin.signals.output).toBeNull();
    });

    it('should compute poles and zeros', () => {
        // Default: numerator '1,0,-1', denominator '1,-1.5,0.7'
        const result = PoleZeroDiagramPlugin.processor.process([], {
            numerator: '1,0,-1',
            denominator: '1,-1.5,0.7'
        });

        expect(result).toHaveProperty('poles');
        expect(result).toHaveProperty('zeros');
        expect(result).toHaveProperty('stable');

        // Numerator z^2 - 1 = (z-1)(z+1) → 2 zeros
        expect(result.zeros).toHaveLength(2);

        // Denominator z^2 - 1.5z + 0.7 → 2 poles
        expect(result.poles).toHaveLength(2);

        // Each root should have re and im fields
        for (const z of result.zeros) {
            expect(z).toHaveProperty('re');
            expect(z).toHaveProperty('im');
        }
        for (const p of result.poles) {
            expect(p).toHaveProperty('re');
            expect(p).toHaveProperty('im');
        }
    });

    it('should detect stable system', () => {
        // Denominator 1,-1.5,0.7: poles at (1.5 ± sqrt(2.25-2.8))/2 = 0.75 ± j*0.37
        // |pole| = sqrt(0.75^2 + 0.37^2) ≈ sqrt(0.7) ≈ 0.837 < 1 → stable
        const result = PoleZeroDiagramPlugin.processor.process([], {
            numerator: '1,0,-1',
            denominator: '1,-1.5,0.7'
        });

        expect(result.stable).toBe(true);

        // Verify poles are inside the unit circle
        for (const p of result.poles) {
            const magnitude = Math.sqrt(p.re * p.re + p.im * p.im);
            expect(magnitude).toBeLessThan(1.0);
        }
    });

    it('should detect unstable system', () => {
        // Denominator with poles outside unit circle: z^2 - 2.5z + 2
        // Poles: (2.5 ± sqrt(6.25-8))/2 = 1.25 ± j*0.66
        // |pole| = sqrt(1.25^2 + 0.66^2) ≈ sqrt(2) ≈ 1.41 > 1 → unstable
        const result = PoleZeroDiagramPlugin.processor.process([], {
            numerator: '1',
            denominator: '1,-2.5,2'
        });

        expect(result.stable).toBe(false);

        // At least one pole should be outside the unit circle
        const hasOutsidePole = result.poles.some(p => {
            const magnitude = Math.sqrt(p.re * p.re + p.im * p.im);
            return magnitude >= 1.0;
        });
        expect(hasOutsidePole).toBe(true);
    });
});

// ─── Phase Portrait ──────────────────────────────────────────

describe('PhasePortrait', () => {
    it('should be registered with correct metadata', () => {
        expect(PhasePortraitPlugin.id).toBe('phase-portrait');
        expect(PhasePortraitPlugin.group).toBe('visualization');
        expect(PhasePortraitPlugin.signals.input).toBe('complex');
        expect(PhasePortraitPlugin.signals.output).toBeNull();
    });

    it('should passthrough complex input', () => {
        // Create a complex signal (interleaved I/Q)
        const input = new Float32Array(chunkSize * 2);
        for (let i = 0; i < chunkSize; i++) {
            const phase = 2 * Math.PI * 1000 * i / sampleRate;
            input[i * 2] = Math.cos(phase);
            input[i * 2 + 1] = Math.sin(phase);
        }

        const output = PhasePortraitPlugin.processor.process([input], { trailLength: 2048, dotSize: 2 }, chunkSize);

        // Output should be the same reference as input (passthrough)
        expect(output).toBe(input);
    });
});

// ─── Group Delay Plot ────────────────────────────────────────

describe('GroupDelayPlot', () => {
    it('should be registered with correct metadata', () => {
        expect(GroupDelayPlotPlugin.id).toBe('group-delay-plot');
        expect(GroupDelayPlotPlugin.group).toBe('visualization');
        expect(GroupDelayPlotPlugin.signals.input).toBe('real');
        expect(GroupDelayPlotPlugin.signals.output).toBeNull();
    });

    it('should compute group delay', () => {
        // Impulse input: delta function
        const input = new Float32Array(chunkSize);
        input[0] = 1.0;

        const result = GroupDelayPlotPlugin.processor.process([input], { fftSize: 1024, sampleRate }, chunkSize);

        expect(result).toHaveProperty('frequencies');
        expect(result).toHaveProperty('delays');
        expect(result).toHaveProperty('maxDelay');
        expect(result).toHaveProperty('minDelay');

        expect(Array.isArray(result.frequencies)).toBe(true);
        expect(Array.isArray(result.delays)).toBe(true);
        expect(result.frequencies.length).toBeGreaterThan(0);
        expect(result.delays.length).toBe(result.frequencies.length);
    });

    it('should return valid delay values', () => {
        // Use a simple signal
        const input = makeSine(1000, 1.0, chunkSize);

        const result = GroupDelayPlotPlugin.processor.process([input], { fftSize: 1024, sampleRate }, chunkSize);

        // No NaN values in delays
        for (let i = 0; i < result.delays.length; i++) {
            expect(isNaN(result.delays[i])).toBe(false);
        }

        // No NaN values in frequencies
        for (let i = 0; i < result.frequencies.length; i++) {
            expect(isNaN(result.frequencies[i])).toBe(false);
        }

        // maxDelay and minDelay should be finite
        expect(isFinite(result.maxDelay)).toBe(true);
        expect(isFinite(result.minDelay)).toBe(true);
    });
});
