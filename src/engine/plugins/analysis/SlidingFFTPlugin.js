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

            if (!this.states.has(nodeId)) {
                const windowSize = params.windowSize ?? 1024;
                this.states.set(nodeId, {
                    buffer: new Float32Array(windowSize),
                    bufferPos: 0,
                    lastMagnitude: new Float32Array(windowSize / 2)
                });
            }
            const state = this.states.get(nodeId);

            const windowSize = params.windowSize ?? 1024;
            const fftSize = params.fftSize ?? windowSize;
            const overlap = params.overlap ?? (windowSize >> 1);
            const hopSize = windowSize - overlap;
            const windowFn = WindowFunctions.hanning;

            // Выход: магнитуда половины спектра (fftSize / 2)
            const halfSpectrum = fftSize >> 1;
            const output = new Float32Array(halfSpectrum);

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

            // Копируем последний вычисленный спектр
            for (let j = 0; j < halfSpectrum && j < output.length; j++) {
                output[j] = state.lastMagnitude[j] ?? 0;
            }

            return output;
        }
    }
};
