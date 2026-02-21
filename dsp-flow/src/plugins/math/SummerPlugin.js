import DSPLib from '../../engine/DSPLib';

export default {
    id: 'SUMMER',
    name: 'Сумматор',
    description: 'Сумматор сигналов',
    icon: 'add',
    group: 'math-blocks',
    groupOrder: 1,
    signals: { input: 'real', output: 'real' },
    defaultParams: { numInputs: 2, weights: [1.0, 1.0], normalization: 'none' },
    process(ctx) {
        const { inputs, bufferSize } = ctx;
        if (!inputs || inputs.length === 0) return new Float32Array(bufferSize);
        return DSPLib.sum(inputs);
    },
};
