import { fft } from '../_shared/FFTUtils.js';
import WindowFunctions from '../_shared/WindowFunctions.js';

export default {
    type: 'Скользящее БПФ',
    id: 'sliding-fft',
    icon: 'show_chart',
    description: 'Скользящее БПФ',
    group: 'fft-blocks',
    signals: { input: 'real', output: 'complex' },
    defaultParams: {
        windowSize: 1024,
        overlap: 512,
        fftSize: 1024,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const windowSize = params.windowSize ?? 1024;
            const fftSize = params.fftSize ?? windowSize;
            const overlap = params.overlap ?? (windowSize >> 1);
            const hopSize = windowSize - overlap;
            const halfSpectrum = fftSize >> 1;
            const windowFn = WindowFunctions.hanning;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    buffer: new Float32Array(windowSize),
                    bufferPos: 0,
                    lastMagnitude: new Float32Array(halfSpectrum)
                });
            }
            const state = this.states.get(nodeId);

            for (let i = 0; i < input.length; i++) {
                state.buffer[state.bufferPos] = input[i];
                state.bufferPos++;

                if (state.bufferPos >= windowSize) {
                    // Буфер заполнен — выполняем FFT
                    const real = new Float32Array(fftSize);
                    const imag = new Float32Array(fftSize);

                    // Применяем оконную функцию
                    for (let j = 0; j < windowSize; j++) {
                        real[j] = state.buffer[j] * windowFn(j, windowSize);
                    }
                    // Остальные нули (zero-padding если fftSize > windowSize)

                    fft(real, imag);

                    // Магнитуда половины спектра
                    for (let j = 0; j < halfSpectrum; j++) {
                        state.lastMagnitude[j] = Math.sqrt(real[j] * real[j] + imag[j] * imag[j]);
                    }

                    // Сдвигаем буфер на hopSize
                    state.buffer.copyWithin(0, hopSize);
                    state.bufferPos = overlap;
                }
            }

            // Возвращаем буфер размером chunkSize для совместимости с pipeline
            const output = new Float32Array(chunkSize);
            const copyLen = Math.min(halfSpectrum, chunkSize);
            for (let j = 0; j < copyLen; j++) {
                output[j] = state.lastMagnitude[j];
            }

            return output;
        }
    }
};
