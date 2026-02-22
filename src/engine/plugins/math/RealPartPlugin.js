export default {
    type: 'Re (действ. часть)',
    id: 'real-part',
    icon: 'functions',
    description: 'Извлечение действительной части комплексного сигнала',
    group: 'math-blocks',
    signals: { input: 'complex', output: 'real' },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                output[i] = input[i * 2];
            }

            return output;
        }
    }
};
