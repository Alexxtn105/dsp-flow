export default {
    type: 'Преобразователь Гильберта',
    id: 'hilbert-transformer',
    icon: 'transform',
    description: 'Преобразователь Гильберта',
    group: 'filters',
    signals: { input: 'real', output: 'complex' },
    defaultParams: {
        order: 64,
        phaseShift: 90,
    },
    processor: {
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize);
        }
    }
};
