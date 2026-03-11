# Filters

Signal filtering and processing blocks: frequency filtering, sample rate conversion, delay, and single-frequency spectral analysis.

---

## Notch FIR Filter

**ID:** `notch-fir-filter` | **Group:** filters | **Input:** real | **Output:** real

### Purpose

Removes (suppresses) the signal in a narrow band around a specified frequency while passing all other frequencies unchanged. Typical applications include removing interference at a known frequency (50/60 Hz mains hum, tonal interference, pilot tone).

### Algorithm

The filter is constructed using spectral inversion: first, a bandpass FIR filter (windowed sinc) is designed for the target band, then its coefficients are inverted using the formula notch[n] = delta[n-center] - bandpass[n]. The bandpass filter is normalized so that its gain at the center frequency equals 1.0. The order is forced to be odd (Type I linear phase).

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| notchFrequency | float | 1000 | Center rejection frequency in Hz. |
| bandwidth | float | 200 | Rejection bandwidth in Hz. |
| order | int | 65 | Filter order. Recommended range: 31-255. Automatically rounded to odd. |
| windowFunction | string | 'hamming' | Window function: 'rectangular', 'hamming', 'hanning', 'blackman', 'blackman-harris', 'nuttall', 'flattop'. |

### Usage Examples

1. **Removing tonal interference:**
   `Sine(1000) + NoiseGenerator -> Summer -> NotchFIR(1000Hz, bw=200) -> Oscilloscope` — only noise is visible on the oscilloscope.

2. **Suppressing 50 Hz mains hum:**
   `AudioFile -> NotchFIR(50Hz, bw=10, order=127) -> Speaker` — narrow bandwidth and high order precisely remove the hum.

3. **Cascading notch filters:**
   `Signal -> NotchFIR(1000Hz) -> NotchFIR(2000Hz) -> NotchFIR(3000Hz) -> Oscilloscope` — sequential removal of multiple interference sources.

---

## Bandpass FIR Filter

**ID:** `bandpass-fir-filter` | **Group:** filters | **Input:** real | **Output:** real

### Purpose

Passes the signal only within a specified frequency range (from lowCutoff to highCutoff), suppressing everything below and above this band. Allows extracting a useful signal from a mixture, limiting the bandwidth before demodulation, and separating channels in a multi-channel system.

### Algorithm

Windowed sinc filter method. The bandpass filter is constructed as the difference of two lowpass filters: one with cutoff at highCutoff and another at lowCutoff. The coefficients are multiplied by the selected window function.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| order | int | 64 | Filter order. Recommended range: 16-512. |
| lowCutoff | float | 1000 | Lower edge of the passband in Hz. |
| highCutoff | float | 3000 | Upper edge of the passband in Hz. |
| windowFunction | string | 'hamming' | Window function. |

### Usage Examples

1. **Extracting the speech range:**
   `AudioFile -> BandpassFIR(300Hz-3400Hz) -> Speaker` — the classic telephone band.

2. **Pre-demodulation filtering:**
   `Sine(2000) + NoiseGenerator -> Summer -> BandpassFIR(1500-2500Hz) -> Oscilloscope` — the bandpass filter extracts the 2 kHz signal from noise.

---

## Highpass FIR Filter

**ID:** `highpass-fir-filter` | **Group:** filters | **Input:** real | **Output:** real

### Purpose

Passes frequencies above a specified cutoff frequency, suppressing all low-frequency components. Used for removing DC offset, low-frequency drift, and extracting high-frequency components.

### Algorithm

Built on the windowed sinc filter using spectral inversion of a lowpass filter: first a lowpass filter is designed, then its coefficients are inverted to obtain a highpass filter.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| order | int | 64 | Filter order. Recommended range: 16-512. |
| cutoff | float | 1000 | Cutoff frequency in Hz. |
| windowFunction | string | 'hamming' | Window function. |

### Usage Examples

1. **Removing DC offset:**
   `Constant(0.5) + Sine(1000) -> Summer -> HighpassFIR(10Hz) -> Oscilloscope` — the DC component is removed.

2. **Extracting high-frequency noise:**
   `AudioFile -> HighpassFIR(5000Hz, order=128) -> SpectrumAnalyzer` — only components above 5 kHz are visible on the spectrum.

---

## Lowpass FIR Filter

**ID:** `lowpass-fir-filter` | **Group:** filters | **Input:** real | **Output:** real

### Purpose

Passes frequencies below a specified cutoff frequency, suppressing high-frequency components. The most common filter type in DSP. Used for smoothing, anti-aliasing filtering before decimation, bandwidth limiting, and envelope extraction.

### Algorithm

