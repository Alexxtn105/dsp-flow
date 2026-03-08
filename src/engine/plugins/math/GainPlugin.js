/**
 * Усилитель (Gain)
 *
 * Простое масштабирование сигнала с возможностью задания
 * усиления в линейных единицах или дБ.
 */

const GainPlugin = {
    type: 'Усилитель',
    id: 'gain',
    icon: 'dsp-gain',
    description: 'Усилитель / аттенюатор',
    group: 'math-blocks',

    signals: {
        input: 'real',
        output: 'real'
    },

    defaultParams: {
        gain: 1.0,
        gainMode: 'linear',
        invert: false
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const gainValue = params.gain ?? 1.0;
            const mode = params.gainMode ?? 'linear';
            const invert = params.invert ?? false;

            let linearGain;
            if (mode === 'dB') {
                linearGain = Math.pow(10, gainValue / 20);
            } else {
                linearGain = gainValue;
            }

            if (invert) linearGain = -linearGain;

            const output = new Float32Array(chunkSize);
            for (let i = 0; i < chunkSize; i++) {
                output[i] = input[i] * linearGain;
            }

            return output;
        }
    }
};

export default GainPlugin;
