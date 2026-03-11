# Math Blocks

Arithmetic and nonlinear operations on real and complex signals.

---

## Summer

**ID:** `summer` | **Group:** math-blocks | **Input:** 2x real | **Output:** real

### Purpose

Adds two (or more) real signals with specified weight coefficients. A basic block for mixing signals and forming sum/difference channels.

### Algorithm

y[n] = w0*x0[n] + w1*x1[n] + ... Normalization: averaging (divide by number of inputs) or peak (divide by maximum).

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| numInputs | int | 2 | Number of inputs. |
| weights | float[] | [1.0, 1.0] | Weight coefficients. Negative weight = subtraction. |
| normalization | string | 'none' | 'none', 'average', or 'peak' (peak normalization). |

### Usage Examples

1. **Mixing tones:** `Sine(1000) + Sine(3000) -> Summer -> Oscilloscope`.
2. **Subtraction:** `Summer(weights: [1.0, -1.0])` — subtracts the second input from the first.
3. **Averaging:** `Summer(normalization: 'average')` — averaging to reduce noise.

---

## Multiplier

**ID:** `multiplier` | **Group:** math-blocks | **Input:** 2x real | **Output:** real

### Purpose

Multiplies (or divides) two real signals element-wise. The basis for amplitude modulation, balanced mixing, and synchronous detection.

### Algorithm

Multiplication: y[n] = x0[n] * x1[n] * scaleFactor. Division: y[n] = x0[n] / x1[n] * scaleFactor (with division-by-zero protection).

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| numInputs | int | 2 | Number of inputs. |
| operation | string | 'multiply' | 'multiply' or 'divide'. |
| scaleFactor | float | 1.0 | Scale factor. |

### Usage Examples

1. **Amplitude modulation:** `Sine(1000) * Sine(100) -> Multiplier -> SpectrumAnalyzer` — sidebands at 900 and 1100 Hz.
2. **Synchronous detection:** `AM signal * Sine(carrier) -> Multiplier -> LowpassFIR -> Oscilloscope`.

---

## Integrator

**ID:** `integrator` | **Group:** math-blocks | **Input:** real | **Output:** real

### Purpose

Computes the cumulative sum (integral) of the input signal over time. Used for converting frequency to phase (NCO), computing the mean, and in PID controllers.

### Algorithm

Trapezoidal method: y[n] = y[n-1] + (x[n] + x[n-1]) * dt / 2. On overflow — reset or saturation.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| resetOnOverflow | bool | true | true = reset to 0 (sawtooth output); false = saturate at +/-maxValue. |
| maxValue | float | 1000 | Overflow threshold. |

### Usage Examples

1. **Sawtooth signal:** `Constant(100) -> Integrator -> Oscilloscope` — linear ramp.
2. **Smoothing:** `Noisy signal -> Integrator(maxValue: 10) -> Oscilloscope` — suppression of HF noise.

---

## Real Part

**ID:** `real-part` | **Group:** math-blocks | **Input:** complex | **Output:** real

### Purpose

Extracts the real (in-phase, I) component of a complex signal: output[n] = input[2n].

### Parameters

No parameters.

### Usage Examples

1. **Visualizing the I component:** `RefSine(1000) -> RealPart -> Oscilloscope`.
2. **Converting to a real signal:** `Complex filter -> RealPart -> Speaker`.

---

## Imaginary Part

**ID:** `imag-part` | **Group:** math-blocks | **Input:** complex | **Output:** real

### Purpose

Extracts the imaginary (quadrature, Q) component of a complex signal: output[n] = input[2n + 1].

### Parameters

No parameters.

### Usage Examples

1. **Visualizing the Q component:** `RefSine(1000) -> ImagPart -> Oscilloscope`.
2. **Checking I/Q balance:** comparing amplitudes of RealPart and ImagPart.

---

## Complex Multiplier

**ID:** `complex-multiplier` | **Group:** math-blocks | **Input:** 2x complex | **Output:** complex

### Purpose

Multiplies two complex signals: z1*z2 adds phases and multiplies magnitudes. A fundamental operation for frequency conversion and phase rotation.

