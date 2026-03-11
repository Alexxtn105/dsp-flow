# DSP Flow Plugin Documentation

Reference for all 59 plugins (DSP blocks) available in the DSP Flow editor. Each plugin is described with its purpose, algorithm, parameters, and usage examples.

## Categories

| Category | Count | Description |
|----------|-------|-------------|
| [Generators](generators.md) | 9 | Signal sources: tones, noise, modulators, audio files |
| [Filters](filters.md) | 12 | FIR and IIR filters, Hilbert transform, decimation/interpolation |
| [Analysis](analysis.md) | 2 | Spectrum analyzer and correlator |
| [Detectors](detectors.md) | 7 | Signal parameter extraction: phase, frequency, amplitude, synchronization |
| [Math](math.md) | 22 | Arithmetic, complex operations, AGC, mixer, threshold |
| [Visualization](visualization.md) | 6 | Oscilloscope, spectrum, waterfall, constellation, numeric indicators |
| [Output](output.md) | 1 | Audio playback |

## All Plugins

| Name | ID | Group | Input | Output |
|------|----|-------|-------|--------|
| [Sine Generator](generators.md#sine-generator) | `sine` | generators | null | real |
| [Cosine Generator](generators.md#cosine-generator) | `cosine` | generators | null | real |
| [Reference Sine (NCO)](generators.md#reference-sine-generator--nco) | `ref-sine` | generators | null | complex |
| [Reference Cosine (NCO)](generators.md#reference-cosine-generator--nco) | `ref-cosine` | generators | null | complex |
| [Audio File](generators.md#audio-file) | `audio-file` | generators | null | real |
| [Constant](generators.md#constant) | `constant` | generators | null | real |
| [Noise Generator](generators.md#noise-generator) | `noise-generator` | generators | null | real |
| [AM/FM/PM Modulator](generators.md#amfmpm-modulator) | `amfmpm-modulator` | generators | null | real |
| [PSK Modulator](generators.md#psk-modulator) | `psk-modulator` | generators | null | complex |
| [Notch FIR Filter](filters.md#notch-fir-filter) | `notch-fir` | filters | real | real |
| [Bandpass FIR Filter](filters.md#bandpass-fir-filter) | `bandpass-fir` | filters | real | real |
| [Highpass FIR Filter](filters.md#highpass-fir-filter) | `highpass-fir` | filters | real | real |
| [Lowpass FIR Filter](filters.md#lowpass-fir-filter) | `lowpass-fir` | filters | real | real |
| [Hilbert Transformer](filters.md#hilbert-transformer) | `hilbert-transformer` | filters | real | complex |
| [Goertzel Filter](filters.md#goertzel-filter) | `goertzel` | filters | real | real |
| [Remez Filter](filters.md#remez-filter) | `remez` | filters | real | real |
| [Delay Line](filters.md#delay-line) | `delay-line` | filters | real | real |
| [Decimator / Interpolator](filters.md#decimator--interpolator) | `decimator-interpolator` | filters | real | real |
| [CIC Filter](filters.md#cic-filter) | `cic-filter` | filters | real | real |
| [FIR Filter](filters.md#fir-filter) | `fir-filter` | filters | real | real |
| [IIR Filter](filters.md#iir-filter) | `iir-filter` | filters | real | real |
| [Spectrum Analyzer](analysis.md#spectrum-analyzer) | `spectrum-analyzer` | visualization | real | null |
| [Correlator](analysis.md#correlator) | `correlator` | math-blocks | 2x real | real |
| [Phase Detector](detectors.md#phase-detector) | `phase-detector` | detectors | complex | real |
| [Frequency Detector](detectors.md#frequency-detector) | `frequency-detector` | detectors | complex | real |
| [Amplitude Detector](detectors.md#amplitude-detector) | `amplitude-detector` | detectors | real | real |
| [PLL (Phase-Locked Loop)](detectors.md#pll-phase-locked-loop) | `pll` | detectors | complex | complex + real |
| [AM/FM/PM Demodulator](detectors.md#amfmpm-demodulator) | `amfmpm-demodulator` | detectors | real | real |
| [Frequency Discriminator](detectors.md#frequency-discriminator) | `frequency-discriminator` | detectors | complex | real |
| [Timing Recovery](detectors.md#timing-recovery) | `timing-recovery` | detectors | complex | complex |
| [Summer](math.md#summer) | `summer` | math-blocks | 2x real | real |
| [Multiplier](math.md#multiplier) | `multiplier` | math-blocks | 2x real | real |
| [Integrator](math.md#integrator) | `integrator` | math-blocks | real | real |
| [Real Part](math.md#real-part) | `real-part` | math-blocks | complex | real |
| [Imaginary Part](math.md#imaginary-part) | `imag-part` | math-blocks | complex | real |
| [Complex Multiplier](math.md#complex-multiplier) | `complex-multiplier` | math-blocks | 2x complex | complex |
| [Complex Summer](math.md#complex-summer) | `complex-summer` | math-blocks | 2x complex | complex |
| [Complex Square](math.md#complex-square) | `complex-square` | math-blocks | complex | complex |
| [Complex Sqrt](math.md#complex-sqrt) | `complex-sqrt` | math-blocks | complex | complex |
| [Complex Phase](math.md#complex-phase) | `complex-phase` | math-blocks | complex | real |
| [Complex Magnitude](math.md#complex-magnitude) | `complex-magnitude` | math-blocks | complex | real |
| [Complex Composer](math.md#complex-composer) | `complex-composer` | math-blocks | 2x real | complex |
| [Complex Conjugate](math.md#complex-conjugate) | `complex-conjugate` | math-blocks | complex | complex |
| [Real Square](math.md#real-square) | `real-square` | math-blocks | real | real |
| [Real Power 4](math.md#real-power-4) | `real-power4` | math-blocks | real | real |
| [Atan2](math.md#atan2) | `atan2` | math-blocks | 2x real | real |
| [AGC](math.md#agc-automatic-gain-control) | `agc` | math-blocks | real | real |
| [Absolute Value](math.md#absolute-value) | `absolute-value` | math-blocks | real | real |
| [Gain](math.md#gain) | `gain` | math-blocks | real | real |
| [Log/Exp](math.md#logexp) | `log-exp` | math-blocks | real | real |
| [Mixer](math.md#mixer) | `mixer` | math-blocks | 2x real | real |
| [Threshold](math.md#threshold) | `threshold` | math-blocks | real | real |
| [Oscilloscope](visualization.md#oscilloscope) | `oscilloscope` | visualization | 4x real | null |
| [Constellation](visualization.md#constellation) | `constellation` | visualization | complex | null |
| [Waterfall](visualization.md#waterfall) | `waterfall` | visualization | real | null |
| [Numeric Indicator](visualization.md#numeric-indicator) | `numeric-indicator` | visualization | real | null |
| [Complex Numeric Indicator](visualization.md#complex-numeric-indicator) | `complex-numeric-indicator` | visualization | complex | null |
| [Multi-Channel Spectrum Analyzer](visualization.md#multi-channel-spectrum-analyzer) | `multi-spectrum-analyzer` | visualization | 4x real | null |
| [Speaker](output.md#speaker) | `speaker` | output | real | null |
