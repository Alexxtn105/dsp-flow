export default {
    type: 'Перемножитель',
    id: 'multiplier',
    icon: 'close',
    description: 'Перемножитель',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real', inputsCount: 2 },
    defaultParams: {
        numInputs: 2,
        operation: 'multiply',
        scaleFactor: 1.0,
    },
    processor: {
        process(inputs, params, chunkSize) {
            const output = new Float32Array(chunkSize);
            const scale = params.scaleFactor ?? 1.0;

            if (inputs.length === 0 || !inputs[0]) {
                return output;
            }

            // Начинаем с первого входа
            const first = inputs[0];
            for (let i = 0; i < chunkSize; i++) {
                output[i] = i < first.length ? first[i] : 0;
            }

            // Перемножаем с каждым последующим входом
            for (let idx = 1; idx < inputs.length; idx++) {
                const inp = inputs[idx];
                if (!inp) continue;
                for (let i = 0; i < chunkSize; i++) {
                    output[i] *= (i < inp.length ? inp[i] : 0);
                }
            }

            // Применяем масштабный коэффициент
            if (scale !== 1.0) {
                for (let i = 0; i < chunkSize; i++) {
                    output[i] *= scale;
                }
            }

            return output;
        }
    }
};
