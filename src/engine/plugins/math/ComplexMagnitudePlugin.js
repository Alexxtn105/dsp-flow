export default {
    type: 'Амплитуда (комплексная)',
    id: 'complex-magnitude',
    icon: 'dsp-magnitude',
    description: 'Извлечение амплитуды комплексного сигнала (модуль)',
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
                const re = input[i * 2];
                const im = input[i * 2 + 1];
                output[i] = Math.sqrt(re * re + im * im);
            }

            return output;
        }
    }
};
