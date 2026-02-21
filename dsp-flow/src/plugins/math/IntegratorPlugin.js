import DSPLib from '../../engine/DSPLib';

export default {
    id: 'INTEGRATOR',
    name: 'Интегратор',
    description: 'Интегратор сигнала',
    icon: 'functions',
    group: 'math-blocks',
    groupOrder: 0,
    signals: { input: 'real', output: 'real' },
    defaultParams: { integrationTime: 1.0, resetOnOverflow: true, maxValue: 1000 },
    process(ctx) {
        const { inputs, state, bufferSize } = ctx;
        if (!inputs[0]) return new Float32Array(bufferSize);
        const initialValue = state.accumulator ?? 0;
        const output = DSPLib.integrate(inputs[0], initialValue);
        state.accumulator = output[output.length - 1];
        return output;
    },
};
