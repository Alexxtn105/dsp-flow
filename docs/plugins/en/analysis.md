# Analysis

Spectral and correlation signal analysis blocks.

---

## Spectrum Analyzer

**ID:** `spectrum-analyzer` | **Group:** visualization | **Input:** real | **Output:** null (visualization)

### Purpose

Displays the frequency content of the input signal in real time. Decomposes the signal into frequency components and displays them as an "amplitude vs. frequency" graph. The primary diagnostic tool in DSP: allows viewing the useful signal, noise, harmonics, interference, and evaluating filtering effectiveness.

### Algorithm

1. Input samples are written into a circular buffer of size fftSize.
2. The buffer contents are multiplied by a window function (Blackman-Harris by default) to reduce spectral leakage.
3. A Fast Fourier Transform (FFT) is performed.
4. Magnitude is computed from the complex coefficients in dB or linear scale.
5. Exponential averaging is applied: S[n] = S[n-1] + alpha*(X[n] - S[n-1]), where alpha = 1/averaging.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| fftSize | int | 2048 | FFT size. Frequency resolution: delta_f = sampleRate / fftSize. Power of two: 512, 1024, 2048, 4096, 8192. |
| windowFunction | string | 'blackman-harris' | Window function: 'hann', 'hamming', 'blackman', 'blackman-harris', 'rectangular'. |
| dBScale | boolean | true | Display in decibels. |
| averaging | int | 5 | Frames of exponential averaging. 1 = no averaging, 5-10 = smoothed spectrum. |

### Usage Examples

1. **Analyzing a tonal signal:**
   `Sine(1000 Hz) -> SpectrumAnalyzer` — a sharp peak at 1 kHz.

2. **Evaluating filtering:**
   `NoiseGenerator -> LowpassFIR(cutoff=2000) -> SpectrumAnalyzer` — the spectrum is cut off above 2 kHz.

3. **Finding harmonics:**
   `AudioFile -> SpectrumAnalyzer(fftSize=4096, averaging=10)` — increased FFT size for fine spectral structure.

---

## Correlator

**ID:** `correlator` | **Group:** real-math | **Input:** 2x real | **Output:** real

### Purpose

Cross-correlation — a measure of similarity between two signals as a function of time lag. The peak of the correlation function indicates the lag of maximum match. Used for time delay estimation, signal detection in noise (matched filter), and similarity measurement.

### Algorithm

Fast method via FFT: R(tau) = IFFT(FFT(x1) * conj(FFT(x2))), complexity O(N*log N). Steps:
1. Normalization: subtract means, compute energies.
2. Zero-padding to a power of two for linear (not circular) correlation.
3. FFT(x1) * conj(FFT(x2)) -> IFFT.
4. Normalization: divide by sqrt(E1 * E2).
5. Output is centered: lag 0 is at the middle of the array.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| normalize | boolean | true | Normalization. When enabled: output in the range [-1, +1]. |
| maxLag | int | 0 | Maximum lag. 0 = full range. |

### Usage Examples

1. **Measuring delay:**
   `Sine(1000) -> Correlator (Input 1)`, `Sine(1000) -> DelayLine(50) -> Correlator (Input 2) -> Oscilloscope` — the peak is shifted 50 samples to the right of center.

2. **Signal detection in noise:**
   `[Sine(1000) + NoiseGenerator(level=2)] -> Correlator (Input 1)`, `Sine(1000) -> Correlator (Input 2)` — correlation with the reference produces a pronounced peak even with strong noise.

3. **Comparing different signals:**
   `Sine(1000) -> Correlator (Input 1)`, `Sine(2000) -> Correlator (Input 2)` — the normalized correlation is close to 0.
