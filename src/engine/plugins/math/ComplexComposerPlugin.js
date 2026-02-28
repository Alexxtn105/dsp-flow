export default {
    type: 'Формирователь комплексного',
    id: 'complex-composer',
    icon: 'dsp-complex-compose',
    description: 'Формирует комплексный сигнал из двух действительных (Re + jIm). Верхний вход — действительная часть, нижний — мнимая',
    group: 'math-blocks',
    signals: { input: 'real', output: 'complex', inputsCount: 2 },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const re = inputs[0];
            const im = inputs[1];

            if (!re && !im) return new Float32Array(chunkSize * 2);

            const numSamples = re ? re.length : im.length;
            const output = new Float32Array(numSamples * 2);

            for (let i = 0; i < numSamples; i++) {
                output[i * 2] = re ? re[i] : 0;
                output[i * 2 + 1] = im ? im[i] : 0;
            }

            return output;
        }
    }
};
