import DSPLib from '../../engine/DSPLib';

export default {
    id: 'SLIDING_FFT',
    name: 'Скользящее БПФ',
    description: 'Скользящее БПФ',
    icon: 'show_chart',
    group: 'fft-blocks',
    groupOrder: 0,
    signals: { input: 'real', output: 'complex' },
    defaultParams: { windowSize: 1024, overlap: 512, fftSize: 1024 },
    process(ctx) {
        const { inputs, params } = ctx;
        if (!inputs[0]) return [];
        const { windowSize = 1024, overlap = 512, fftSize = 1024 } = params;
        const hopSize = windowSize - overlap;
        return DSPLib.slidingFFT(inputs[0], windowSize, hopSize, fftSize);
    },
};
