export default {
    type: 'Комплексный квадрат',
    id: 'complex-square',
    icon: 'dsp-square',
    description: 'Возведение комплексного сигнала в квадрат',
    group: 'math-blocks',
    signals: { input: 'complex', output: 'complex' },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            const numSamples = input.length >> 1;
            const output = new Float32Array(input.length);

            // (Re + j*Im)^2 = (Re^2 - Im^2) + j*(2*Re*Im)
            for (let i = 0; i < numSamples; i++) {
                const re = input[i * 2];
                const im = input[i * 2 + 1];
                output[i * 2] = re * re - im * im;
                output[i * 2 + 1] = 2 * re * im;
            }

            return output;
        }
    }
};
