# DSP Flow Editor

Visual graph editor for Digital Signal Processing (DSP). Drag & drop interface for building signal processing chains with real-time processing right in the browser.

**[Live Demo](https://alexxtn105.github.io/dsp-flow/)** | [Русская версия](README.md)

## Features

- **Visual programming** — build signal processing schemes without code via drag & drop
- **Real-time processing** — Web Audio API, block-based processing (1024 samples, Float32Array)
- **Three operation modes** — real-time, manual (step-by-step), file-based (WAV)
- **107 DSP blocks** — generators, filters, detectors, channels, math, audio, visualization
- **Plugin architecture** — each block is an independent plugin with metadata and processor
- **15 visualization types** — oscilloscope, spectrum, waterfall, constellation, eye diagram, histogram, etc.
- **Graph validation** — signal type compatibility checks (real/complex), cycle detection
- **Save/load** — localStorage with auto-save (5 sec debounce)
- **Localization** — English, Russian (i18next)
- **Light/dark theme**

## DSP Blocks

### Generators (17)
| Block | Description |
|-------|-------------|
| Sine Generator | Sinusoidal signal generation |
| Cosine Generator | Cosinusoidal signal generation |
| Reference Sine Generator | Reference sine for comparison |
| Reference Cosine Generator | Reference cosine for comparison |
| Audio File | WAV file loading via Web Audio API |
| Constant | Constant value source |
| Noise Generator | White, pink, and red (Brownian) noise |
| AM/FM/PM Modulator | Amplitude, frequency, and phase modulation |
| PSK Modulator | BPSK/QPSK/8PSK modulator with PRBS generator |
| QAM Modulator | 4/16/64/256-QAM modulator |
| Square Wave | Square wave generator |
| Triangle Wave | Triangle wave generator |
| Impulse | Unit impulse (delta function) |
| Chirp | Linear / exponential sweep signal |
| Step | Unit step function |
| OFDM Modulator | OFDM modulator with IFFT |
| FSK Modulator | FSK/GFSK modulator |

### Channels (3)
| Block | Description |
|-------|-------------|
| AWGN Channel | Additive white Gaussian noise |
| Fading Channel | Rayleigh/Rician fading model |
| Multipath Channel | Multipath propagation with delays |

### Filters (22)
| Block | Description |
|-------|-------------|
| Lowpass FIR | Low-pass FIR filter |
| Highpass FIR | High-pass FIR filter |
| Bandpass FIR | Band-pass FIR filter |
| Notch FIR | Narrow-band rejection FIR filter |
| IIR Filter | IIR filter (Butterworth / Chebyshev I), LPF/HPF |
| Hilbert Transformer | Analytic signal (real → complex) |
| Goertzel Filter | Single-frequency detection (Goertzel algorithm) |
| Remez Filter | Optimal FIR filter (Remez algorithm) |
| Delay Line | Signal delay by a given number of samples |
| Complex Delay Line | Complex signal delay |
| Decimation/Interpolation | Sample rate change with anti-aliasing filter |
| CIC Filter | Cascaded integrator-comb for efficient decimation/interpolation |
| FIR Filter | Arbitrary FIR filter with custom coefficients |
| Pulse Shaper | Raised Cosine / Root Raised Cosine |
| LMS Filter | Adaptive filter (LMS algorithm) |
| RLS Filter | Adaptive filter (RLS algorithm) |
| Matched Filter | Matched filter for known waveform detection |
| ZF Equalizer | Zero-Forcing equalizer |
| PID Controller | Proportional-integral-derivative controller |
| Polyphase Filter | Polyphase structure for efficient filtering |
| Fractional Delay | Signal delay by fractional number of samples |
| Allpass Filter | All-pass filter with phase modification |

### Detectors (16)
| Block | Description |
|-------|-------------|
| Frequency Detector | Signal frequency estimation |
| Phase Detector | Phase difference detection |
| Amplitude Detector | Envelope amplitude detector |
| Frequency Discriminator | Instantaneous frequency from phase derivative |
| PLL | Phase-locked loop |
| AM/FM/PM Demodulator | AM/FM/PM demodulation via analytic signal |
| Timing Recovery | Symbol timing recovery (Gardner algorithm) |
| QAM Demodulator | QAM signal demodulation |
| OFDM Demodulator | OFDM demodulation with FFT |
| FSK Demodulator | FSK signal demodulation |
| Peak Detector | Signal peak detection |
| Pitch Detector | Fundamental frequency (pitch) detection |
| Zero Crossing Detector | Zero-crossing counting |
| Carrier Recovery | Carrier recovery for coherent demodulation |
| Frame Sync | Frame synchronization via preamble correlation |
| CFAR Detector | Adaptive threshold detector (CA-CFAR) |

### Math (28)

#### Complex (11)
| Block | Description |
|-------|-------------|
| Complex Multiplier | Complex signal multiplication |
| Complex Summer | Complex signal addition |
| Complex Square | Complex signal squaring |
| Complex Sqrt | Complex signal square root |
| Complex Phase | Phase extraction from complex signal |
| Complex Magnitude | Magnitude extraction from complex signal |
| Complex Composer | Build complex signal from Re and Im |
| Complex Conjugate | Imaginary part inversion |
| Re(z) | Real part of complex signal |
| Im(z) | Imaginary part of complex signal |
| Mixer | Spectrum shift (multiplication by exp(j·2π·f·t)) |

#### Real (17)
| Block | Description |
|-------|-------------|
| Summer | Signal addition |
| Multiplier | Signal multiplication |
| Integrator | Numerical integration |
| Real Square | Real signal squaring |
| Real Sqrt | Real signal square root |
| Real Power 4 | Fourth power |
| Atan2 | Two-argument arctangent |
| AGC | Automatic gain control |
| Absolute Value | Signal absolute value |
| Gain | Signal scaling (linear / dB) |
| Log/Exp | ln, log₁₀, dB, exp, 10ˣ |
| Threshold | Threshold binarization with hysteresis |
| Correlator | Cross-correlation of two signals |
| Quantizer | Signal quantization with configurable levels |
| Sample & Hold | Sample and hold with external trigger |
| Convolution | Signal convolution |
| Wavelet Transform | Discrete wavelet transform (Haar/Daubechies) |
| Cepstrum | Signal cepstrum computation |

### Audio (3)
| Block | Description |
|-------|-------------|
| Compressor | Dynamic processing (compressor/limiter) |
| Equalizer | Parametric equalizer |
| Reverb | Reverberation effect |

### Visualization (15)
| Block | Description |
|-------|-------------|
| Oscilloscope | Time-domain signal display |
| Spectrum Analyzer | Frequency domain (FFT) |
| Waterfall | Spectrogram (frequency × time) |
| Constellation | IQ diagram for complex signals |
| Numeric Indicator | Numeric signal value display |
| Complex Numeric Indicator | Complex value display |
| Multi-Channel Spectrum Analyzer | 4-channel spectrum analysis |
| Power Meter | Average/peak power measurement |
| SNR Meter | Signal-to-noise ratio measurement |
| BER Counter | Bit error rate counter |
| Histogram | Signal value distribution |
| Eye Diagram | Eye diagram for channel quality assessment |
| THD Meter | Total harmonic distortion measurement |
| Pole-Zero Diagram | Poles and zeros on the z-plane |
| Phase Portrait | Signal phase trajectory |
| Group Delay Plot | Filter group delay plot |

### Output (1)
| Block | Description |
|-------|-------------|
| Speaker | Playback via Web Audio API |

## Tech Stack

- **React 19** + **React Flow** (`@xyflow/react`) — UI and node-based editor
- **TypeScript** — DSP engine and plugin typing (migration in progress)
- **Vite 7** — bundler and dev server
- **Web Audio API** — audio processing and playback
- **i18next** — internationalization (English, Russian)
- **Vitest** — testing (389 tests, 28 files)
- **ESLint 9** — linting (flat config)
- **GitHub Actions** — CI/CD with GitHub Pages deployment

## Installation

**Requirements:** Node.js >= 18, npm >= 8

```bash
npm install          # Install dependencies
npm run dev          # Dev server → http://localhost:5173
npm run build        # Production build → /dist
npm run preview      # Preview production build
npm run lint         # Linting
npm run test         # Run tests
```

## Usage

1. **Add blocks** — drag a block from the left panel onto the canvas
2. **Connect** — drag from an output port to an input port (real/complex types are checked automatically)
3. **Configure** — double-click a block to edit parameters
4. **Run** — press Play for real-time processing or use manual mode
5. **Visualize** — open oscilloscope/spectrum windows to monitor signals
6. **Save** — Ctrl+S or the save button (auto-save every 5 sec)

### Canvas Controls

- **Pan** — click and drag on empty space
- **Zoom** — mouse wheel
- **Delete** — select an element and press Delete

## Architecture

```
src/
├── engine/                  # DSP processing core
│   ├── PluginRegistry.js    # Plugin registry (singleton)
│   ├── GraphCompiler.js     # Validation, topological sort
│   ├── DSPProcessor.js      # Block-based signal processing
│   ├── WavFileService.js    # WAV file handling
│   ├── initPlugins.ts       # Plugin initialization
│   └── plugins/             # 107 DSP plugins by category
│       ├── _shared/         # FFTUtils, FilterDesign, WindowFunctions
│       ├── generators/      # Signal generators (17)
│       ├── channels/        # Channel models (3)
│       ├── filters/         # Filters (22)
│       ├── analysis/        # Spectrum analysis, correlator (2)
│       ├── detectors/       # Detectors and demodulators (16)
│       ├── math/            # Math operations (28)
│       ├── audio/           # Audio effects (3)
│       ├── visualization/   # Visualization (15)
│       └── output/          # Speaker (1)
├── components/
│   ├── dsp/                 # BlockNode, DSPEditor, edges
│   ├── visualization/       # Visualization views + window manager
│   ├── dialogs/             # Dialogs (params, save, load, settings)
│   ├── layout/              # Header, Footer, Toolbar, ControlToolbar
│   └── common/              # Dialog, ErrorBoundary, Icons
├── hooks/                   # useTheme, useSchemeStorage, useAutoSave,
│                            # useDialogManager, useDSPSimulation
├── contexts/                # DSPEditorContext, ThemeContext
├── services/                # StorageService, ValidationService
├── locales/                 # i18n translations (en, ru)
├── utils/                   # constants, helpers
└── styles/                  # CSS variables, global styles
```

## Tests

```bash
npm run test                                      # All 389 tests
npx vitest run tests/plugins/generators.test.js   # Single file
```

Test structure mirrors `src/engine/`:
- `tests/engine/` — PluginRegistry, GraphCompiler, DSPProcessor, WavFileService
- `tests/plugins/` — generators, filters, analysis, detectors, math, visualization, shared
- `tests/integration/` — end-to-end signal processing scenarios

## Documentation

Detailed description of each plugin with parameters and algorithms — in the [`docs/`](docs/index.md) folder.

## License

MIT
