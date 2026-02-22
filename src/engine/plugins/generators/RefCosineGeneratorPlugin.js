export default {
    type: 'Референсный косинусный генератор',
    id: 'ref-cosine-generator',
    icon: 'graphic_eq',
    description: 'Управляемый референсный косинусный генератор',
    group: 'generators',
    signals: { input: null, output: 'complex' },
    defaultParams: {
        frequency: 1000,
        amplitude: 1.0,
        phase: 0,
        controllable: true,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const output = new Float32Array(chunkSize);
            const frequency = params.frequency ?? 1000;
            const amplitude = params.amplitude ?? 1.0;
            const phaseOffset = (params.phase ?? 0) * (Math.PI / 180);
            const sampleRate = params.sampleRate ?? 48000;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentPhase: 0 });
            }
            const state = this.states.get(nodeId);

            const phaseIncrement = (2 * Math.PI * frequency) / sampleRate;

            for (let i = 0; i < chunkSize; i++) {
                output[i] = amplitude * Math.cos(state.currentPhase + phaseOffset);
                state.currentPhase += phaseIncrement;
                if (state.currentPhase > 2 * Math.PI) {
                    state.currentPhase -= 2 * Math.PI;
                }
            }

            return output;
        }
    }
};
