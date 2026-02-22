export default {
    type: 'Перемножитель',
    id: 'multiplier',
    icon: 'close',
    description: 'Перемножитель',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        numInputs: 2,
        operation: 'multiply',
        scaleFactor: 1.0,
    },
    processor: {
        process(inputs, params, chunkSize) {
            const input1 = inputs[0] || new Float32Array(chunkSize);
            const output = new Float32Array(chunkSize);

            if (inputs.length < 2 || !inputs[1]) {
                // Один вход — pass-through (умножение на 1.0)
                for (let i = 0; i < chunkSize; i++) {
                    output[i] = i < input1.length ? input1[i] : 0;
                }
            } else {
                const input2 = inputs[1];
                for (let i = 0; i < chunkSize; i++) {
                    const v1 = i < input1.length ? input1[i] : 0;
                    const v2 = i < input2.length ? input2[i] : 0;
                    output[i] = v1 * v2;
                }
            }
            return output;
        }
    }
};
