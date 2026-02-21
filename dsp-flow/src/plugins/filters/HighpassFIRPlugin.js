import DSPLib from '../../engine/DSPLib';

export default {
    id: 'HIGHPASS_FIR',
    name: 'ФВЧ КИХ-фильтр',
    description: 'ФВЧ КИХ-фильтр',
    icon: 'trending_up',
    group: 'filters',
    groupOrder: 2,
    signals: { input: 'real', output: 'real' },
    defaultParams: { order: 64, cutoff: 1000, filterType: 'highpass' },
    paramFields: [
        { name: 'order', label: 'Порядок фильтра', type: 'number', min: 1, max: 1024, step: 1, defaultValue: 64 },
        { name: 'cutoff', label: 'Частота среза (Гц)', type: 'number', min: 1, max: 24000, step: 10, defaultValue: 1000 },
    ],
    process(ctx) {
        const { inputs, params, sampleRate, bufferSize } = ctx;
        if (!inputs[0]) return new Float32Array(bufferSize);
        const { order = 64, cutoff = 1000 } = params;
        const coefficients = DSPLib.generateFIRCoefficients(order, cutoff, sampleRate, 'highpass');
        return DSPLib.firFilter(inputs[0], coefficients);
    },
};
