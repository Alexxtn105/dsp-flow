import { designRemezBandpass } from '../_shared/FilterDesign.js';

/**
 * Создаёт процессор полосового фильтра на основе алгоритма Ремеза
 * (Parks-McClellan equiripple design).
 */
function createRemezProcessor() {
    return {
        states: new Map(),
        clearStates() { this.states.clear(); },

        init(nodeId, params, sampleRate) {
            const order = params.order || 64;
            const lowCutoff = params.lowCutoff || 1000;
            const highCutoff = params.highCutoff || 3000;

            const coeffs = designRemezBandpass(lowCutoff, highCutoff, sampleRate, order);
            const buffer = new Float32Array(order);

            this.states.set(nodeId, {
                coeffs,
                buffer,
                pointer: 0,
                order,
                _lowCutoff: lowCutoff,
                _highCutoff: highCutoff,
                _order: order
            });
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            let state = this.states.get(nodeId);
            const sampleRate = params.sampleRate || 48000;

            if (!state) {
                this.init(nodeId, params, sampleRate);
                state = this.states.get(nodeId);
            } else {
                const currentLowCutoff = params.lowCutoff || 1000;
                const currentHighCutoff = params.highCutoff || 3000;
                const currentOrder = params.order || 64;
                if (state._lowCutoff !== currentLowCutoff || state._highCutoff !== currentHighCutoff || state._order !== currentOrder) {
                    const oldBuffer = state.buffer;
                    const oldPointer = state.pointer;
                    this.init(nodeId, params, sampleRate);
                    state = this.states.get(nodeId);
                    if (oldBuffer.length === state.buffer.length) {
                        state.buffer.set(oldBuffer);
                        state.pointer = oldPointer;
                    }
                }
            }

            const { coeffs, buffer, order } = state;
            const output = new Float32Array(input.length);
            let { pointer } = state;
            const bufferLen = buffer.length;

            for (let i = 0; i < input.length; i++) {
                buffer[pointer] = input[i];

                let acc = 0;
                let p = pointer;

                for (let j = 0; j < order; j++) {
                    acc += coeffs[j] * buffer[p];
                    p--;
                    if (p < 0) p = bufferLen - 1;
                }

                output[i] = acc;

                pointer++;
                if (pointer >= bufferLen) pointer = 0;
            }

            state.pointer = pointer;
            return output;
        }
    };
}

export default {
    type: 'Фильтр Ремеза',
    id: 'remez-filter',
    icon: 'equalizer',
    description: 'Полосовой КИХ-фильтр (алгоритм Паркс-Макклеллана / Ремеза)',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        order: 64,
        lowCutoff: 1000,
        highCutoff: 3000,
    },
    processor: createRemezProcessor()
};
