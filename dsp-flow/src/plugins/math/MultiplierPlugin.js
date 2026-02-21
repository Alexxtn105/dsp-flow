import DSPLib from '../../engine/DSPLib';

export default {
    id: 'MULTIPLIER',
    name: 'Перемножитель',
    description: 'Перемножитель сигналов',
    icon: 'close',
    group: 'math-blocks',
    groupOrder: 2,
    signals: { input: 'real', output: 'real' },
    defaultParams: {},
    paramFields: [],
    validate() { return []; },
    process(ctx) {
        const { inputs, bufferSize } = ctx;
        if (!inputs || inputs.length < 2) return new Float32Array(bufferSize);
        return DSPLib.multiply(inputs[0], inputs[1]);
    },
};
