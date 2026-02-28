export default {
    type: 'Комплексное сопряжение',
    id: 'complex-conjugate',
    icon: 'dsp-conjugate',
    description: 'Вычисляет комплексно-сопряжённый сигнал (инвертирует мнимую часть: a+jb → a−jb)',
    group: 'math-blocks',
    signals: { input: 'complex', output: 'complex' },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            const output = new Float32Array(input.length);

            for (let i = 0; i < input.length; i += 2) {
                output[i] = input[i];         // Re без изменений
                output[i + 1] = -input[i + 1]; // Im инвертируется
            }

            return output;
        }
    }
};