Windowed sinc filter method. The ideal lowpass filter has an impulse response of sinc(2*fc*n), truncated to a finite number of samples and multiplied by a window function.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| order | int | 64 | Filter order. Recommended range: 16-512. |
| cutoff | float | 1000 | Cutoff frequency in Hz. |
| windowFunction | string | 'hamming' | Window function. Hamming ~43 dB stopband attenuation, Blackman ~58 dB, Blackman-Harris ~92 dB. |

### Usage Examples

1. **Removing high-frequency noise:**
   `Sine(100) + NoiseGenerator -> Summer -> LowpassFIR(500Hz) -> Oscilloscope` — noise is suppressed.

2. **Anti-aliasing filter before decimation:**
   `AudioFile -> LowpassFIR(4000Hz, order=128) -> DecimatorInterpolator(factor=4)` — prevents spectral aliasing.

3. **Extracting the AM signal envelope:**
   `AMFMPMModulator(AM) -> AmplitudeDetector -> LowpassFIR(100Hz) -> Oscilloscope`.

---

## Hilbert Transformer

**ID:** `hilbert-transformer` | **Group:** filters | **Input:** real | **Output:** complex

### Purpose

Converts a real signal into a complex (analytic) signal. The analytic signal is z(t) = x(t) + j*H{x(t)}, where H{x(t)} is the Hilbert transform (90-degree phase shift of all components). The analytic signal has no negative frequencies in its spectrum, simplifying the extraction of instantaneous amplitude, frequency, and phase.

### Algorithm

FIR filter with Hilbert transform coefficients: h[n] = 2/(pi*n) for odd n, h[n] = 0 for even n and n = 0. The coefficients are multiplied by a Blackman window. The Q component is the convolution result; the I component is the input signal delayed by (N-1)/2 samples.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| order | int | 64 | Hilbert filter order. Recommended range: 31-255. |
| phaseShift | float | 90 | Phase shift in degrees (reserved). |

### Usage Examples

1. **Verifying the analytic signal:**
   `Sine(1000) -> HilbertTransformer -> ComplexMagnitude -> Oscilloscope` — magnitude = const for a pure sine wave.

2. **AM signal envelope:**
   `AMFMPMModulator(AM, carrier=5000Hz) -> HilbertTransformer -> ComplexMagnitude -> LowpassFIR(100Hz) -> Oscilloscope`.

---

## Goertzel Filter

**ID:** `goertzel-filter` | **Group:** filters | **Input:** real | **Output:** real

### Purpose

Computes the power (magnitude) of a signal at a single specified frequency. Equivalent to a single DFT/FFT bin but significantly more efficient when only one or two frequencies need to be analyzed. Classic applications: DTMF tone detection, pilot tone presence detection.

### Algorithm

Recursive method for computing a single DFT element. On each sample: s0 = x[n] + coeff * s1 - s2, where coeff = 2*cos(2*pi*k/N). After N samples, magnitude = sqrt(Re^2 + Im^2) / (N/2) is computed. Complexity: O(N) for a single frequency.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| targetFrequency | float | 1000 | Analysis frequency in Hz. |
| N | int | 256 | Analysis block size. Frequency resolution: delta_f = sampleRate / N. |

### Usage Examples

1. **Measuring tone power:**
   `Sine(1000, amplitude=0.5) -> Goertzel(1000Hz, N=256) -> NumericIndicator` — will show ~0.5.

2. **Signal presence detection:**
   `AudioFile -> Goertzel(440Hz, N=1024) -> Threshold(0.1) -> NumericIndicator` — detects the presence of note A.

---

## Remez Filter

**ID:** `remez-filter` | **Group:** filters | **Input:** real | **Output:** real

### Purpose

A bandpass filter designed using the Remez algorithm (Parks-McClellan). Unlike the windowed method, the algorithm minimizes the maximum error (equiripple design): ripples are uniformly distributed. This produces an optimal filter for a given order.

### Algorithm

Iterative Parks-McClellan method. On each iteration, extrema are found and coefficients are recalculated until convergence. The order is forced to be odd (Type I).

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| order | int | 101 | Filter order. Recommended range: 31-501. |
| lowCutoff | float | 1000 | Lower edge of the passband in Hz. |
| highCutoff | float | 3000 | Upper edge of the passband in Hz. |

### Usage Examples

1. **Precise bandpass filtering:**
   `AudioFile -> Remez(1000-3000Hz, order=101) -> SpectrumAnalyzer` — very steep transitions and uniform ripples.

2. **Comparison with windowed filter:**
   At the same order, Remez shows better stopband attenuation.

---

## Delay Line

**ID:** `delay-line` | **Group:** filters | **Input:** real | **Output:** real

### Purpose

Delays the input signal by a specified number of samples. A fundamental building block for comb filters, echo effects, group delay compensation, and correlation analysis.

### Algorithm

