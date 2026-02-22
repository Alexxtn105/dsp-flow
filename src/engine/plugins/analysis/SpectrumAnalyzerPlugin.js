import WindowFunctions from '../_shared/WindowFunctions.js';
import { fft, computeMagnitudeDB } from '../_shared/FFTUtils.js';

export default {
    type: 'Спектроанализатор',
    id: 'spectrum-analyzer',
    icon: 'analytics',
    description: 'Спектральный анализ',
    group: 'visualization',
    signals: { input: 'real', output: null },
    defaultParams: {
        fftSize: 2048,
        windowFunction: 'blackman-harris',
        frequencyRange: 'full',
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

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    buffer: new Float32Array(fftSize),
                    pointer: 0
                });
            }

            const state = this.states.get(nodeId);
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
            return computeMagnitudeDB(real, imag);
        }
    }
};
