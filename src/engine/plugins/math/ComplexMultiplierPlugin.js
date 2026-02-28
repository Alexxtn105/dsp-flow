export default {
    type: 'Комплексный перемножитель',
    id: 'complex-multiplier',
    icon: 'dsp-multiply',
    description: 'Перемножение двух комплексных сигналов',
    group: 'math-blocks',
    signals: { input: 'complex', output: 'complex', inputsCount: 2 },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            const a = inputs[0];
            const b = inputs[1];
            if (!a || !b) return new Float32Array(a ? a.length : b ? b.length : chunkSize * 2);

            const len = a.length;
            const output = new Float32Array(len);

            // (aRe + j*aIm) * (bRe + j*bIm) = (aRe*bRe - aIm*bIm) + j*(aRe*bIm + aIm*bRe)
            const numSamples = len >> 1;
            for (let i = 0; i < numSamples; i++) {
                const aRe = a[i * 2];
                const aIm = a[i * 2 + 1];
                const bRe = b[i * 2];
                const bIm = b[i * 2 + 1];
                output[i * 2] = aRe * bRe - aIm * bIm;
                output[i * 2 + 1] = aRe * bIm + aIm * bRe;
            }

            return output;
        }
    }
};
