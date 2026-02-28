export default {
    type: 'Степень 4 (действ.)',
    id: 'real-power4',
    icon: 'dsp-power4',
    description: 'Возведение действительного сигнала в 4-ю степень',
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
                const v2 = v * v;
                output[i] = v2 * v2;
            }

            return output;
        }
    }
};
