import DSPLib from '../../engine/DSPLib';

export default {
    id: 'HILBERT_TRANSFORMER',
    name: 'Преобразователь Гильберта',
    description: 'Преобразователь Гильберта',
    icon: 'transform',
    group: 'filters',
    groupOrder: 4,
    signals: { input: 'real', output: 'complex' },
    defaultParams: { order: 64 },
    paramFields: [
        { name: 'order', label: 'Порядок преобразователя', type: 'number', min: 1, max: 1024, step: 1, defaultValue: 64 },
    ],
    validate(params) {
        const errors = [];
        if (!params.order || params.order < 1 || params.order > 1024) {
            errors.push('Порядок преобразователя должен быть в диапазоне от 1 до 1024');
        }
        return errors;
    },
    process(ctx) {
        const { inputs, params, bufferSize } = ctx;
        if (!inputs[0]) return { real: new Float32Array(bufferSize), imag: new Float32Array(bufferSize) };
        const { order = 64 } = params;
        return DSPLib.hilbertTransform(inputs[0], order);
    },
};