Implemented via a circular buffer of size N. On each sample, the delayed value is read and the new value is written. O(1) per sample. When the delay length changes, the buffer is recreated with tail copying.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| delaySamples | int | 100 | Number of samples to delay. Delay in seconds = delaySamples / sampleRate. |

### Usage Examples

1. **Simple echo:**
   `Sine(1000) -> DelayLine(4800) -> Summer(with original) -> Oscilloscope` — a 100 ms delay creates an echo.

2. **Compensating filter delay:**
   DelayLine(order/2) compensates the group delay of an FIR filter.

---

## Decimator / Interpolator

**ID:** `decimator-interpolator` | **Group:** filters | **Input:** real | **Output:** real

### Purpose

Changes the signal sample rate: decreases (decimation) or increases (interpolation) the number of samples. Needed when different parts of the system operate at different rates.

### Algorithm

- **Decimation:** anti-aliasing lowpass filter (sinc + Hamming) -> downsampling of every factor-th sample.
- **Interpolation:** zero-stuffing (inserting zeros) with gain compensation -> anti-imaging lowpass filter.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| mode | string | 'decimate' | Mode: 'decimate' or 'interpolate'. |
| factor | int | 2 | Rate change factor. Range: 1-16. |
| filterEnabled | bool | true | Enable built-in filter. |

### Usage Examples

1. **Reducing the sample rate:**
   `AudioFile(48kHz) -> DecimatorInterpolator(decimate, factor=4) -> SpectrumAnalyzer` — decimated to 12 kHz.

2. **Multi-stage decimation:**
   `Signal -> DecimatorInterpolator(decimate, 4) -> DecimatorInterpolator(decimate, 4)` — two-stage decimation by a factor of 16.

---

## CIC Filter

**ID:** `cic-filter` | **Group:** filters | **Input:** real | **Output:** real

### Purpose

Cascaded Integrator-Comb — a specialized filter for sample rate conversion without multiplication operations. Extremely efficient at large decimation factors (10x and above). Widely used in SDR receivers.

### Algorithm

Structure: cascade of N integrators -> rate change -> cascade of N combs. Integrators are implemented on Int32Array with wrapping arithmetic. The CIC frequency response is sinc^N(f).

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| stages | int | 3 | Number of stages. Range: 1-6. |
| decimationFactor | int | 4 | Decimation/interpolation factor (R). Range: 2-64. |
| mode | string | 'decimate' | Mode: 'decimate' or 'interpolate'. |

### Usage Examples

1. **Fast decimation in SDR:**
   `Signal -> CIC(stages=4, R=16, decimate) -> FIRFilter -> SpectrumAnalyzer` — CIC reduces the rate by 16x, the FIR filter compensates the frequency response droop.

2. **Interpolation:**
   `Signal(12kHz) -> CIC(stages=3, R=4, interpolate) -> LowpassFIR -> Speaker`.

---

## FIR Filter

**ID:** — (factory function `createFIRProcessor`) | **Group:** filters

### Purpose

A factory for FIR filter processors: lowpass, highpass, and bandpass. Used by the LowpassFIR, HighpassFIR, and BandpassFIR plugins.

### Algorithm

Windowed sinc design method: the ideal sinc impulse response, scaled by the cutoff frequency, is multiplied by a window function. Filtering uses a circular buffer. FIR filters guarantee a linear phase response with symmetric coefficients.

---

## IIR Filter

**ID:** `iir-filter` | **Group:** filters | **Input:** real | **Output:** real

### Purpose

Infinite impulse response (recursive) filter. Provides steep rolloff at low orders: a 4th-order Butterworth filter achieves a slope of 80 dB/decade. Drawback — nonlinear phase response.

### Algorithm

Two designs:
- **Butterworth:** Maximally flat magnitude response, rolloff of order * 20 dB/decade.
- **Chebyshev Type I:** Steeper rolloff with equiripple passband.

Analog prototype -> bilinear transform with frequency pre-warping. Implementation — cascade of biquad sections (SOS).

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| filterDesign | string | 'butterworth' | Type: 'butterworth' or 'chebyshev1'. |
| filterType | string | 'lowpass' | Filter type: 'lowpass' or 'highpass'. |
| cutoffFrequency | float | 1000 | Cutoff frequency in Hz. |
| order | int | 4 | Filter order. Range: 1-10. |
| ripple | float | 1 | Passband ripple in dB (Chebyshev Type I only). |

### Usage Examples

1. **Sharp lowpass with low order:**
   `NoiseGenerator -> IIRFilter(butterworth, lowpass, 2000Hz, order=6) -> SpectrumAnalyzer` — 120 dB/decade rolloff.

2. **Highpass for DC removal:**
   `AudioFile -> IIRFilter(butterworth, highpass, 20Hz, order=2) -> Speaker` — removes DC and infrasound.
