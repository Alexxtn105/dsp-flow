export default {
    type: 'Фаза (комплексная)',
    id: 'complex-phase',
    icon: 'dsp-phase',
    description: 'Извлечение фазы комплексного сигнала (atan2)',
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
                output[i] = Math.atan2(input[i * 2 + 1], input[i * 2]);
            }

            return output;
        }
    }
};
