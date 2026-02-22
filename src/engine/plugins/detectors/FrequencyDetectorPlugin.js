export default {
    type: 'Частотный детектор',
    id: 'frequency-detector',
    icon: 'timeline',
    description: 'Частотный детектор',
    group: 'detectors',
    signals: { input: 'complex', output: 'real' },
    defaultParams: {
        centerFrequency: 1000,
        bandwidth: 100,
        sensitivity: 1.0,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { prevPhase: 0 });
            }
            const state = this.states.get(nodeId);

            const sampleRate = params.sampleRate ?? 48000;
            // Interleaved I/Q: input.length = chunkSize * 2, выход = chunkSize
            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                const I = input[i * 2];
                const Q = input[i * 2 + 1];
                const phase = Math.atan2(Q, I);

                // Разность фаз с unwrapping
                let dPhase = phase - state.prevPhase;
                if (dPhase > Math.PI) dPhase -= 2 * Math.PI;
                if (dPhase < -Math.PI) dPhase += 2 * Math.PI;
                state.prevPhase = phase;

                // Мгновенная частота = dPhase * sampleRate / (2 * pi)
                output[i] = dPhase * sampleRate / (2 * Math.PI);
            }

            return output;
        }
    }
};
