export default {
    type: 'Сумматор',
    id: 'summer',
    icon: 'dsp-sum',
    description: 'Сумматор',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real', inputsCount: 2 },
    defaultParams: {
        numInputs: 2,
        weights: [1.0, 1.0],
        normalization: 'none',
    },
    processor: {
        process(inputs, params, chunkSize) {
            const output = new Float32Array(chunkSize);
            const weights = params.weights || [];
            const normalization = params.normalization || 'none';

            let activeInputs = 0;
            for (let idx = 0; idx < inputs.length; idx++) {
                const input = inputs[idx];
                if (!input) continue;
                activeInputs++;
                const w = idx < weights.length ? weights[idx] : 1.0;
                for (let i = 0; i < chunkSize; i++) {
                    output[i] += (i < input.length ? input[i] : 0) * w;
                }
            }

            if (normalization === 'average' && activeInputs > 1) {
                for (let i = 0; i < chunkSize; i++) {
                    output[i] /= activeInputs;
                }
            } else if (normalization === 'peak') {
                let peak = 0;
                for (let i = 0; i < chunkSize; i++) {
                    const abs = Math.abs(output[i]);
                    if (abs > peak) peak = abs;
                }
                if (peak > 0) {
                    for (let i = 0; i < chunkSize; i++) {
                        output[i] /= peak;
                    }
                }
            }

            return output;
        }
    }
};
