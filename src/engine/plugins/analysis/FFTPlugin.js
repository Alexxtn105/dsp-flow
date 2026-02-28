import { fft, computeMagnitudeDB } from '../_shared/FFTUtils.js';
import WindowFunctions from '../_shared/WindowFunctions.js';

export default {
    type: 'БПФ',
    id: 'fft',
    icon: 'dsp-fft',
    description: 'БПФ (размер кратен степени двойки)',
    group: 'fft-blocks',
    signals: { input: 'real', output: 'complex' },
    defaultParams: {
        fftSize: 8192,
        windowFunction: 'hanning',
    },
    processor: {
        process(inputs, params, chunkSize) {
            const halfChunk = chunkSize >> 1;
            if (inputs.length === 0 || !inputs[0]) return new Float32Array(halfChunk);
            const input = inputs[0];
            const minSize = Math.pow(2, Math.ceil(Math.log2(input.length)));
            const fftSize = params.fftSize
                ? Math.max(Math.pow(2, Math.ceil(Math.log2(params.fftSize))), minSize)
                : minSize;
            const real = new Float32Array(fftSize);
            const imag = new Float32Array(fftSize);

            // Применяем оконную функцию перед БПФ для снижения спектральной утечки
            const windowFn = WindowFunctions[params.windowFunction] || WindowFunctions.hanning;
            for (let i = 0; i < input.length; i++) {
                real[i] = input[i] * windowFn(i, input.length);
            }

            fft(real, imag);
            const magnitude = computeMagnitudeDB(real, imag);

            // Выходной буфер фиксирован — chunkSize/2 бин для совместимости с пайплайном (C2)
            if (magnitude.length === halfChunk) return magnitude;
            const output = new Float32Array(halfChunk);
            output.set(magnitude.subarray(0, Math.min(magnitude.length, halfChunk)));
            return output;
        }
    }
};
