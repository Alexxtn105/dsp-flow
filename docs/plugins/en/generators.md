# Generators

Signal source blocks. Generators have no required inputs (except controllable NCOs) and produce signals for further processing in the graph.

---

## Sine Generator

**ID:** `sine-generator` | **Group:** generators | **Input:** none | **Output:** real

### Purpose

Generates a continuous sinusoidal signal of the form s(t) = A * sin(2*pi*f*t + phi). This is the most basic block in digital signal processing, used as a test signal, carrier frequency, reference tone, and building block for complex signals.

### Algorithm

Uses a phase accumulator — on each sample the phase is incremented by delta_phi = 2*pi*f / sampleRate. The sine value is computed as Math.sin(currentPhase + phaseOffset). The phase is normalized to the range [0, 2*pi) to prevent precision loss during extended operation. The accumulator preserves state between chunks, ensuring signal continuity without clicks or discontinuities.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| frequency | float | 1000 | Sine frequency in Hz. Range: 0 to sampleRate/2. Typical values: 440 (note A), 1000 (test tone), 10000 (carrier). |
| amplitude | float | 1.0 | Signal amplitude. Range: 0.0-1.0. Values > 1.0 are allowed but may cause clipping when played through Speaker. |
| phase | float | 0 | Initial phase offset in degrees. Range: 0-360. Converted to radians: phaseOffset = phase * pi/180. |

### Usage Examples

1. **Simple sine observation:**
   `Sine(1000 Hz) -> Oscilloscope` — a pure 1 kHz sine wave is displayed on the oscilloscope.

2. **Spectral analysis of summed tones:**
   `Sine(1000 Hz) + Sine(3000 Hz) -> Summer -> SpectrumAnalyzer` — the spectrum shows two peaks: at 1 kHz and 3 kHz.

3. **Carrier modulation:**
   `Sine(100 Hz, amplitude 0.5) -> AMFMPMModulator(FM, carrier 10000 Hz)` — the 100 Hz sine is used as the modulating signal for FM modulation.

4. **Filter testing:**
   `Sine(5000 Hz) -> LowpassFIR(cutoff 3000 Hz) -> Oscilloscope` — the 5 kHz signal is suppressed by the filter — the output is near silence.

---

## Cosine Generator

**ID:** `cosine-generator` | **Group:** generators | **Input:** none | **Output:** real

### Purpose

Generates a continuous cosine signal of the form s(t) = A * cos(2*pi*f*t + phi). Cosine is the same as sine but shifted 90 degrees (pi/2 radians) ahead in phase. This signal is needed for forming quadrature pairs (I/Q), where sine represents the quadrature (Q) component and cosine represents the in-phase (I) component.

### Algorithm

Identical to the sine generator, but uses Math.cos instead of Math.sin. The phase accumulator increments by delta_phi = 2*pi*f / sampleRate on each sample. The accumulator state is preserved between chunks for signal continuity. The phase is normalized to [0, 2*pi) to prevent float precision loss.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| frequency | float | 1000 | Cosine frequency in Hz. Range: 0 to sampleRate/2. |
| amplitude | float | 1.0 | Signal amplitude. Range: 0.0-1.0 (values > 1.0 are allowed but may cause clipping). |
| phase | float | 0 | Initial phase offset in degrees. Range: 0-360. |

### Usage Examples

1. **Manual quadrature pair formation:**
   `Sine(1000 Hz) -> Multiplier (Q branch)`, `Cosine(1000 Hz) -> Multiplier (I branch)` — two signals of the same frequency but with a 90 degree shift form an I/Q pair.

2. **Orthogonality verification:**
   `Sine(1000 Hz) -> Multiplier <- Cosine(1000 Hz) -> Integrator` — the integral of sin*cos over a whole number of periods approaches zero.

3. **Coherent AM demodulation:**
   `AMFMPMModulator(AM, carrier 10000 Hz) -> Multiplier <- Cosine(10000 Hz) -> LowpassFIR -> Oscilloscope` — a cosine of the same frequency is used for synchronous detection.

---

## Reference Sine Generator (NCO)

