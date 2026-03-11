# Detectors

Signal parameter extraction blocks: phase, frequency, amplitude, synchronization. Includes detectors, demodulators, PLL, and timing recovery.

---

## Phase Detector

**ID:** `phase-detector` | **Group:** detectors | **Input:** complex | **Output:** real

### Purpose

Extracts the instantaneous phase from a complex (I/Q) signal and represents it in one of several formats. Phase is the angle of the vector (I, Q) on the complex plane.

### Algorithm

1. phi[n] = atan2(Q, I), range (-pi, pi].
2. Phase unwrapping: delta_phi is corrected by +/-2*pi when |delta_phi| > pi.
3. Accumulation: accumPhase += delta_phi.
4. Conversion to the selected format and scaling.

Protection: when |z| < 1e-10, the phase is undefined — the last accumulated value is output.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| referenceFrequency | float | 1000 | Reference frequency (informational), Hz. |
| sensitivity | float | 1.0 | Output gain coefficient. Range: 0.01-100. |
| outputRange | string | '+/-180' | Format: '+/-180' (degrees, accumulated), '0-360' (degrees, wrapped), '0-2pi' (radians, wrapped), '+/-pi' (radians, accumulated). |

### Usage Examples

1. **Visualizing linear phase growth:**
   `RefSine(1000) -> ComplexComposer -> PhaseDetector(+/-180) -> Oscilloscope` — linearly increasing phase.

2. **Sawtooth phase:**
   `RefSine(1000) -> ComplexComposer -> PhaseDetector(0-360) -> Oscilloscope` — wraps every 360 degrees.

3. **Phase modulation demodulation:**
   `AMFMPMModulator(PM) -> HilbertTransformer -> PhaseDetector(+/-pi) -> Oscilloscope` — the extracted phase reproduces the modulating signal.

---

## Frequency Detector

**ID:** `frequency-detector` | **Group:** detectors | **Input:** complex | **Output:** real

### Purpose

Determines the instantaneous frequency of a complex signal and extracts components within a specified band around the center frequency. Useful for tracking the frequency of a specific component in a noisy signal.

### Algorithm

1. phi[n] = atan2(Q, I)
2. delta_phi = unwrap(phi[n] - phi[n-1])
3. f = delta_phi * sampleRate / (2*pi)
4. deviation = f - centerFrequency
5. If |deviation| > bandwidth/2, output = 0.
6. out = deviation * sensitivity

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| centerFrequency | float | 1000 | Center frequency, Hz. |
| bandwidth | float | 100 | Passband width, Hz. |
| sensitivity | float | 1.0 | Output gain coefficient. |

### Usage Examples

1. **Frequency tracking:**
   `RefSine(1000) -> ComplexComposer -> FrequencyDetector(fc=1000, BW=100) -> Oscilloscope` — output near zero.

2. **Narrowband FM detection:**
   `AMFMPMModulator(FM, fc=1000, dev=30) -> HilbertTransformer -> FrequencyDetector(fc=1000, BW=100) -> Oscilloscope` — recovered modulating signal.

---

## Amplitude Detector

**ID:** `amplitude-detector` | **Group:** detectors | **Input:** real | **Output:** real

### Purpose

Extracts the amplitude envelope of the input signal. Works similarly to a level detector in analog compressors and limiters.

### Algorithm

Exponential smoothing with separate time constants:
- If |x[n]| > env[n-1]: env[n] = env[n-1] + alpha_a * (|x[n]| - env[n-1]) (attack)
- Otherwise: env[n] = env[n-1] + alpha_r * (|x[n]| - env[n-1]) (release)

Coefficients: alpha = 1 - exp(-1 / (sampleRate * time_sec)).

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| attackTime | float | 1 | Attack time in ms. Range: 0.01-50 ms. |
| releaseTime | float | 50 | Release time in ms. Range: 1-1000 ms. |

### Usage Examples

1. **Visualizing audio envelope:**
   `AudioFile -> AmplitudeDetector(attack=1, release=50) -> Oscilloscope`.

2. **AM demodulation:**
   `AMFMPMModulator(AM) -> AmplitudeDetector(attack=0.1, release=10) -> Oscilloscope` — recovering the modulating signal.

3. **Level measurement:**
   `Sine(1000) -> AmplitudeDetector(attack=5, release=200) -> NumericIndicator`.

---

## PLL (Phase-Locked Loop)

**ID:** `pll` | **Group:** detectors | **Input:** complex | **Output:** complex + real

### Purpose

A classic 2nd-order phase-locked loop with per-sample feedback. Acquires and tracks the phase and frequency of the input signal.

### Algorithm

