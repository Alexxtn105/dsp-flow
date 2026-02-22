export default {
    type: 'Референсный синусный генератор',
    id: 'ref-sine-generator',
    icon: 'waves',
    description: 'Управляемый референсный синусный генератор',
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
            // Комплексный выход: interleaved [I0, Q0, I1, Q1, ...] размером chunkSize * 2
            const output = new Float32Array(chunkSize * 2);
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
                const phase = state.currentPhase + phaseOffset;
                // I = sin, Q = cos (аналитический сигнал)
                output[i * 2] = amplitude * Math.sin(phase);
                output[i * 2 + 1] = amplitude * Math.cos(phase);
                state.currentPhase += phaseIncrement;
                if (state.currentPhase > 2 * Math.PI) {
                    state.currentPhase -= 2 * Math.PI;
                }
            }

            return output;
        }
    }
};