**ID:** `ref-sine-generator` | **Group:** generators | **Input:** 2x real | **Output:** complex

### Purpose

NCO (Numerically Controlled Oscillator) — a generator with external frequency and phase control. Unlike the standard sine generator, the frequency and phase can change in real time via control inputs. This is a key block for building PLLs (phase-locked loops), coherent demodulators, adaptive filters, and frequency synthesis systems.

### Algorithm

The phase accumulator is analogous to the standard generator, but on each sample:
1. The instantaneous frequency is taken from the control input (or from the frequency parameter).
2. The phase offset is taken from the second input (or from the phase parameter).
3. The increment is computed: delta_phi = 2*pi * freq / sampleRate.
4. The complex output is formed: I = sin(phase), Q = cos(phase).

The NCO produces an analytic signal — a complex exponential e^(j*phi), represented as an I/Q pair. Output format: interleaved [I0, Q0, I1, Q1, ...].

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| frequency | float | 1000 | Base frequency in Hz. Used when the frequency input is not connected. |
| amplitude | float | 1.0 | Output signal amplitude. Range: 0.0-1.0. |
| phase | float | 0 | Base phase offset in degrees. Used when the phase input is not connected. |
| controllable | bool | true | Controllable generator flag. |

**Inputs:**
- Input 0 "Frequency (Hz)" — instantaneous frequency in Hz.
- Input 1 "Phase (rad)" — instantaneous phase offset in radians.

### Usage Examples

1. **PLL — phase-locked loop:**
   `PSKModulator(QPSK) -> PhaseDetector -> LoopFilter -> RefSine(frequency input) -> PhaseDetector (reference input)` — the NCO generates a reference signal whose frequency is adjusted by the loop filter.

2. **Controlled local oscillator (frequency shift):**
   `Constant(5000) -> RefSine(frequency input) -> ComplexMultiplier <- input signal` — the NCO at a fixed frequency of 5 kHz is used for spectrum translation.

3. **Frequency modulation via NCO:**
   `Sine(100 Hz) -> Gain(1000) -> RefSine(frequency input) -> Oscilloscope` — the 100 Hz modulating signal controls the NCO frequency, creating an FM signal.

---

## Reference Cosine Generator (NCO)

**ID:** `ref-cosine-generator` | **Group:** generators | **Input:** 2x real | **Output:** complex

### Purpose

NCO with cosine quadrature. Similar to RefSine, but produces a complex output with different I/Q mapping: I = cos(phi), Q = -sin(phi). This corresponds to the complex exponential e^(-j*phi), which is convenient for tasks requiring a conjugate reference signal (e.g., downconversion = multiplication by e^(-j*2*pi*f*t)).

### Algorithm

The phase accumulator is identical to RefSine. On each sample, the complex output is formed: I = cos(phase), Q = -sin(phase). The phase is normalized to [0, 2*pi).

**Difference from RefSine:**
- RefSine: I = sin(phi), Q = cos(phi) — represents e^(j*phi)
- RefCosine: I = cos(phi), Q = -sin(phi) — represents e^(-j*phi)

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| frequency | float | 1000 | Base frequency in Hz. |
| amplitude | float | 1.0 | Output signal amplitude. |
| phase | float | 0 | Base phase offset in degrees. |
| controllable | bool | true | Controllable generator flag. |

**Inputs:**
- Input 0 "Frequency (Hz)" — instantaneous frequency in Hz.
- Input 1 "Phase (rad)" — instantaneous phase offset in radians.

### Usage Examples

1. **Downconversion:**
   `Input signal at 10 kHz carrier -> ComplexMultiplier <- RefCosine(10000 Hz) -> LowpassFIR -> Constellation` — multiplication by e^(-j*2*pi*10000*t) shifts the spectrum to zero frequency (baseband).

2. **PLL with cosine NCO:**
   `Signal -> PhaseDetector -> LoopFilter -> RefCosine(frequency input) -> PhaseDetector (reference)` — used when the phase detector expects a cosine reference signal.

---

## Audio File

**ID:** `audio-file` | **Group:** generators | **Input:** none | **Output:** real

