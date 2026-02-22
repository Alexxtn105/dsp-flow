export default {
    type: 'Интегратор',
    id: 'integrator',
    icon: 'functions',
    description: 'Интегратор',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        integrationTime: 1.0,
        resetOnOverflow: true,
        maxValue: 1000,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { prevInput: 0, accumulator: 0 });
            }
            const state = this.states.get(nodeId);

            const sampleRate = params.sampleRate ?? 48000;
            const dt = 1.0 / sampleRate;
            const resetOnOverflow = params.resetOnOverflow ?? true;
            const maxValue = params.maxValue ?? 1000;

            const output = new Float32Array(input.length);

            for (let i = 0; i < input.length; i++) {
                // Трапецеидальное интегрирование: y[n] = y[n-1] + (x[n] + x[n-1]) * dt / 2
                state.accumulator += (input[i] + state.prevInput) * dt / 2;
                state.prevInput = input[i];

                if (resetOnOverflow && Math.abs(state.accumulator) > maxValue) {
                    state.accumulator = 0;
                }

                output[i] = state.accumulator;
            }

            return output;
        }
    }
};
