import DSPLib from '../../engine/DSPLib';

export default {
    id: 'SUMMER',
    name: 'Сумматор',
    description: 'Сумматор сигналов',
    icon: 'add',
    group: 'math-blocks',
    groupOrder: 1,
    signals: { input: 'real', output: 'real' },
    defaultParams: {},
    paramFields: [],
    validate() { return []; },
    process(ctx) {
        const { inputs, bufferSize } = ctx;
        if (!inputs || inputs.length === 0) return new Float32Array(bufferSize);
        return DSPLib.sum(inputs);
    },
};
