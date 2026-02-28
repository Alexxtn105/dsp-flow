import WindowFunctions from '../_shared/WindowFunctions.js';
import { fft, computeMagnitudeDB } from '../_shared/FFTUtils.js';

export default {
    type: 'Спектроанализатор',
    id: 'spectrum-analyzer',
    icon: 'dsp-spectrum',
    description: 'Спектральный анализ',
    group: 'visualization',
    signals: { input: 'real', output: null },
    defaultParams: {
        fftSize: 2048,
        windowFunction: 'blackman-harris',
        dBScale: true,
        averaging: 5,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize / 2);

            const fftSize = params.fftSize || 2048;
            const windowName = params.windowFunction || 'blackman-harris';
            const windowFunc = WindowFunctions[windowName] || WindowFunctions['blackman-harris'];
            const useDbs = params.dBScale !== false;
            const avgFrames = Math.max(1, params.averaging || 1);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    buffer: new Float32Array(fftSize),
                    pointer: 0,
                    avgSpectrum: null
                });
            }

            const state = this.states.get(nodeId);

            // Пересоздаём буфер при изменении fftSize
            if (state.buffer.length !== fftSize) {
                state.buffer = new Float32Array(fftSize);
                state.pointer = 0;
                state.avgSpectrum = null;
            }

            const { buffer } = state;
            let { pointer } = state;

            for (let i = 0; i < input.length; i++) {
                buffer[pointer] = input[i];
                pointer = (pointer + 1) % fftSize;
            }
            state.pointer = pointer;

            const processingBuffer = new Float32Array(fftSize);
            for (let i = 0; i < fftSize; i++) {
                processingBuffer[i] = buffer[(pointer + i) % fftSize];
            }

            for (let i = 0; i < fftSize; i++) {
                processingBuffer[i] *= windowFunc(i, fftSize);
            }

            const real = new Float32Array(fftSize);
            const imag = new Float32Array(fftSize);
            real.set(processingBuffer);

            fft(real, imag);

            const half = fftSize / 2;
            const currentSpectrum = new Float32Array(half);

            if (useDbs) {
                const dbSpectrum = computeMagnitudeDB(real, imag);
                currentSpectrum.set(dbSpectrum);
            } else {
                // Линейная магнитуда
                for (let i = 0; i < half; i++) {
                    const scale = (i === 0) ? (1 / fftSize) : (2 / fftSize);
                    currentSpectrum[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) * scale;
                }
            }

            // Экспоненциальное усреднение
            if (avgFrames > 1) {
                const alpha = 1 / avgFrames;
                if (!state.avgSpectrum || state.avgSpectrum.length !== half) {
                    state.avgSpectrum = new Float32Array(currentSpectrum);
                } else {
                    for (let i = 0; i < half; i++) {
                        state.avgSpectrum[i] += alpha * (currentSpectrum[i] - state.avgSpectrum[i]);
                    }
                }
                return new Float32Array(state.avgSpectrum);
            }

            return currentSpectrum;
        }
    }
};
