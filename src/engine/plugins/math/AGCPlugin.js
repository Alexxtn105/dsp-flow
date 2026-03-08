export default {
    type: 'АРУ',
    id: 'agc',
    icon: 'dsp-agc',
    description: 'Автоматическая регулировка усиления (АРУ)',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        targetLevel: 1.0,
        attackTime: 5,
        releaseTime: 50,
        maxGain: 100,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const targetLevel = params.targetLevel ?? 1.0;
            const attackMs = params.attackTime ?? 5;
            const releaseMs = params.releaseTime ?? 50;
            const maxGain = params.maxGain ?? 100;
            const sampleRate = params.sampleRate ?? 48000;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { gain: 1.0, envelope: 0 });
            }
            const state = this.states.get(nodeId);

            // Коэффициенты сглаживания огибающей
            const attackCoeff = attackMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * attackMs * 0.001))
                : 1;
            const releaseCoeff = releaseMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * releaseMs * 0.001))
                : 1;

            const output = new Float32Array(chunkSize);
            let env = state.envelope;
            let gain = state.gain;

            for (let i = 0; i < chunkSize; i++) {
                const sample = i < input.length ? input[i] : 0;
                const absSample = Math.abs(sample);

                // Оценка огибающей (attack/release)
                const coeff = absSample > env ? attackCoeff : releaseCoeff;
                env += coeff * (absSample - env);

                // Вычисление усиления
                if (env > 1e-10) {
                    const desiredGain = targetLevel / env;
                    gain = Math.min(desiredGain, maxGain);
                }

                output[i] = sample * gain;
            }

            state.envelope = env;
            state.gain = gain;
            return output;
        }
    }
};
