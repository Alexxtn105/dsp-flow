export default {
    type: 'Частотный дискриминатор',
    id: 'frequency-discriminator',
    icon: 'dsp-freq-discrim',
    description: 'Мгновенная частота из производной фазы (без фильтрации и масштабирования)',
    group: 'detectors',
    signals: { input: 'complex', output: 'real' },
    defaultParams: {
        outputMode: 'deviation',
        centerFrequency: 1000,
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
            const outputMode = params.outputMode ?? 'deviation';
            const centerFreq = params.centerFrequency ?? 1000;

            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                const I = input[i * 2];
                const Q = input[i * 2 + 1];

                const mag = Math.hypot(I, Q);
                if (mag < 1e-10) {
                    output[i] = 0;
                    continue;
                }

                const phase = Math.atan2(Q, I);

                let dPhase = phase - state.prevPhase;
                while (dPhase > Math.PI) dPhase -= 2 * Math.PI;
                while (dPhase < -Math.PI) dPhase += 2 * Math.PI;
                state.prevPhase = phase;

                // Мгновенная частота (Гц)
                const instFreq = dPhase * sampleRate / (2 * Math.PI);

                output[i] = outputMode === 'absolute'
                    ? instFreq
                    : instFreq - centerFreq;
            }

            return output;
        }
    }
};
