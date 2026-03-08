export default {
    type: 'Генератор шума',
    id: 'noise-generator',
    icon: 'dsp-noise',
    description: 'Генератор белого/розового/красного шума',
    group: 'generators',
    signals: { input: null, output: 'real' },
    defaultParams: {
        noiseType: 'white',
        amplitude: 1.0,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const output = new Float32Array(chunkSize);
            const amplitude = params.amplitude ?? 1.0;
            const noiseType = params.noiseType ?? 'white';

            if (!this.states.has(nodeId)) {
                // Состояние для розового шума (алгоритм Voss-McCartney)
                this.states.set(nodeId, {
                    pinkB0: 0, pinkB1: 0, pinkB2: 0,
                    pinkB3: 0, pinkB4: 0, pinkB5: 0, pinkB6: 0,
                    // Состояние для красного (броуновского) шума
                    brownLast: 0
                });
            }
            const state = this.states.get(nodeId);

            for (let i = 0; i < chunkSize; i++) {
                const white = (Math.random() * 2 - 1);

                if (noiseType === 'white') {
                    output[i] = amplitude * white;
                } else if (noiseType === 'pink') {
                    // Фильтр Paul Kellet для розового шума
                    state.pinkB0 = 0.99886 * state.pinkB0 + white * 0.0555179;
                    state.pinkB1 = 0.99332 * state.pinkB1 + white * 0.0750759;
                    state.pinkB2 = 0.96900 * state.pinkB2 + white * 0.1538520;
                    state.pinkB3 = 0.86650 * state.pinkB3 + white * 0.3104856;
                    state.pinkB4 = 0.55000 * state.pinkB4 + white * 0.5329522;
                    state.pinkB5 = -0.7616 * state.pinkB5 - white * 0.0168980;
                    const pink = state.pinkB0 + state.pinkB1 + state.pinkB2
                        + state.pinkB3 + state.pinkB4 + state.pinkB5
                        + state.pinkB6 + white * 0.5362;
                    state.pinkB6 = white * 0.115926;
                    output[i] = amplitude * pink * 0.11; // нормализация ~±1
                } else if (noiseType === 'brown') {
                    // Броуновский (красный) шум: интеграция белого
                    state.brownLast = (state.brownLast + white * 0.02);
                    // Ограничение диапазона
                    if (state.brownLast > 1) state.brownLast = 1;
                    if (state.brownLast < -1) state.brownLast = -1;
                    output[i] = amplitude * state.brownLast;
                }
            }

            return output;
        }
    }
};
