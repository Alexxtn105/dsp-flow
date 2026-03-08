export default {
    type: 'Абсолютное значение',
    id: 'absolute-value',
    icon: 'dsp-abs',
    description: 'Модуль (абсолютное значение) сигнала',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real' },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const output = new Float32Array(chunkSize);
            for (let i = 0; i < chunkSize; i++) {
                output[i] = Math.abs(i < input.length ? input[i] : 0);
            }

            return output;
        }
    }
};
