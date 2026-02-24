export default {
    type: 'Фильтр Герцеля',
    id: 'goertzel-filter',
    icon: 'psychology',
    description: 'Фильтр Герцеля',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        targetFrequency: 1000,
        N: 256,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { s1: 0, s2: 0, count: 0, magnitude: 0 });
            }
            const state = this.states.get(nodeId);

            const sampleRate = params.sampleRate ?? 48000;
            const targetFreq = Math.min(params.targetFrequency ?? 1000, sampleRate / 2);
            const N = params.N ?? 256;

            const k = Math.min(Math.max(0, Math.round(N * targetFreq / sampleRate)), N - 1);
            const coeff = 2 * Math.cos(2 * Math.PI * k / N);

            const output = new Float32Array(input.length);

            const cosW = Math.cos(2 * Math.PI * k / N);
            const sinW = Math.sin(2 * Math.PI * k / N);

            for (let i = 0; i < input.length; i++) {
                const s0 = input[i] + coeff * state.s1 - state.s2;
                state.s2 = state.s1;
                state.s1 = s0;
                state.count++;

                if (state.count >= N) {
                    // Вычисляем магнитуду по формуле Гёрцеля
                    const real = state.s1 - state.s2 * cosW;
                    const imag = state.s2 * sinW;
                    state.magnitude = Math.sqrt(real * real + imag * imag);
                    // Сброс
                    state.s1 = 0;
                    state.s2 = 0;
                    state.count = 0;
                } else if (state.magnitude === 0 && state.count > 0) {
                    // До первого полного блока: вычисляем промежуточную магнитуду
                    const real = state.s1 - state.s2 * cosW;
                    const imag = state.s2 * sinW;
                    state.magnitude = Math.sqrt(real * real + imag * imag);
                }

                output[i] = state.magnitude;
            }

            return output;
        }
    }
};
