export default {
    type: 'Интегратор',
    id: 'integrator',
    icon: 'functions',
    description: 'Интегратор',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        integrationTime: 1.0,
        resetOnOverflow: true,
        maxValue: 1000,
    },
    processor: {
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize);
        }
    }
};
