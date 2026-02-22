export default {
    type: 'Фазовый детектор',
    id: 'phase-detector',
    icon: 'speed',
    description: 'Фазовый детектор',
    group: 'detectors',
    signals: { input: 'complex', output: 'real' },
    defaultParams: {
        referenceFrequency: 1000,
        sensitivity: 1.0,
        outputRange: '±180°',
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { prevPhase: 0, accumPhase: 0 });
            }
            const state = this.states.get(nodeId);

            const outputInDegrees = (params.outputRange ?? '±180°').includes('°');
            // Interleaved I/Q: input.length = chunkSize * 2, выход = chunkSize
            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                const I = input[i * 2];
                const Q = input[i * 2 + 1];
                let phase = Math.atan2(Q, I);

                // Phase unwrapping
                let delta = phase - state.prevPhase;
                if (delta > Math.PI) delta -= 2 * Math.PI;
                if (delta < -Math.PI) delta += 2 * Math.PI;
                state.accumPhase += delta;
                state.prevPhase = phase;

                output[i] = outputInDegrees
                    ? state.accumPhase * (180 / Math.PI)
                    : state.accumPhase;
            }

            return output;
        }
    }
};
