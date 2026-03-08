export default {
    type: 'Константа',
    id: 'constant',
    icon: 'dsp-constant',
    description: 'Постоянное значение',
    group: 'generators',
    signals: { input: null, output: 'real' },
    defaultParams: {
        value: 1.0,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize) {
            const output = new Float32Array(chunkSize);
            const val = params.value ?? 1.0;
            output.fill(val);
            return output;
        }
    }
};
