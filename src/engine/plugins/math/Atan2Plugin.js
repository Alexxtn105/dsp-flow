export default {
    type: 'Арктангенс',
    id: 'atan2',
    icon: 'dsp-atan2',
    description: 'Арктангенс (atan2). Верхний вход — Y, нижний — X. Выход в радианах [−π, π]',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real', inputsCount: 2 },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const y = inputs[0];
            const x = inputs[1];
            const output = new Float32Array(chunkSize);

            for (let i = 0; i < chunkSize; i++) {
                const yi = y && i < y.length ? y[i] : 0;
                const xi = x && i < x.length ? x[i] : 0;
                output[i] = Math.atan2(yi, xi);
            }

            return output;
        }
    }
};
