import DSPLib from '../../engine/DSPLib';

export default {
    id: 'FIR_FILTER',
    name: 'КИХ-Фильтр',
    description: 'КИХ-фильтр (FIR)',
    icon: 'filter_alt',
    group: 'filters',
    groupOrder: 0,
    signals: { input: 'real', output: 'real' },
    defaultParams: { order: 64, cutoff: 1000, filterType: 'lowpass' },
    paramFields: [
        { name: 'order', label: 'Порядок фильтра', type: 'number', min: 1, max: 1024, step: 1, defaultValue: 64 },
        { name: 'cutoff', label: 'Частота среза (Гц)', type: 'number', min: 1, max: 24000, step: 10, defaultValue: 1000 },
        {
            name: 'filterType', label: 'Тип фильтра', type: 'select',
            options: [{ value: 'lowpass', label: 'ФНЧ' }, { value: 'highpass', label: 'ФВЧ' }],
            defaultValue: 'lowpass',
        },
    ],
    validate(params) {
        const errors = [];
        if (!params.order || params.order < 1 || params.order > 1024) {
            errors.push('Порядок фильтра должен быть от 1 до 1024');
        }
        if (!params.cutoff || params.cutoff <= 0) {
            errors.push('Частота среза должна быть положительной');
        }
        return errors;
    },
    process(ctx) {
        const { inputs, params, sampleRate, bufferSize } = ctx;
        if (!inputs[0]) return new Float32Array(bufferSize);
        const { order = 64, cutoff = 1000, filterType = 'lowpass' } = params;
        const coefficients = DSPLib.generateFIRCoefficients(order, cutoff, sampleRate, filterType);
        return DSPLib.firFilter(inputs[0], coefficients);
    },
};
