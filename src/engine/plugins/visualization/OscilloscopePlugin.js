export default {
    type: 'Осциллограф',
    id: 'oscilloscope',
    icon: 'dsp-oscilloscope',
    description: 'Визуализация сигнала',
    group: 'visualization',
    signals: { input: 'real', output: null },
    defaultParams: {
        timeWindow: 10,
    },
    processor: {
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize);
        }
    }
};
