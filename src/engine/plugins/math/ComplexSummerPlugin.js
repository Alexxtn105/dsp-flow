export default {
    type: 'Комплексный сумматор',
    id: 'complex-summer',
    icon: 'dsp-sum',
    description: 'Сложение двух комплексных сигналов',
    group: 'math-blocks',
    signals: { input: 'complex', output: 'complex', inputsCount: 2 },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const a = inputs[0];
            const b = inputs[1];

            if (!a && !b) return new Float32Array(chunkSize * 2);
            if (!a) return new Float32Array(b);
            if (!b) return new Float32Array(a);

            const len = a.length;
            const output = new Float32Array(len);

            for (let i = 0; i < len; i++) {
                output[i] = a[i] + (i < b.length ? b[i] : 0);
            }

            return output;
        }
    }
};
