export default {
    type: 'Комплексный корень',
    id: 'complex-sqrt',
    icon: 'dsp-sqrt',
    description: 'Извлечение квадратного корня из комплексного сигнала',
    group: 'math-blocks',
    signals: { input: 'complex', output: 'complex' },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            const numSamples = input.length >> 1;
            const output = new Float32Array(input.length);

            // sqrt(Re + j*Im): r = sqrt(Re^2 + Im^2), theta = atan2(Im, Re)
            // result = sqrt(r) * (cos(theta/2) + j*sin(theta/2))
            for (let i = 0; i < numSamples; i++) {
                const re = input[i * 2];
                const im = input[i * 2 + 1];
                const r = Math.sqrt(re * re + im * im);
                const theta = Math.atan2(im, re);
                const sqrtR = Math.sqrt(r);
                const halfTheta = theta * 0.5;
                output[i * 2] = sqrtR * Math.cos(halfTheta);
                output[i * 2 + 1] = sqrtR * Math.sin(halfTheta);
            }

            return output;
        }
    }
};
