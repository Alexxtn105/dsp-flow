import { fft, computeMagnitudeDB } from '../_shared/FFTUtils.js';

export default {
    type: 'БПФ',
    id: 'fft',
    icon: 'multiline_chart',
    description: 'БПФ (размер кратен степени двойки)',
    group: 'fft-blocks',
    signals: { input: 'real', output: 'complex' },
    defaultParams: {
        fftSize: 8192,
        windowType: 'hann',
        normalize: true,
    },
    processor: {
        process(inputs, params, chunkSize) {
            if (inputs.length === 0 || !inputs[0]) return new Float32Array(chunkSize / 2);
            const input = inputs[0];
            const fftSize = Math.pow(2, Math.ceil(Math.log2(input.length)));
            const real = new Float32Array(fftSize);
            const imag = new Float32Array(fftSize);
            for (let i = 0; i < input.length; i++) real[i] = input[i];
            fft(real, imag);
            return computeMagnitudeDB(real, imag);
        }
    }
};
