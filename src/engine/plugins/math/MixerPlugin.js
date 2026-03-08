/**
 * Микшер / Смеситель (Frequency Shift)
 *
 * Умножает входной сигнал на комплексную экспоненту exp(j·2π·f·t),
 * выполняя перенос спектра на заданную частоту.
 *
 * Вход: real → выход complex (I/Q)
 * Вход: complex → выход complex (I/Q)
 */

const MixerPlugin = {
    type: 'Смеситель',
    id: 'mixer',
    icon: 'dsp-mixer',
    description: 'Перенос спектра (умножение на exp(j·2π·f·t))',
    group: 'math-blocks',

    signals: {
        input: 'real',
        output: 'complex'
    },

    defaultParams: {
        shiftFrequency: 1000
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            const sampleRate = params.sampleRate ?? 48000;
            const fShift = params.shiftFrequency ?? 1000;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { phase: 0 });
            }
            const state = this.states.get(nodeId);

            const output = new Float32Array(chunkSize * 2);
            const phaseInc = (2 * Math.PI * fShift) / sampleRate;

            // Определяем, является ли вход комплексным (длина 2*chunkSize)
            const isComplex = input.length === chunkSize * 2;

            for (let i = 0; i < chunkSize; i++) {
                const cosP = Math.cos(state.phase);
                const sinP = Math.sin(state.phase);

                if (isComplex) {
                    const inI = input[i * 2];
                    const inQ = input[i * 2 + 1];
                    output[i * 2] = inI * cosP - inQ * sinP;
                    output[i * 2 + 1] = inI * sinP + inQ * cosP;
                } else {
                    output[i * 2] = input[i] * cosP;
                    output[i * 2 + 1] = input[i] * sinP;
                }

                state.phase += phaseInc;
                if (state.phase >= 2 * Math.PI) {
                    state.phase -= 2 * Math.PI;
                }
                if (state.phase < 0) {
                    state.phase += 2 * Math.PI;
                }
            }

            return output;
        }
    }
};

export default MixerPlugin;
