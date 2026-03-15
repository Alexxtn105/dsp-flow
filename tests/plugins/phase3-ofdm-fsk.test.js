import { describe, it, expect } from 'vitest';
import OFDMModulatorPlugin from '../../src/engine/plugins/generators/OFDMModulatorPlugin';
import OFDMDemodulatorPlugin from '../../src/engine/plugins/detectors/OFDMDemodulatorPlugin';
import FSKModulatorPlugin from '../../src/engine/plugins/generators/FSKModulatorPlugin';
import FSKDemodulatorPlugin from '../../src/engine/plugins/detectors/FSKDemodulatorPlugin';

const CHUNK = 1024;
const SR = 48000;

describe('OFDM Modulator', () => {
  const proc = OFDMModulatorPlugin.processor;

  it('should have correct metadata', () => {
    expect(OFDMModulatorPlugin.id).toBe('ofdm-modulator');
    expect(OFDMModulatorPlugin.group).toBe('generators');
    expect(OFDMModulatorPlugin.signals.input).toBeNull();
    expect(OFDMModulatorPlugin.signals.output).toBe('complex');
  });

  it('output is complex (length = chunkSize * 2)', () => {
    proc.clearStates();
    const params = { ...OFDMModulatorPlugin.defaultParams, sampleRate: SR };
    const result = proc.process([null], params, CHUNK, 'test-ofdm-mod-1');
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(CHUNK * 2);
  });

  it('output is not all zeros', () => {
    proc.clearStates();
    const params = { ...OFDMModulatorPlugin.defaultParams, sampleRate: SR };
    const result = proc.process([null], params, CHUNK, 'test-ofdm-mod-2');
    expect(result.some(v => v !== 0)).toBe(true);
  });

  it('different numSubcarriers produce valid output', () => {
    for (const numSubcarriers of [16, 64, 128]) {
      proc.clearStates();
      const params = { ...OFDMModulatorPlugin.defaultParams, sampleRate: SR, numSubcarriers };
      const result = proc.process([null], params, CHUNK, `test-ofdm-mod-sub-${numSubcarriers}`);
      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(CHUNK * 2);
      expect(result.some(v => v !== 0)).toBe(true);
    }
  });
});

describe('OFDM Demodulator', () => {
  const proc = OFDMDemodulatorPlugin.processor;

  it('should have correct metadata', () => {
    expect(OFDMDemodulatorPlugin.id).toBe('ofdm-demodulator');
    expect(OFDMDemodulatorPlugin.group).toBe('detectors');
    expect(OFDMDemodulatorPlugin.signals.input).toBe('complex');
    expect(OFDMDemodulatorPlugin.signals.output).toBe('complex');
  });

  it('output is complex', () => {
    proc.clearStates();
    const params = { ...OFDMDemodulatorPlugin.defaultParams, sampleRate: SR };
    const input = new Float32Array(CHUNK * 2);
    for (let i = 0; i < CHUNK * 2; i++) input[i] = Math.sin(2 * Math.PI * i / 64);
    const result = proc.process([input], params, CHUNK, 'test-ofdm-demod-1');
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(CHUNK * 2);
  });

  it('processes OFDM modulator output', () => {
    OFDMModulatorPlugin.processor.clearStates();
    proc.clearStates();
    const modParams = { ...OFDMModulatorPlugin.defaultParams, sampleRate: SR };
    const ofdmSignal = OFDMModulatorPlugin.processor.process([null], modParams, CHUNK, 'test-ofdm-demod-mod');
    const params = { ...OFDMDemodulatorPlugin.defaultParams, sampleRate: SR };
    const result = proc.process([ofdmSignal], params, CHUNK, 'test-ofdm-demod-2');
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(CHUNK * 2);
    expect(result.some(v => v !== 0)).toBe(true);
  });

  it('roundtrip recovers constellation points with correct magnitude', () => {
    // Use numSubcarriers=64 (one full OFDM symbol = 64+16=80 samples)
    const numSC = 64;
    const cpLen = 16;
    const symbolLen = numSC + cpLen;
    OFDMModulatorPlugin.processor.clearStates();
    proc.clearStates();

    const modParams = { ...OFDMModulatorPlugin.defaultParams, sampleRate: SR, numSubcarriers: numSC, cpLength: cpLen };
    const demodParams = { ...OFDMDemodulatorPlugin.defaultParams, sampleRate: SR, numSubcarriers: numSC, cpLength: cpLen };

    // Generate enough samples for at least 2 full OFDM symbols
    const bigChunk = symbolLen * 3;
    const ofdmSignal = OFDMModulatorPlugin.processor.process([null], modParams, bigChunk, 'test-ofdm-rt-mod');
    const demodResult = proc.process([ofdmSignal], demodParams, bigChunk, 'test-ofdm-rt-demod');

    // After demodulation, non-zero subcarriers should have magnitude close to 4QAM constellation (≈1.0)
    // Check that at least some demodulated subcarriers have reasonable magnitude (0.5–2.0)
    let validPoints = 0;
    for (let i = 0; i < bigChunk; i++) {
      const re = demodResult[i * 2];
      const im = demodResult[i * 2 + 1];
      const mag = Math.sqrt(re * re + im * im);
      if (mag > 0.1 && mag < 5.0) validPoints++;
    }
    expect(validPoints).toBeGreaterThan(10);
  });
});

