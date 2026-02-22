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
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize);
        }
    }
};
