export default {
    type: 'Референсный косинусный генератор',
    id: 'ref-cosine-generator',
    icon: 'dsp-ref-cosine',
    description: 'Управляемый референсный косинусный генератор (NCO). Верхний вход — мгновенная частота (Гц), нижний — смещение фазы (рад)',
    group: 'generators',
    signals: { input: 'real', output: 'complex', inputsCount: 2, inputLabels: ['Частота (Гц)', 'Фаза (рад)'] },
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
            const baseFrequency = params.frequency ?? 1000;
            const amplitude = params.amplitude ?? 1.0;
            const basePhaseOffset = (params.phase ?? 0) * (Math.PI / 180);
            const sampleRate = params.sampleRate ?? 48000;

            // Входы управления: inputs[0] — мгновенная частота (Гц), inputs[1] — смещение фазы (рад)
            const freqInput = inputs[0] ?? null;
            const phaseInput = inputs[1] ?? null;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentPhase: 0 });
            }
            const state = this.states.get(nodeId);

            for (let i = 0; i < chunkSize; i++) {
                const freq = freqInput ? freqInput[i] : baseFrequency;
                const phaseOffset = phaseInput ? phaseInput[i] : basePhaseOffset;
                const phaseIncrement = (2 * Math.PI * freq) / sampleRate;

                const phase = state.currentPhase + phaseOffset;
                // I = cos, Q = -sin (аналитический сигнал)
                output[i * 2] = amplitude * Math.cos(phase);
                output[i * 2 + 1] = -amplitude * Math.sin(phase);
                state.currentPhase += phaseIncrement;
                // Нормализация фазы в [0, 2π) для предотвращения потери точности
                if (state.currentPhase >= 2 * Math.PI || state.currentPhase < 0) {
                    state.currentPhase = state.currentPhase % (2 * Math.PI);
                    if (state.currentPhase < 0) state.currentPhase += 2 * Math.PI;
                }
            }

            return output;
        }
    }
};
