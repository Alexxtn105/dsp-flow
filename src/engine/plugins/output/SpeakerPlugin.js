export default {
    type: 'Динамик',
    id: 'speaker',
    icon: 'volume_up',
    description: 'Аудио выход',
    group: 'output',
    signals: { input: 'real', output: null },
    defaultParams: {
        muted: false
    },
    processor: {
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize);
        }
    }
};