### Algorithm

(a + jb) * (c + jd) = (ac - bd) + j(ad + bc)

### Parameters

No parameters.

### Usage Examples

1. **Spectrum shifting:** `Signal * NCO(RefSine) -> ComplexMultiplier -> SpectrumAnalyzer`.
2. **Phase rotation:** `Signal * exp(j*phi) -> ComplexMultiplier`.

---

## Complex Summer

**ID:** `complex-summer` | **Group:** math-blocks | **Input:** 2x complex | **Output:** complex

### Purpose

Adds two complex signals element-wise: Re separately, Im separately.

### Parameters

No parameters.

### Usage Examples

1. **Adding complex signals:** `RefSine(1000) + RefSine(3000) -> ComplexSummer -> SpectrumAnalyzer`.
2. **Adding noise:** modeling a noisy channel.

---

## Complex Square

**ID:** `complex-square` | **Group:** math-blocks | **Input:** complex | **Output:** complex

### Purpose

z^2 = (Re + jIm)^2. Doubles phase angles. For BPSK, "collapses" both points into one, allowing carrier recovery.

### Algorithm

Re_out = Re^2 - Im^2, Im_out = 2*Re*Im. In polar form: |z^2| = |z|^2, arg(z^2) = 2*arg(z).

### Parameters

No parameters.

### Usage Examples

1. **BPSK carrier recovery:** `BPSK -> ComplexSquare -> BandpassFIR(2*fc) -> SpectrumAnalyzer`.
2. **Removing QPSK ambiguity:** `QPSK -> ComplexSquare -> Constellation` — 4 points become 2 points.

---

## Complex Sqrt

**ID:** `complex-sqrt` | **Group:** math-blocks | **Input:** complex | **Output:** complex

### Purpose

sqrt(z) = sqrt(|z|) * exp(j*theta/2). Halves phase angles — the inverse operation of ComplexSquare.

### Algorithm

r = sqrt(Re^2 + Im^2), theta = atan2(Im, Re), Re_out = sqrt(r) * cos(theta/2), Im_out = sqrt(r) * sin(theta/2).

### Parameters

No parameters.

### Usage Examples

1. **Frequency division:** `ComplexSquare -> ComplexSqrt -> Constellation`.
2. **Carrier recovery:** `BPSK -> ComplexSquare -> PLL(2*fc) -> ComplexSqrt`.

---

## Complex Phase

**ID:** `complex-phase` | **Group:** math-blocks | **Input:** complex | **Output:** real

### Purpose

Extracts the instantaneous phase: arg(z) = atan2(Im, Re). Result in radians from -pi to +pi.

### Parameters

No parameters.

### Usage Examples

1. **Sawtooth phase:** `RefSine(1000) -> ComplexPhase -> Oscilloscope`.
2. **PSK phase demodulation:** `PSK -> PLL -> ComplexPhase -> Oscilloscope` — discrete phase values.

---

## Complex Magnitude

**ID:** `complex-magnitude` | **Group:** math-blocks | **Input:** complex | **Output:** real

### Purpose

|z| = sqrt(Re^2 + Im^2). Extracts the amplitude of a complex signal. Used for AM demodulation and level measurement.

### Parameters

No parameters.

### Usage Examples

1. **Verifying a reference signal:** `RefSine(1000) -> ComplexMagnitude -> Oscilloscope` — |z| = 1.0 = const.
2. **AM demodulation:** `AM signal (I/Q) -> ComplexMagnitude -> Oscilloscope`.

---

## Complex Composer

**ID:** `complex-composer` | **Group:** math-blocks | **Input:** 2x real | **Output:** complex

### Purpose

Combines two real signals into one complex signal: first input -> Re, second -> Im. The inverse operation of RealPart/ImagPart.

### Parameters

No parameters.

**Inputs:**
- Upper input: Re (real part)
- Lower input: Im (imaginary part)

### Usage Examples

