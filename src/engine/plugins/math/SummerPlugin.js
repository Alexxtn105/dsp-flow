export default {
    type: 'Сумматор',
    id: 'summer',
    icon: 'add',
    description: 'Сумматор',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        numInputs: 2,
        weights: [1.0, 1.0],
        normalization: 'none',
    },
    processor: {
        process(inputs, params, chunkSize) {
            const output = new Float32Array(chunkSize);
            const weights = params.weights || [];

            for (let idx = 0; idx < inputs.length; idx++) {
                const input = inputs[idx];
                if (!input) continue;
                const w = idx < weights.length ? weights[idx] : 1.0;
                for (let i = 0; i < chunkSize; i++) {
                    output[i] += (i < input.length ? input[i] : 0) * w;
                }
            }
            return output;
        }
    }
};
