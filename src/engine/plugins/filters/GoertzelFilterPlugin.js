export default {
    type: 'Фильтр Герцеля',
    id: 'goertzel-filter',
    icon: 'psychology',
    description: 'Фильтр Герцеля',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        targetFrequency: 1000,
        samplingRate: 48000,
        N: 256,
    },
    processor: {
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize);
        }
    }
};
