import DSPLib from '../../engine/DSPLib';

export default {
    id: 'SLIDING_FFT',
    name: 'Скользящее БПФ',
    description: 'Скользящее БПФ',
    icon: 'show_chart',
    group: 'fft-blocks',
    groupOrder: 0,
    signals: { input: 'real', output: 'complex' },
    defaultParams: { windowSize: 1024, overlap: 512, fftSize: 1024 },
    paramFields: [
        { name: 'windowSize', label: 'Размер окна', type: 'number', min: 64, max: 8192, step: 64, defaultValue: 1024 },
        { name: 'overlap', label: 'Перекрытие (отсчёты)', type: 'number', min: 0, max: 8191, step: 64, defaultValue: 512 },
        { name: 'fftSize', label: 'Размер БПФ', type: 'number', min: 64, max: 16384, step: 64, defaultValue: 1024 },
    ],
    validate(params) {
        const errors = [];
        const { windowSize, overlap, fftSize } = params;
        if (!windowSize || windowSize <= 0) {
            errors.push('Размер окна должен быть больше 0');
        }
        if (overlap == null || overlap < 0) {
            errors.push('Перекрытие должно быть неотрицательным');
        }
        if (windowSize && overlap != null && overlap >= windowSize) {
            errors.push('Перекрытие должно быть меньше размера окна');
        }
        if (!fftSize || fftSize <= 0 || (fftSize & (fftSize - 1)) !== 0) {
            errors.push('Размер БПФ должен быть степенью двойки');
        }
        return errors;
    },
    process(ctx) {
        const { inputs, params } = ctx;
        if (!inputs[0]) return [];
        const { windowSize = 1024, overlap = 512, fftSize = 1024 } = params;
        const hopSize = windowSize - overlap;
        return DSPLib.slidingFFT(inputs[0], windowSize, hopSize, fftSize);
    },
};
