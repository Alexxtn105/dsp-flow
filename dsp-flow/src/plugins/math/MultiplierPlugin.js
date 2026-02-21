import DSPLib from '../../engine/DSPLib';

export default {
    id: 'MULTIPLIER',
    name: 'Перемножитель',
    description: 'Перемножитель сигналов',
    icon: 'close',
    group: 'math-blocks',
    groupOrder: 2,
    signals: { input: 'real', output: 'real' },
    defaultParams: { numInputs: 2, operation: 'multiply', scaleFactor: 1.0 },
    process(ctx) {
        const { inputs, bufferSize } = ctx;
        if (!inputs || inputs.length < 2) return new Float32Array(bufferSize);
        return DSPLib.multiply(inputs[0], inputs[1]);
    },
};
