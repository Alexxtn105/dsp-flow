import DSPLib from '../../engine/DSPLib';

export default {
    id: 'FFT',
    name: 'БПФ',
    description: 'БПФ (размер кратен степени двойки)',
    icon: 'multiline_chart',
    group: 'fft-blocks',
    groupOrder: 1,
    signals: { input: 'real', output: 'complex' },
    defaultParams: { fftSize: 8192, windowType: 'hann', normalize: true },
    process(ctx) {
        const { inputs, params, bufferSize } = ctx;
        const { fftSize = bufferSize } = params;
        if (!inputs[0]) {
            const numBins = fftSize / 2 + 1;
            return { real: new Float32Array(numBins), imag: new Float32Array(numBins) };
        }
        return DSPLib.fft(inputs[0], fftSize);
    },
};
