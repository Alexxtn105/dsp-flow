export default {
    id: 'GOERTZEL_FILTER',
    name: 'Фильтр Герцеля',
    description: 'Фильтр Герцеля',
    icon: 'psychology',
    group: 'filters',
    groupOrder: 5,
    signals: { input: 'real', output: 'real' },
    defaultParams: { targetFrequency: 1000, N: 256 },
    paramFields: [
        { name: 'targetFrequency', label: 'Целевая частота (Гц)', type: 'number', min: 1, max: 24000, step: 10, defaultValue: 1000 },
        { name: 'N', label: 'Размер блока (N)', type: 'number', min: 16, max: 4096, step: 16, defaultValue: 256 },
    ],
    validate(params) {
        const errors = [];
        if (!params.targetFrequency || params.targetFrequency <= 0) {
            errors.push('Целевая частота должна быть больше 0');
        }
        if (!params.N || params.N <= 0) {
            errors.push('Размер блока N должен быть больше 0');
        }
        return errors;
    },
    process(ctx) {
        const { inputs, params, sampleRate, bufferSize } = ctx;
        if (!inputs[0]) return new Float32Array(bufferSize);

        const { targetFrequency = 1000, N = 256 } = params;
        const k = Math.round(N * targetFrequency / sampleRate);
        const w = 2 * Math.PI * k / N;
        const coeff = 2 * Math.cos(w);
        const input = inputs[0];
        const output = new Float32Array(bufferSize);

        for (let blockStart = 0; blockStart < bufferSize; blockStart += N) {
            let s1 = 0, s2 = 0;
            const blockEnd = Math.min(blockStart + N, bufferSize);
            for (let i = blockStart; i < blockEnd; i++) {
                const s0 = input[i] + coeff * s1 - s2;
                s2 = s1;
                s1 = s0;
            }
            const magnitude = Math.sqrt(s1 * s1 + s2 * s2 - coeff * s1 * s2);
            for (let i = blockStart; i < blockEnd; i++) {
                output[i] = magnitude;
            }
        }

        return output;
    },
};