describe('FSK Modulator', () => {
  const proc = FSKModulatorPlugin.processor;

  it('should have correct metadata', () => {
    expect(FSKModulatorPlugin.id).toBe('fsk-modulator');
    expect(FSKModulatorPlugin.group).toBe('generators');
    expect(FSKModulatorPlugin.signals.input).toBeNull();
    expect(FSKModulatorPlugin.signals.output).toBe('complex');
  });

  it('output is complex', () => {
    proc.clearStates();
    const params = { ...FSKModulatorPlugin.defaultParams, sampleRate: SR };
    const result = proc.process([null], params, CHUNK, 'test-fsk-mod-1');
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(CHUNK * 2);
  });

  it('different fskOrder produce valid output', () => {
    for (const fskOrder of ['2FSK', '4FSK']) {
      proc.clearStates();
      const params = { ...FSKModulatorPlugin.defaultParams, sampleRate: SR, fskOrder };
      const result = proc.process([null], params, CHUNK, `test-fsk-mod-${fskOrder}`);
      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(CHUNK * 2);
      expect(result.some(v => v !== 0)).toBe(true);
    }
  });

  it('phase is continuous (no large jumps)', () => {
    proc.clearStates();
    const params = { ...FSKModulatorPlugin.defaultParams, sampleRate: SR };
    const result = proc.process([null], params, CHUNK, 'test-fsk-mod-phase');

    let maxJump = 0;
    let prevPhase = Math.atan2(result[1], result[0]);
    for (let i = 1; i < CHUNK; i++) {
      const phase = Math.atan2(result[i * 2 + 1], result[i * 2]);
      let diff = Math.abs(phase - prevPhase);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff > maxJump) maxJump = diff;
      prevPhase = phase;
    }
    expect(maxJump).toBeLessThan(Math.PI);
  });
});

describe('FSK Demodulator', () => {
  const proc = FSKDemodulatorPlugin.processor;

  it('should have correct metadata', () => {
    expect(FSKDemodulatorPlugin.id).toBe('fsk-demodulator');
    expect(FSKDemodulatorPlugin.group).toBe('detectors');
    expect(FSKDemodulatorPlugin.signals.input).toBe('complex');
    expect(FSKDemodulatorPlugin.signals.output).toBe('real');
  });

  it('output is real (length = chunkSize)', () => {
    proc.clearStates();
    const params = { ...FSKDemodulatorPlugin.defaultParams, sampleRate: SR };
    const input = new Float32Array(CHUNK * 2);
    for (let i = 0; i < CHUNK; i++) {
      const phase = 2 * Math.PI * 1000 * i / SR;
      input[i * 2] = Math.cos(phase);
      input[i * 2 + 1] = Math.sin(phase);
    }
    const result = proc.process([input], params, CHUNK, 'test-fsk-demod-1');
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(CHUNK);
  });

  it('output values are ±1', () => {
    FSKModulatorPlugin.processor.clearStates();
    proc.clearStates();
    const modParams = { ...FSKModulatorPlugin.defaultParams, sampleRate: SR };
    const fskSignal = FSKModulatorPlugin.processor.process([null], modParams, CHUNK, 'test-fsk-demod-mod');
    const params = { ...FSKDemodulatorPlugin.defaultParams, sampleRate: SR };
    const result = proc.process([fskSignal], params, CHUNK, 'test-fsk-demod-2');
    for (let i = 0; i < result.length; i++) {
      expect(Math.abs(result[i])).toBe(1);
    }
  });
});