1. **Quadrature signal:** `Sine(1000) + Cosine(1000) -> ComplexComposer -> Constellation` — a circle.
2. **Reconstruction after separate processing:** `RealPart -> Filter -> [Re]`, `ImagPart -> Filter -> [Im] -> ComplexComposer`.

---

## Complex Conjugate

**ID:** `complex-conjugate` | **Group:** math-blocks | **Input:** complex | **Output:** complex

### Purpose

a+jb -> a-jb. Inverts the imaginary part. Used in correlation (x*conj(y)), matched filtering, and reversing the direction of rotation.

### Parameters

No parameters.

### Usage Examples

1. **Correlation:** `Signal_B -> ComplexConjugate -> ComplexMultiplier (*Signal_A)`.
2. **Spectrum reversal:** `Signal -> ComplexConjugate -> SpectrumAnalyzer` — reverses the sign of frequency.

---

## Real Square

**ID:** `real-square` | **Group:** math-blocks | **Input:** real | **Output:** real

### Purpose

y[n] = x[n]^2. Frequency doubling and power detection. For cos(2*pi*f*t): cos^2 = (1 + cos(2*2*pi*f*t))/2.

### Parameters

No parameters.

### Usage Examples

1. **Frequency doubling:** `Sine(1000) -> RealSquare -> SpectrumAnalyzer` — peak at 2000 Hz.
2. **Power estimation:** `Signal -> RealSquare -> LowpassFIR -> NumericIndicator`.

---

## Real Power 4

**ID:** `real-power4` | **Group:** math-blocks | **Input:** real | **Output:** real

### Purpose

y[n] = x[n]^4. For QPSK (M=4), raising to the 4th power removes the modulation, and a spectral line appears at 4*fc.

### Algorithm

y[n] = (x[n]^2)^2 — two consecutive multiplications.

### Parameters

No parameters.

### Usage Examples

1. **QPSK carrier recovery:** `QPSK -> RealPower4 -> SpectrumAnalyzer` — peak at 4*fc.
2. **Modulation analysis:** peak at 4*f -> QPSK, at 2*f -> BPSK, at 8*f -> 8-PSK.

---

## Atan2

**ID:** `atan2` | **Group:** math-blocks | **Input:** 2x real | **Output:** real

### Purpose

atan2(Y, X) — angle in radians [-pi, pi] from two components. Correctly determines the quadrant.

### Parameters

No parameters.

**Inputs:**
- Upper input: Y (vertical/imaginary component)
- Lower input: X (horizontal/real component)

### Usage Examples

1. **Phase from I/Q:** `RealPart -> [X], ImagPart -> [Y] -> Atan2 -> Oscilloscope` — equivalent to ComplexPhase.
2. **Direction detection:** `Sine -> [Y], Cosine -> [X] -> Atan2 -> Oscilloscope` — sawtooth signal.

---

## AGC (Automatic Gain Control)

**ID:** `agc` | **Group:** math-blocks | **Input:** real | **Output:** real

### Purpose

Maintains a constant output signal level regardless of input level changes. Used in radio receivers, audio systems, and telecommunications.

### Algorithm

1. Envelope: env += coeff * (|x[n]| - env) (attack/release).
2. Gain: gain = min(targetLevel / env, maxGain).
3. Output: y[n] = x[n] * gain.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| targetLevel | float | 1.0 | Target level. Range: 0.01-10. |
| attackTime | float | 5 | Attack time, ms. Range: 0.1-100. |
| releaseTime | float | 50 | Release time, ms. Range: 1-1000. |
| maxGain | float | 100 | Maximum gain. Range: 1-10000. |

### Usage Examples

1. **Volume normalization:** `AudioFile -> AGC(target: 1.0) -> Oscilloscope` — quiet sections are amplified, loud sections are attenuated.
2. **Receiver stabilization:** `Antenna -> Filter -> AGC(target: 0.5, maxGain: 1000) -> Demodulator`.

---

## Absolute Value

**ID:** `absolute-value` | **Group:** math-blocks | **Input:** real | **Output:** real

### Purpose

y[n] = |x[n]|. Full-wave rectifier. Used for envelope detection (with lowpass filter) and power measurement.

### Parameters

