export default {
    type: 'Осциллограф',
    id: 'oscilloscope',
    icon: 'show_chart',
    description: 'Визуализация сигнала',
    group: 'visualization',
    signals: { input: 'real', output: null },
    defaultParams: {
        timeWindow: 10,
        samplingRate: 48000,
        channels: 1,
    },
    processor: {
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize);
        }
    }
};