### Purpose

Allows loading a WAV file and using it as a real signal source in the processing graph. This is necessary for working with real recordings: speech analysis, music, radio signals, testing filters and detectors on real data instead of synthetic generators.

### Algorithm

This plugin is a placeholder. The actual WAV file reading and feeding of audio data into the graph is performed by DSPProcessor. Supported format: WAV (PCM). Stereo files are mixed down to mono. The sample rate is resampled to the simulation sampleRate.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| wavFile | File / null | null | File object selected by the user through the load dialog. null = no file loaded. |

### Usage Examples

1. **Spectrum analysis of an audio recording:**
   `AudioFile(speech.wav) -> SpectrumAnalyzer` — the loaded speech recording is displayed on the spectrum analyzer.

2. **Audio signal filtering:**
   `AudioFile(music.wav) -> BandpassFIR(200-3400 Hz) -> Speaker` — music is filtered by a bandpass filter (telephone band) and played back.

3. **Waterfall display:**
   `AudioFile(radio.wav) -> Waterfall` — visualization of the radio signal spectrum changing over time.

---

## Constant

**ID:** `constant` | **Group:** generators | **Input:** none | **Output:** real

### Purpose

Generates a signal with a constant value on every sample. Used as a DC offset (bias), control signal (fixed frequency value for NCO), scaling coefficient (via Multiplier), threshold level (for the Threshold block), and test signal.

### Algorithm

Trivial: the output Float32Array is filled with the same value using the fill() method. No state is stored between chunks.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| value | float | 1.0 | Constant value. Any float is allowed: positive, negative, or zero values. |

### Usage Examples

1. **Setting frequency for NCO:**
   `Constant(5000) -> RefSine(frequency input)` — the NCO will generate a signal at a fixed frequency of 5 kHz.

2. **DC offset of a signal:**
   `Sine(1000 Hz) + Constant(0.5) -> Summer -> Oscilloscope` — the sine wave is shifted up by 0.5.

3. **Scaling (manual Gain):**
   `Input signal -> Multiplier <- Constant(0.1)` — the signal is attenuated by a factor of 10.

---

## Noise Generator

**ID:** `noise-generator` | **Group:** generators | **Input:** none | **Output:** real

### Purpose

Generates a pseudorandom noise signal of three types, each with its own spectral characteristic. Noise is used for testing filters, modeling communication channels with additive noise, and generating dithering signals.

### Algorithm

- **white (white noise)** — flat spectrum, equal power at all frequencies. Generated as `Math.random() * 2 - 1`.
- **pink (pink noise, 1/f)** — power decreases inversely proportional to frequency (-3 dB/octave). Implementation: Paul Kellet filter — a cascade of 7 first-order IIR filters. Output is normalized by a factor of 0.11.
- **brown (red/Brownian noise, 1/f^2)** — power decreases as 1/f^2 (-6 dB/octave). Implementation: integration of white noise with limiting.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| noiseType | string | 'white' | Noise type: 'white', 'pink', 'brown'. |
| amplitude | float | 1.0 | Amplitude (multiplier). Range: 0.0-1.0. |

### Usage Examples

1. **Visualizing filter frequency response:**
   `NoiseGenerator(white) -> LowpassFIR(cutoff 5000 Hz) -> SpectrumAnalyzer` — white noise passes through the filter. The spectrum analyzer shows the filter frequency response.

2. **Modeling a noisy channel:**
   `Sine(1000 Hz) + NoiseGenerator(white, amplitude 0.1) -> Summer -> Oscilloscope` — sine wave with added white noise.

3. **Comparing noise spectra:**
   `NoiseGenerator(white) -> SpectrumAnalyzer` (flat spectrum), `NoiseGenerator(pink) -> SpectrumAnalyzer` (3 dB/octave rolloff), `NoiseGenerator(brown) -> SpectrumAnalyzer` (6 dB/octave rolloff).

---

## AM/FM/PM Modulator

**ID:** `amfmpm-modulator` | **Group:** generators | **Input:** real | **Output:** real

### Purpose

