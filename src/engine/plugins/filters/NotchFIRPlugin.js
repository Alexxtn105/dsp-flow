import WindowFunctions from '../_shared/WindowFunctions.js';
import { sinc } from '../_shared/FilterDesign.js';

/**
 * Коэффициенты компенсации переходных полос для каждой оконной функции.
 * Расширяют внутренний bandpass так, чтобы заданная ширина полосы
 * соответствовала области глубокой режекции (≈ -20 дБ).
 * compensation_per_side = factor * sampleRate / order
 */
const TRANSITION_COMPENSATION = {
    rectangular: 0.25,
    hamming: 0.90,
    hanning: 1.00,
    blackman: 1.15,
    'blackman-harris': 1.35,
    nuttall: 1.35,
    flattop: 1.90
};

/**
 * Создаёт процессор режекторного (band-reject) КИХ-фильтра.
 * Метод: проектирование нормализованного полосового фильтра + спектральная инверсия.
 * Порядок принудительно делается нечётным для целочисленной групповой задержки.
 */
function createNotchProcessor() {
    return {
        states: new Map(),
        clearStates() { this.states.clear(); },

        init(nodeId, params, sampleRate) {
            // Нечётный порядок обязателен для линейной фазы Type I
            let order = params.order || 65;
            if (order % 2 === 0) order += 1;

            const notchFreq = params.notchFrequency || 1000;
            const bandwidth = params.bandwidth || 200;
            const windowName = params.windowFunction || 'hamming';

            // Компенсация переходных полос окна: расширяем внутренний bandpass
            const twComp = (TRANSITION_COMPENSATION[windowName] || 0.90) * sampleRate / order;
            const lowCutoff = Math.max(1, notchFreq - bandwidth / 2 - twComp);
            const highCutoff = Math.min(sampleRate / 2 - 1, notchFreq + bandwidth / 2 + twComp);

            const M = order - 1;
            const center = M / 2; // целое число при нечётном order
            const fHigh = highCutoff / sampleRate;
            const fLow = lowCutoff / sampleRate;
            const bpCoeffs = new Float32Array(order);
            const window = WindowFunctions[windowName] || WindowFunctions.rectangular;

            // Проектируем полосовой фильтр (windowed sinc)
            for (let i = 0; i < order; i++) {
                if (i === center) {
                    bpCoeffs[i] = 2 * (fHigh - fLow);
                } else {
                    bpCoeffs[i] = 2 * fHigh * sinc(2 * fHigh * (i - center))
                               - 2 * fLow  * sinc(2 * fLow  * (i - center));
                }
                bpCoeffs[i] *= window(i, order);
            }

            // Нормализация: gain полосового фильтра на центральной частоте = 1.0
            const fc = notchFreq / sampleRate;
            let re = 0, im = 0;
            for (let i = 0; i < order; i++) {
                re += bpCoeffs[i] * Math.cos(2 * Math.PI * fc * i);
                im -= bpCoeffs[i] * Math.sin(2 * Math.PI * fc * i);
            }
            const mag = Math.sqrt(re * re + im * im);
            if (mag > 1e-10) {
                for (let i = 0; i < order; i++) {
                    bpCoeffs[i] /= mag;
                }
            }

            // Спектральная инверсия: notch = δ[n - center] - bandpass[n]
            const coeffs = new Float32Array(order);
            for (let i = 0; i < order; i++) {
                coeffs[i] = -bpCoeffs[i];
            }
            coeffs[center] += 1;

            const buffer = new Float32Array(order);

            this.states.set(nodeId, {
                coeffs,
                buffer,
                pointer: 0,
                order,
                _notchFreq: notchFreq,
                _bandwidth: bandwidth,
                _order: params.order || 65
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
                const currentOrder = params.order || 65;
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
    icon: 'dsp-notch',
    description: 'Режекторный (notch) КИХ-фильтр',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        notchFrequency: 1000,
        bandwidth: 200,
        order: 65,
        windowFunction: 'hamming'
    },
    processor: createNotchProcessor()
};
