import DSPLib from '../../engine/DSPLib';

export default {
    id: 'LOWPASS_FIR',
    name: 'ФНЧ КИХ-фильтр',
    description: 'ФНЧ КИХ-фильтр',
    icon: 'trending_down',
    group: 'filters',
    groupOrder: 3,
    signals: { input: 'real', output: 'real' },
    defaultParams: { order: 64, cutoff: 1000, filterType: 'lowpass' },
    paramFields: [
        { name: 'order', label: 'Порядок фильтра', type: 'number', min: 1, max: 1024, step: 1, defaultValue: 64 },
        { name: 'cutoff', label: 'Частота среза (Гц)', type: 'number', min: 1, max: 24000, step: 10, defaultValue: 1000 },
    ],
    validate(params) {
        const errors = [];
        if (!params.order || params.order < 1 || params.order > 1024) {
            errors.push('Порядок фильтра должен быть в диапазоне от 1 до 1024');
        }
        if (!params.cutoff || params.cutoff <= 0) {
            errors.push('Частота среза должна быть больше 0');
        }
        return errors;
    },
    process(ctx) {
        const { inputs, params, sampleRate, bufferSize } = ctx;
        if (!inputs[0]) return new Float32Array(bufferSize);
        const { order = 64, cutoff = 1000 } = params;
        const coefficients = DSPLib.generateFIRCoefficients(order, cutoff, sampleRate, 'lowpass');
        return DSPLib.firFilter(inputs[0], coefficients);
    },
};
