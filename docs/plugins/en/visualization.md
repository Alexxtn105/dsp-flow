# Visualization

Signal display blocks: oscilloscope, spectrum analyzer, constellation, waterfall, and numeric indicators.

---

## Oscilloscope

**ID:** `oscilloscope` | **Group:** visualization | **Input:** 4x real | **Output:** null (visualization)

### Purpose

The primary signal visualization tool in the time domain. Displays signal amplitude as a function of time. Supports up to 4 independent channels for simultaneous observation of multiple signals.

### Algorithm

The block is transparent (passthrough): it passes sample arrays from all connected channels to OscilloscopeView without modification. Data is packed into {channels: [ch1, ch2, ch3, ch4]}.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| timeWindow | int | 10 | Time window width in milliseconds. |

**Inputs:** Channel 1, Channel 2, Channel 3, Channel 4

### Usage Examples

1. **Viewing a waveform:**
   `Sine(1000) -> Oscilloscope (Channel 1)` — a classic sine wave with a period of 1 ms.

2. **Comparing filter input and output:**
   `Sine + Noise -> Summer -> Oscilloscope (Channel 1)`, `Summer -> LowpassFIR -> Oscilloscope (Channel 2)` — noisy vs. cleaned.

3. **Observing beats:**
   `Sine(1000) + Sine(1050) -> Summer -> Oscilloscope` — beats at 50 Hz.

---

## Constellation

**ID:** `constellation` | **Group:** visualization | **Input:** complex | **Output:** null (visualization)

### Purpose

Constellation diagram — visualization of a digitally modulated signal. Each symbol is displayed as a point on the I/Q plane. The degree of point "spread" is used to assess channel quality and demodulator performance.

### Algorithm

Accepts an interleaved Float32Array [I0, Q0, I1, Q1, ...] and passes it without modification to ConstellationView for rendering.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| symbolRate | int | 1000 | Symbol rate in baud. |
| constellation | string | 'QPSK' | Constellation type: 'BPSK', 'QPSK', '8PSK', '16QAM'. |
| eyeDiagram | boolean | true | Eye diagram display. |

### Usage Examples

1. **Visualizing QPSK:**
   `PSKModulator(QPSK) -> Constellation` — 4 sharp points.

2. **Assessing noise impact:**
   `PSKModulator(QPSK) -> [noisy channel] -> Constellation` — "smeared" clusters.

3. **Checking synchronization:**
   `PSKModulator(8PSK, sps=4) -> TimingRecovery(sps=4) -> PLL -> Constellation` — 8 points on a circle.

---

## Waterfall

**ID:** `waterfall` | **Group:** visualization | **Input:** real | **Output:** null (visualization)

### Purpose

Spectrogram — a two-dimensional display of the spectrum over time. The horizontal axis is frequency, the vertical axis is time, and color represents amplitude. Allows observing changes in frequency content over time: speech, FM signals, interference, frequency hopping.

### Algorithm

Identical to SpectrumAnalyzer: circular buffer -> window function -> FFT -> magnitude in dB. Each spectrum frame is passed to WaterfallView for accumulation.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| fftSize | int | 2048 | FFT size. Power of two. |
| windowFunction | string | 'blackman-harris' | Window function. |
| colorMap | string | 'audition' | Color map. |
| speed | int | 1 | Scroll speed. |

### Usage Examples

1. **Analyzing an FM signal:**
   `AMFMPMModulator(FM, deviation=500) -> Waterfall` — instantaneous frequency trajectory.

2. **Speech visualization:**
   `AudioFile(speech.wav) -> Waterfall(fftSize=4096)` — horizontal bands of formants.

3. **Interference detection:**
   `Signal -> Waterfall(speed=2)` — short-duration interference is visible as bright stripes.

---

## Numeric Indicator

**ID:** `numeric-indicator` | **Group:** visualization | **Input:** real | **Output:** null (visualization)

### Purpose

Displays the instantaneous numeric value of a real signal. Analogous to a digital voltmeter: shows the last sample as a number. Useful for monitoring constant values, levels, and debugging.

### Parameters

No configurable parameters.

### Usage Examples

1. **Displaying a constant:** `Constant(3.14) -> NumericIndicator` — shows "3.14".
2. **Level monitoring:** `Sine(1000) -> AmplitudeDetector -> NumericIndicator`.
3. **Debugging:** `Signal -> Gain(0.5) -> NumericIndicator`.

---

## Complex Numeric Indicator

**ID:** `complex-numeric-indicator` | **Group:** visualization | **Input:** complex | **Output:** null (visualization)

### Purpose

Displays the instantaneous value of a complex signal in the format Re + jIm. Shows both components simultaneously for debugging complex arithmetic and verifying modulators/demodulators.

### Parameters

No configurable parameters.

### Usage Examples

1. **Viewing a complex exponential:** `RefSine(1000) -> ComplexNumericIndicator` — e.g., "0.707 + j0.707".
2. **Checking arithmetic:** `ComplexComposer(Re=3, Im=4) -> ComplexNumericIndicator` — "3.000 + j4.000".
3. **Debugging a demodulator:** `PSKModulator(QPSK) -> PLL -> ComplexNumericIndicator` — I/Q values near +/-0.707.

---

## Multi-Channel Spectrum Analyzer

**ID:** `multi-spectrum-analyzer` | **Group:** visualization | **Input:** 4x real | **Output:** null (visualization)

### Purpose

Four independent spectrum analyzers on one screen. Allows simultaneously comparing spectra of multiple signals: before and after filtering, different processing branches, multiple communication channels.

### Algorithm

Each channel performs a complete spectral analysis cycle independently: circular buffer -> window function -> FFT -> magnitude -> averaging. Results are packed into {channels: [ch1, ch2, ch3, ch4]}.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| fftSize | int | 2048 | FFT size for all channels. Power of two. |
| windowFunction | string | 'blackman-harris' | Window function. |
| dBScale | boolean | true | Display in decibels. |
| averaging | int | 5 | Frames of exponential averaging. |

**Inputs:** Channel 1, Channel 2, Channel 3, Channel 4

### Usage Examples

1. **Comparing before and after filtering:**
   `NoiseGenerator -> MultiChannelSpectrumAnalyzer (Channel 1)`, `NoiseGenerator -> LowpassFIR(1000) -> MultiChannelSpectrumAnalyzer (Channel 2)`.

2. **Monitoring multiple signals:**
   `Sine(1000) -> Channel 1`, `Sine(2000) -> Channel 2`, `Sine(3000) -> Channel 3`, `Sine(4000) -> Channel 4`.
