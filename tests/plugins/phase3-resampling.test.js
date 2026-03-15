import { describe, it, expect } from 'vitest';
import PolyphaseFilterPlugin from '../../src/engine/plugins/filters/PolyphaseFilterPlugin';
import FractionalDelayPlugin from '../../src/engine/plugins/filters/FractionalDelayPlugin';

const CHUNK = 1024;
const SR = 48000;

describe('Polyphase Filter', () => {
  it('should be registered with correct metadata', () => {
    expect(PolyphaseFilterPlugin.id).toBe('polyphase-filter');
    expect(PolyphaseFilterPlugin.group).toBe('filters');
    expect(PolyphaseFilterPlugin.signals.input).toBe('real');
    expect(PolyphaseFilterPlugin.signals.output).toBe('real');
  });

  it('output length = chunkSize', () => {
    PolyphaseFilterPlugin.processor.clearStates();
    const input = new Float32Array(CHUNK);
    for (let i = 0; i < CHUNK; i++) input[i] = Math.sin(2 * Math.PI * 440 * i / SR);
    const output = PolyphaseFilterPlugin.processor.process([input], {
      sampleRate: SR, ...PolyphaseFilterPlugin.defaultParams
    }, CHUNK, 'test-poly-len');
    expect(output).toBeInstanceOf(Float32Array);
    expect(output.length).toBe(CHUNK);
  });

  it('upsample mode produces non-zero output', () => {
    PolyphaseFilterPlugin.processor.clearStates();
    const input = new Float32Array(CHUNK);
    for (let i = 0; i < CHUNK; i++) input[i] = Math.sin(2 * Math.PI * 100 * i / SR);
    const output = PolyphaseFilterPlugin.processor.process([input], {
      sampleRate: SR, resampleMode: 'upsample', factor: 2, numTaps: 64
    }, CHUNK, 'test-poly-up');
    const hasNonZero = output.some((v) => v !== 0);
    expect(hasNonZero).toBe(true);
  });

  it('downsample mode produces non-zero output', () => {
    PolyphaseFilterPlugin.processor.clearStates();
    const input = new Float32Array(CHUNK);
    for (let i = 0; i < CHUNK; i++) input[i] = Math.sin(2 * Math.PI * 100 * i / SR);
    const output = PolyphaseFilterPlugin.processor.process([input], {
      sampleRate: SR, resampleMode: 'downsample', factor: 2, numTaps: 64
    }, CHUNK, 'test-poly-down');
    const hasNonZero = output.some((v) => v !== 0);
    expect(hasNonZero).toBe(true);
  });

  it('DC input with upsample preserves DC (values close to 1.0)', () => {
    PolyphaseFilterPlugin.processor.clearStates();
    const input = new Float32Array(CHUNK).fill(1.0);
    const params = { sampleRate: SR, resampleMode: 'upsample', factor: 2, numTaps: 64 };
    // Process two chunks to let filter settle past transient
    PolyphaseFilterPlugin.processor.process([input], params, CHUNK, 'test-poly-dc');
    const output = PolyphaseFilterPlugin.processor.process([input], params, CHUNK, 'test-poly-dc');
    // Check second half of output (after transient settles)
    const secondHalf = output.slice(CHUNK / 2);
    const avgValue = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
    expect(avgValue).toBeCloseTo(1.0, 0);
  });
});

describe('Fractional Delay', () => {
  it('should be registered with correct metadata', () => {
    expect(FractionalDelayPlugin.id).toBe('fractional-delay');
    expect(FractionalDelayPlugin.group).toBe('filters');
    expect(FractionalDelayPlugin.signals.input).toBe('real');
    expect(FractionalDelayPlugin.signals.output).toBe('real');
  });

  it('output length = chunkSize', () => {
    FractionalDelayPlugin.processor.clearStates();
    const input = new Float32Array(CHUNK);
    for (let i = 0; i < CHUNK; i++) input[i] = Math.sin(2 * Math.PI * 440 * i / SR);
    const output = FractionalDelayPlugin.processor.process([input], {
      sampleRate: SR, delay: 5.0
    }, CHUNK, 'test-fd-len');
    expect(output).toBeInstanceOf(Float32Array);
    expect(output.length).toBe(CHUNK);
  });

  it('delay=0 produces output approximately equal to input', () => {
    FractionalDelayPlugin.processor.clearStates();
    const input = new Float32Array(CHUNK);
    for (let i = 0; i < CHUNK; i++) input[i] = Math.sin(2 * Math.PI * 100 * i / SR);
    const output = FractionalDelayPlugin.processor.process([input], {
      sampleRate: SR, delay: 0
    }, CHUNK, 'test-fd-zero');
    // With delay=0, output should closely match input (small interpolation artifacts ok)
    let maxDiff = 0;
    for (let i = 2; i < CHUNK; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(output[i] - input[i]));
    }
    expect(maxDiff).toBeLessThan(0.05);
  });

  it('integer delay=10 shifts signal (first 10 samples near zero, then signal appears)', () => {
    FractionalDelayPlugin.processor.clearStates();
    // Use impulse signal: 1.0 at sample 0, then zeros
    const input = new Float32Array(CHUNK);
    input[0] = 1.0;
    const output = FractionalDelayPlugin.processor.process([input], {
      sampleRate: SR, delay: 10
    }, CHUNK, 'test-fd-int');
    // First 9 samples should be near zero (before the impulse arrives)
    for (let i = 0; i < 9; i++) {
      expect(Math.abs(output[i])).toBeLessThan(0.01);
    }
    // Around sample 10-11 there should be a significant value from the delayed impulse
    const peakRegion = output.slice(9, 14);
    const peakMax = peakRegion.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peakMax).toBeGreaterThan(0.1);
  });

  it('fractional delay=5.5 produces valid output (no NaN/Inf)', () => {
    FractionalDelayPlugin.processor.clearStates();
    const input = new Float32Array(CHUNK);
    for (let i = 0; i < CHUNK; i++) input[i] = Math.sin(2 * Math.PI * 200 * i / SR);
    const output = FractionalDelayPlugin.processor.process([input], {
      sampleRate: SR, delay: 5.5
    }, CHUNK, 'test-fd-frac');
    for (let i = 0; i < CHUNK; i++) {
      expect(Number.isFinite(output[i])).toBe(true);
    }
    // Also verify it's not all zeros
    const hasNonZero = output.some((v) => v !== 0);
    expect(hasNonZero).toBe(true);
  });
});
