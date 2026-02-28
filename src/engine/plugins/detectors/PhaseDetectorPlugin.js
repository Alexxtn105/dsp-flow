export default {
    type: 'Фазовый детектор',
    id: 'phase-detector',
    icon: 'dsp-phase-detect',
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

            const range = params.outputRange ?? '±180°';
            const sensitivity = params.sensitivity ?? 1.0;
            // Interleaved I/Q: input.length = chunkSize * 2, выход = chunkSize
            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                const I = input[i * 2];
                const Q = input[i * 2 + 1];

                // M5: Обработка нулевой магнитуды — фаза неопределена
                const mag = Math.hypot(I, Q);
                if (mag < 1e-10) {
                    // Выводим последнее накопленное значение
                    output[i] = state.accumPhase;
                    continue;
                }

                let phase = Math.atan2(Q, I);

                // Phase unwrapping (M4: while вместо if для скачков > 2π)
                let delta = phase - state.prevPhase;
                while (delta > Math.PI) delta -= 2 * Math.PI;
                while (delta < -Math.PI) delta += 2 * Math.PI;
                state.accumPhase += delta;
                state.prevPhase = phase;

                let value;
                switch (range) {
                    case '±180°':
                        value = state.accumPhase * (180 / Math.PI);
                        break;
                    case '0-360°': {
                        const deg = state.accumPhase * (180 / Math.PI);
                        value = ((deg % 360) + 360) % 360;
                        break;
                    }
                    case '0-2π':
                        value = ((state.accumPhase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                        break;
                    default: // '±π'
                        value = state.accumPhase;
                        break;
                }

                output[i] = value * sensitivity;
            }

            return output;
        }
    }
};
