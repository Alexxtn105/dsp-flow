export default {
    type: 'Амплитудный детектор',
    id: 'amplitude-detector',
    icon: 'dsp-amp-detect',
    description: 'Детектор огибающей амплитуды',
    group: 'detectors',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        attackTime: 1,
        releaseTime: 50,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { envelope: 0 });
            }
            const state = this.states.get(nodeId);

            const sampleRate = params.sampleRate ?? 48000;
            const attackMs = params.attackTime ?? 1;
            const releaseMs = params.releaseTime ?? 50;

            // Коэффициенты экспоненциального сглаживания
            const attackCoeff = attackMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * attackMs * 0.001))
                : 1;
            const releaseCoeff = releaseMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * releaseMs * 0.001))
                : 1;

            const output = new Float32Array(chunkSize);
            let env = state.envelope;

            for (let i = 0; i < chunkSize; i++) {
                const abs = Math.abs(i < input.length ? input[i] : 0);
                const coeff = abs > env ? attackCoeff : releaseCoeff;
                env += coeff * (abs - env);
                output[i] = env;
            }

            state.envelope = env;
            return output;
        }
    }
};
