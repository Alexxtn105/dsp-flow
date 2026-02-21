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
        if (!inputs[0]) return { real: new Float32Array(bufferSize / 2), imag: new Float32Array(bufferSize / 2) };
        const { fftSize = bufferSize } = params;
        return DSPLib.fft(inputs[0], fftSize);
    },
};