1. **Phase detector:** atan2(inQ*ncoI - inI*ncoQ, inI*ncoI + inQ*ncoQ)
2. **Loop filter (PI):** u(n) = Kp*e(n) + Ki*sum(e(k)), where Kp = 2*zeta*omega_n, Ki = omega_n^2 (Gardner's formulas)
3. **NCO:** phase accumulator controlled by the sum of the base frequency and the loop filter output

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| centerFrequency | float | 1000 | Initial NCO frequency, Hz. |
| bandwidth | float | 50 | Loop acquisition bandwidth, Hz. omega_n = 2*pi*BW. |
| damping | float | 0.707 | Damping factor zeta. 0.707 is the Butterworth optimum. |

**Outputs:**
- Output 0: complex — NCO output (recovered carrier, interleaved I/Q)
- Output 1: real — phase error (radians)

### Usage Examples

1. **Acquiring and tracking a sine wave:**
   `RefSine(1000) -> ComplexComposer -> PLL(fc=1000, BW=50) -> ComplexMagnitude -> Oscilloscope` — PLL acquires the tone, phase error approaches zero.

2. **Carrier recovery in a PSK receiver:**
   `PSKModulator(QPSK, sps=4) -> TimingRecovery(sps=4) -> PLL(fc=0, BW=30) -> Constellation` — PLL compensates for phase offset.

3. **Loop acquisition analysis:**
   `RefSine(1050) -> ComplexComposer -> PLL(fc=1000, BW=100) -> [phase error] -> Oscilloscope` — the error decay is visible.

---

## AM/FM/PM Demodulator

**ID:** `amfmpm-demodulator` | **Group:** detectors | **Input:** real | **Output:** real

### Purpose

Extracts the information signal from a modulated waveform. The input is a real signal; internally, an analytic signal is formed via Hilbert transform (31-tap FIR filter with Hamming window).

### Algorithm

- **AM:** envelope = sqrt(I^2 + Q^2), then DC blocking (y[n] = x[n] - x[n-1] + 0.995*y[n-1]).
- **FM:** instantaneous frequency via conj(z[n-1])*z[n], delta_phi = atan2(Im, Re), f = delta_phi * sampleRate / (2*pi).
- **PM:** instantaneous phase = atan2(Q, I), values in radians (-pi to pi).

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| modulationType | string | 'AM' | Demodulation type: 'AM', 'FM', 'PM'. |
| carrierFrequency | float | 10000 | Carrier frequency, Hz (informational). |

### Usage Examples

1. **FM demodulation:**
   `AMFMPMModulator(FM, fc=10000, dev=5000) -> AMFMPMDemodulator(FM) -> Oscilloscope` — recovered modulating signal.

2. **AM demodulation:**
   `AMFMPMModulator(AM) -> AMFMPMDemodulator(AM) -> Oscilloscope` — envelope detector.

---

## Frequency Discriminator

**ID:** `frequency-discriminator` | **Group:** detectors | **Input:** complex | **Output:** real

### Purpose

Computes the instantaneous frequency of a complex signal by differentiating the phase. Outputs the "raw" frequency value without filtering — a universal tool for analysis.

### Algorithm

1. phi[n] = atan2(Q, I)
2. delta_phi = phi[n] - phi[n-1] with unwrapping (+/-2*pi when |delta_phi| > pi)
3. f = delta_phi * sampleRate / (2*pi) [Hz]

**Difference from FrequencyDetector:** no bandpass filtering or scaling.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| outputMode | string | 'deviation' | 'deviation' — deviation from centerFrequency; 'absolute' — absolute frequency. |
| centerFrequency | float | 1000 | Center frequency (subtracted in deviation mode), Hz. |

### Usage Examples

1. **FM demodulation:**
   `AMFMPMModulator(FM, fc=1000, dev=200) -> HilbertTransformer -> FrequencyDiscriminator(deviation, fc=1000) -> Oscilloscope` — frequency deviation of +/-200 Hz.

2. **Absolute frequency measurement:**
   `RefSine(1000) -> FrequencyDiscriminator(absolute) -> NumericIndicator` — shows ~1000 Hz.

---

## Timing Recovery

**ID:** `timing-recovery` | **Group:** detectors | **Input:** complex | **Output:** complex

### Purpose

Recovers optimal sampling instants in a digital receiver. The input is an oversampled stream; the output is one sample per symbol at the best moment. A key block in the demodulation chain.

### Algorithm

Gardner Timing Error Detector (TED) — a non-coherent timing error detector:
- Error: e = Re{(prev_symbol - current_symbol) * conj(midpoint)}
- A PI loop filter smoothly adjusts the sampling interval.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| samplesPerSymbol | int | 4 | Number of samples per symbol. Typical values: 2, 4, 8. |
| loopBandwidth | float | 0.01 | Normalized loop bandwidth. Range: 0.001-0.05. |
| damping | float | 0.707 | Damping factor. |

### Usage Examples

1. **QPSK demodulation:**
   `PSKModulator(QPSK, sps=4) -> TimingRecovery(sps=4, BW=0.01) -> PLL -> Constellation` — timing synchronization + phase correction.

2. **8-PSK demodulation:**
   `PSKModulator(8PSK, sps=8) -> BandpassFIR -> TimingRecovery(sps=8, BW=0.005) -> Constellation` — reduced loopBandwidth for less jitter.
