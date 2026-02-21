import DSPLib from '../../engine/DSPLib';

export default {
    id: 'FFT',
    name: 'БПФ',
    description: 'БПФ (размер кратен степени двойки)',
    icon: 'multiline_chart',
    group: 'fft-blocks',
    groupOrder: 1,
    signals: { input: 'real', output: 'complex' },
    defaultParams: { fftSize: 1024 },
    paramFields: [
        { name: 'fftSize', label: 'Размер БПФ', type: 'select', options: [256, 512, 1024, 2048, 4096, 8192, 16384], defaultValue: 1024 },
    ],
    validate(params) {
        const errors = [];
        const size = params.fftSize;
        if (!size || size <= 0 || (size & (size - 1)) !== 0) {
            errors.push('Размер БПФ должен быть степенью двойки');
        }
        if (size < 64 || size > 16384) {
            errors.push('Размер БПФ должен быть в диапазоне от 64 до 16384');
        }
        return errors;
    },
    process(ctx) {
        const { inputs, params, bufferSize } = ctx;
        const { fftSize = bufferSize } = params;
        if (!inputs[0]) {
            const numBins = fftSize / 2 + 1;
            return { real: new Float32Array(numBins), imag: new Float32Array(numBins) };
        }
        return DSPLib.fft(inputs[0], fftSize);
    },
};