No parameters.

### Usage Examples

1. **Envelope detection:** `Sine(1000) -> AbsoluteValue -> LowpassFIR(100Hz) -> Oscilloscope`.
2. **Spectral effects:** `Sine(1000) -> AbsoluteValue -> SpectrumAnalyzer` — DC + even harmonics.

---

## Gain

**ID:** `gain` | **Group:** math-blocks | **Input:** real | **Output:** real

### Purpose

Multiplies the signal by a constant coefficient. Level matching, attenuation, phase inversion.

### Algorithm

Linear: y[n] = x[n] * gain * (invert ? -1 : 1). In dB: linearGain = 10^(gaindB / 20).

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| gain | float | 1.0 | Gain coefficient. In linear: 0 = silence, 1.0 = no change, 2.0 = double. In dB: 0 = no change, +20 = 10x. |
| gainMode | string | 'linear' | 'linear' or 'dB'. |
| invert | bool | false | Phase inversion (multiply by -1). |

### Usage Examples

1. **6 dB attenuation:** `Sine(1000) -> Gain(-6 dB, mode: dB) -> Oscilloscope`.
2. **Phase inversion:** `Sine -> Gain(invert: true) -> Summer (with original)` — result is zero.

---

## Log/Exp

**ID:** `log-exp` | **Group:** math-blocks | **Input:** real | **Output:** real

### Purpose

Applies one of five mathematical functions: ln, log10, dB, exp, pow10.

### Algorithm

- `ln`: y = ln(max(|x|, epsilon))
- `log10`: y = log10(max(|x|, epsilon))
- `dB`: y = 20*log10(max(|x|, epsilon))
- `exp`: y = e^(min(x, 88))
- `pow10`: y = 10^(min(x, 38))

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| function | string | 'ln' | Function: 'ln', 'log10', 'dB', 'exp', 'pow10'. |
| epsilon | float | 1e-10 | Minimum logarithm argument value. |

### Usage Examples

1. **Level in dB:** `Signal -> LogExp(function: 'dB') -> NumericIndicator`.
2. **Dynamic range compression:** `AudioFile -> LogExp(function: 'log10') -> Oscilloscope`.

---

## Mixer

**ID:** `mixer` | **Group:** math-blocks | **Input:** real | **Output:** complex

### Purpose

Multiplies the input signal by a complex exponential exp(j*2*pi*f*t), performing spectrum translation (frequency shift). A key operation in SDR and superheterodyne receivers.

### Algorithm

I[n] = x[n] * cos(phi[n]), Q[n] = x[n] * sin(phi[n]), phi[n] = phi[n-1] + 2*pi * fShift / sampleRate.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| shiftFrequency | float | 1000 | Shift frequency, Hz. Positive = up, negative = down. |

### Usage Examples

1. **Upward spectrum shift:** `Sine(500) -> Mixer(1000) -> SpectrumAnalyzer` — peak at 1500 Hz.
2. **Frequency conversion in a receiver:** `Signal -> Mixer(-fc) -> LowpassFIR -> Demodulator`.

---

## Threshold

**ID:** `threshold` | **Group:** math-blocks | **Input:** real | **Output:** real

### Purpose

Compares the signal against a threshold and produces a two-level output. Analogous to a voltage comparator / Schmitt trigger (with hysteresis).

### Algorithm

Without hysteresis: y = x > threshold ? high : low. With hysteresis: upper threshold = threshold + hysteresis/2, lower = threshold - hysteresis/2. Switching occurs only when the corresponding threshold is crossed.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| threshold | float | 0 | Threshold level. |
| outputHigh | float | 1 | Output value above threshold. |
| outputLow | float | 0 | Output value below threshold. |
| hysteresis | float | 0 | Hysteresis zone width. 0 = simple comparator. |

### Usage Examples

1. **Square wave from sine:** `Sine(1000) -> Threshold(0) -> Oscilloscope` — rectangular pulses.
2. **Schmitt trigger:** `Sine + Noise -> Threshold(0, hysteresis: 0.3) -> Oscilloscope` — no bouncing.
