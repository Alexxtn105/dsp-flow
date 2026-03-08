import { unwrapPhaseDelta } from '../_shared/SignalUtils.js';

export default {
    type: 'Частотный детектор',
    id: 'frequency-detector',
    icon: 'dsp-freq-detect',
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
            const centerFreq = params.centerFrequency ?? 1000;
            const bandwidth = params.bandwidth ?? 100;
            const sensitivity = params.sensitivity ?? 1.0;
            const halfBw = bandwidth / 2;

            // Interleaved I/Q: input.length = chunkSize * 2, выход = chunkSize
            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                const I = input[i * 2];
                const Q = input[i * 2 + 1];

                // M5: Обработка нулевой магнитуды — фаза неопределена
                const mag = Math.hypot(I, Q);
                if (mag < 1e-10) {
                    output[i] = 0;
                    continue;
                }

                const phase = Math.atan2(Q, I);

                // Разность фаз с unwrapping
                const dPhase = unwrapPhaseDelta(phase - state.prevPhase);
                state.prevPhase = phase;

                // Мгновенная частота = dPhase * sampleRate / (2 * pi)
                const instFreq = dPhase * sampleRate / (2 * Math.PI);

                // Отклонение от центральной частоты
                const deviation = instFreq - centerFreq;

                // Обнуление если вне полосы пропускания
                if (Math.abs(deviation) > halfBw) {
                    output[i] = 0;
                } else {
                    output[i] = deviation * sensitivity;
                }
            }

            return output;
        }
    }
};
