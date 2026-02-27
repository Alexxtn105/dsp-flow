import WindowFunctions from '../_shared/WindowFunctions.js';
import { sinc } from '../_shared/FilterDesign.js';

/**
 * Создаёт процессор режекторного (band-reject) КИХ-фильтра.
 * Метод: проектирование полосового фильтра + спектральная инверсия.
 */
function createNotchProcessor() {
    return {
        states: new Map(),
        clearStates() { this.states.clear(); },

        init(nodeId, params, sampleRate) {
            const order = params.order || 64;
            const notchFreq = params.notchFrequency || 1000;
            const bandwidth = params.bandwidth || 200;
            const windowName = params.windowFunction || 'hamming';

            const lowCutoff = Math.max(1, notchFreq - bandwidth / 2);
            const highCutoff = Math.min(sampleRate / 2 - 1, notchFreq + bandwidth / 2);

            // Проектируем полосовой фильтр
            const M = order - 1;
            const fHigh = highCutoff / sampleRate;
            const fLow = lowCutoff / sampleRate;
            const bpCoeffs = new Float32Array(order);
            const window = WindowFunctions[windowName] || WindowFunctions.rectangular;

            for (let i = 0; i < order; i++) {
                if (i === M / 2) {
                    bpCoeffs[i] = 2 * (fHigh - fLow);
                } else {
                    bpCoeffs[i] = 2 * fHigh * sinc(2 * fHigh * (i - M / 2)) - 2 * fLow * sinc(2 * fLow * (i - M / 2));
                }
                bpCoeffs[i] *= window(i, order);
            }

            // Нормализация полосового фильтра по пиковому значению
            let maxVal = 0;
            for (let i = 0; i < order; i++) {
                maxVal = Math.max(maxVal, Math.abs(bpCoeffs[i]));
            }

            // Спектральная инверсия: notch = delta - bandpass
            const coeffs = new Float32Array(order);
            for (let i = 0; i < order; i++) {
                coeffs[i] = -bpCoeffs[i];
            }
            coeffs[Math.floor(M / 2)] += 1;

            const buffer = new Float32Array(order);

            this.states.set(nodeId, {
                coeffs,
                buffer,
                pointer: 0,
                order,
                _notchFreq: notchFreq,
                _bandwidth: bandwidth,
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
                const currentNotchFreq = params.notchFrequency || 1000;
                const currentBandwidth = params.bandwidth || 200;
                const currentOrder = params.order || 64;
                if (state._notchFreq !== currentNotchFreq || state._bandwidth !== currentBandwidth || state._order !== currentOrder) {
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
    type: 'Режекторный КИХ-фильтр',
    id: 'notch-fir-filter',
    icon: 'block',
    description: 'Режекторный (notch) КИХ-фильтр',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        notchFrequency: 1000,
        bandwidth: 200,
        order: 64,
        windowFunction: 'hamming'
    },
    processor: createNotchProcessor()
};