Accepts a modulating (information) signal and shifts it onto a high-frequency carrier using one of three methods: amplitude modulation (AM), frequency modulation (FM), or phase modulation (PM). These are the basic types of analog modulation used in radio communications, broadcasting, and telemetry.

### Algorithm

Uses a phase accumulator with a base increment delta_phi = 2*pi * fc / sampleRate.

- **AM:** s(t) = (1 + m * x(t)) * cos(phi). The carrier amplitude changes proportionally to the modulating signal. Spectrum: carrier + two sidebands (fc +/- fm).
- **FM:** s(t) = cos(phi), where phi += delta_phi + 2*pi * m * x(t) / sampleRate. The instantaneous frequency deviates from the carrier. Parameter m is the frequency deviation (Hz). Bandwidth ~ 2*(delta_f + fm) (Carson's rule).
- **PM:** s(t) = cos(phi + m * x(t)). The carrier phase shifts proportionally to x(t). Parameter m is the phase modulation index (radians).

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| modulationType | string | 'AM' | Modulation type: 'AM', 'FM', 'PM'. |
| carrierFrequency | float | 10000 | Carrier frequency in Hz. Should be significantly higher than the modulating signal frequency. |
| modulationIndex | float | 0.5 | Modulation index/depth. For AM: 0-1 (depth). For FM: deviation in Hz. For PM: index in radians. |

### Usage Examples

1. **AM modulation with envelope observation:**
   `Sine(500 Hz) -> AMFMPMModulator(AM, carrier 10000, m=0.8) -> Oscilloscope` — a high-frequency carrier with a sinusoidal envelope is visible.

2. **FM modulation and spectral analysis:**
   `Sine(200 Hz) -> AMFMPMModulator(FM, carrier 5000, deviation 1000) -> SpectrumAnalyzer` — the carrier with sidebands is visible.

3. **FM demodulation:**
   `Sine(100 Hz) -> AMFMPMModulator(FM, 8000, deviation 500) -> FrequencyDiscriminator -> LowpassFIR -> Oscilloscope` — the frequency discriminator extracts the modulating signal.

---

## PSK Modulator

**ID:** `psk-modulator` | **Group:** generators | **Input:** none | **Output:** complex

### Purpose

Generates a phase-shift keyed (PSK) modulated signal. PSK is the primary type of digital modulation where information is encoded in the carrier phase. Each symbol corresponds to a specific point on the phase diagram (constellation). The block generates pseudorandom data via PRBS and produces I/Q samples.

### Algorithm

1. samplesPerSymbol = sampleRate / symbolRate is computed.
2. When the sample counter reaches samplesPerSymbol, a new symbol is generated via LFSR (polynomial 0x80000057, seed 0x1234ABCD).
3. A constellation point (I, Q) is formed from 1/2/3 bits.

**Constellation schemes:**
- **BPSK** — 2 points (1 bit/symbol). Phases: 0 and 180 degrees.
- **QPSK** — 4 points (2 bits/symbol). Phases: 45, 135, 225, 315 degrees.
- **8PSK** — 8 points (3 bits/symbol). Phases: 0, 45, 90, ..., 315 degrees.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| constellation | string | 'QPSK' | Constellation scheme: 'BPSK', 'QPSK', '8PSK'. |
| symbolRate | float | 1000 | Symbol rate in symbols/s (baud). Range: 10 to sampleRate/4. |
| amplitude | float | 1.0 | Constellation point amplitude. Range: 0.0-1.0. |

### Usage Examples

1. **Observing a QPSK constellation:**
   `PSKModulator(QPSK, symbolRate 1000) -> Constellation` — 4 points at the corners of a square are visible on the diagram.

2. **Full QPSK demodulation chain:**
   `PSKModulator(QPSK, sps=4) -> noisy channel -> TimingRecovery(sps=4) -> PLL -> Constellation` — timing recovery and PLL compensate for offsets.

3. **PSK signal spectrum:**
   `PSKModulator(BPSK, symbolRate 500) -> SpectrumAnalyzer` — the spectrum has a sinc^2 shape with a main lobe width of 2 * symbolRate.
