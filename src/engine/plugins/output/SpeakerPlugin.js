export default {
    type: 'Динамик',
    id: 'speaker',
    icon: 'dsp-speaker',
    description: 'Аудио выход',
    group: 'output',
    signals: { input: 'real', output: null },
    defaultParams: {
        muted: false
    },
    processor: {
        process(inputs, params, chunkSize) {
            const output = inputs[0] || new Float32Array(chunkSize);
            if (params.muted) {
                return new Float32Array(chunkSize);
            }
            return output;
        }
    }
};
