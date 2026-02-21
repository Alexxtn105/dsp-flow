import DSPLib from '../../engine/DSPLib';

export default {
    id: 'BANDPASS_FIR',
    name: 'Полосовой КИХ-фильтр',
    description: 'Полосовой КИХ-фильтр',
    icon: 'tune',
    group: 'filters',
    groupOrder: 1,
    signals: { input: 'real', output: 'real' },
    defaultParams: { order: 64, lowCutoff: 1000, highCutoff: 3000, filterType: 'bandpass' },
    paramFields: [
        { name: 'order', label: 'Порядок фильтра', type: 'number', min: 1, max: 1024, step: 1, defaultValue: 64 },
        { name: 'lowCutoff', label: 'Нижняя частота среза (Гц)', type: 'number', min: 1, max: 24000, step: 10, defaultValue: 1000 },
        { name: 'highCutoff', label: 'Верхняя частота среза (Гц)', type: 'number', min: 1, max: 24000, step: 10, defaultValue: 3000 },
    ],
    validate(params) {
        const errors = [];
        if (!params.order || params.order < 1 || params.order > 1024) {
            errors.push('Порядок фильтра должен быть от 1 до 1024');
        }
        if (!params.lowCutoff || params.lowCutoff <= 0) {
            errors.push('Нижняя частота среза должна быть положительной');
        }
        if (!params.highCutoff || params.highCutoff <= 0) {
            errors.push('Верхняя частота среза должна быть положительной');
        }
        if (params.lowCutoff && params.highCutoff && params.lowCutoff >= params.highCutoff) {
            errors.push('Нижняя частота должна быть меньше верхней');
        }
        return errors;
    },
    process(ctx) {
        const { inputs, params, sampleRate, bufferSize } = ctx;
        if (!inputs[0]) return new Float32Array(bufferSize);
        const { order = 64, lowCutoff = 1000, highCutoff = 3000 } = params;
        return DSPLib.bandpassFilter(inputs[0], order, lowCutoff, highCutoff, sampleRate);
    },
};
