export default {
    type: 'Квадрат (действ.)',
    id: 'real-square',
    icon: 'dsp-square',
    description: 'Возведение действительного сигнала в квадрат',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real' },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const output = new Float32Array(chunkSize);
            for (let i = 0; i < chunkSize; i++) {
                const v = i < input.length ? input[i] : 0;
                output[i] = v * v;
            }

            return output;
        }
    }
};
