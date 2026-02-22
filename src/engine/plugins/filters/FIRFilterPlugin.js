import WindowFunctions from '../_shared/WindowFunctions.js';
import { sinc, designWindowedSinc, designRemez } from '../_shared/FilterDesign.js';

/**
 * Фабрика FIR-процессора. Каждый вызов создаёт новый экземпляр
 * с собственным Map для состояний (states).
 */
export function createFIRProcessor() {
    return {
        states: new Map(),
        clearStates() { this.states.clear(); },

        init(nodeId, params, sampleRate) {
            const order = params.order || 31;
            const cutoff = params.cutoffFrequency || params.cutoff || params.frequency || 1000;
            const type = params.filterType || 'lowpass';
            const windowName = params.windowFunction || 'hamming';
            const designMethod = params.designMethod || 'window';

            let coeffs;

            if (type === 'bandpass') {
                const lowCutoff = params.lowCutoff || cutoff * 0.8;
                const highCutoff = params.highCutoff || cutoff * 1.2;
                const M = order - 1;
                const fHigh = highCutoff / sampleRate;
                const fLow = lowCutoff / sampleRate;
                coeffs = new Float32Array(order);
                const window = WindowFunctions[windowName] || WindowFunctions.rectangular;

                for (let i = 0; i < order; i++) {
                    if (i === M / 2) {
                        coeffs[i] = 2 * (fHigh - fLow);
                    } else {
                        coeffs[i] = 2 * fHigh * sinc(2 * fHigh * (i - M / 2)) - 2 * fLow * sinc(2 * fLow * (i - M / 2));
                    }
                    coeffs[i] *= window(i, order);
                }
            } else {
                if (designMethod === 'remez') {
                    coeffs = designRemez(type, cutoff, sampleRate, order);
                } else {
                    coeffs = designWindowedSinc(type, cutoff, sampleRate, order, windowName);
                }
            }

            const buffer = new Float32Array(order);

            this.states.set(nodeId, {
                coeffs,
                buffer,
                pointer: 0,
                order
            });
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            let state = this.states.get(nodeId);

            if (!state) {
                const sampleRate = params.sampleRate || 48000;
                this.init(nodeId, params, sampleRate);
                state = this.states.get(nodeId);
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
    type: 'КИХ-Фильтр',
    id: 'fir-filter',
    icon: 'filter_alt',
    description: 'КИХ-фильтр (FIR)',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        filterType: 'lowpass',
        cutoffFrequency: 1000,
        order: 31,
        windowFunction: 'hamming',
        designMethod: 'remez'
    },
    processor: createFIRProcessor()
};
