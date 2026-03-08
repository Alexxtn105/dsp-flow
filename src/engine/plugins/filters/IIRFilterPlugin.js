/**
 * IIR-фильтр (Баттерворт / Чебышев I)
 *
 * Реализован как каскад biquad-секций (Second-Order Sections).
 * Поддерживает ФНЧ и ФВЧ.
 *
 * ФВЧ проектируется напрямую через трансформацию прототипа s → 1/s
 * (а не через спектральную инверсию коэффициентов).
 */

function designButterworthBiquads(order, fc, sampleRate, isHighpass) {
    const sections = [];
    const numSections = Math.floor(order / 2);
    // Prewarp: цифровая частота → аналоговая
    const warpedFc = Math.tan(Math.PI * Math.min(fc, sampleRate * 0.499) / sampleRate);

    for (let k = 0; k < numSections; k++) {
        const theta = (Math.PI * (2 * k + 1)) / (2 * order);
        const sinT = Math.sin(theta);

        if (isHighpass) {
            // ФВЧ: s → wc/s
            const K = warpedFc;
            const norm = K * K + 2 * sinT * K + 1;
            sections.push({
                b0: 1 / norm,
                b1: -2 / norm,
                b2: 1 / norm,
                a1: 2 * (K * K - 1) / norm,
                a2: (K * K - 2 * sinT * K + 1) / norm
            });
        } else {
            const K = warpedFc;
            const K2 = K * K;
            const norm = 1 + 2 * sinT * K + K2;
            sections.push({
                b0: K2 / norm,
                b1: 2 * K2 / norm,
                b2: K2 / norm,
                a1: 2 * (K2 - 1) / norm,
                a2: (1 - 2 * sinT * K + K2) / norm
            });
        }
    }

    if (order % 2 === 1) {
        const K = warpedFc;
        if (isHighpass) {
            const norm = K + 1;
            sections.push({
                b0: 1 / norm,
                b1: -1 / norm,
                b2: 0,
                a1: (K - 1) / norm,
                a2: 0
            });
        } else {
            const norm = 1 + K;
            sections.push({
                b0: K / norm,
                b1: K / norm,
                b2: 0,
                a1: (K - 1) / norm,
                a2: 0
            });
        }
    }

    return sections;
}

function designChebyshev1Biquads(order, fc, sampleRate, rippleDb, isHighpass) {
    const eps = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
    const sections = [];
    const numSections = Math.floor(order / 2);
    const mu = (1 / order) * Math.asinh(1 / eps);
    const warpedFc = Math.tan(Math.PI * Math.min(fc, sampleRate * 0.499) / sampleRate);

    for (let k = 0; k < numSections; k++) {
        const theta = (Math.PI * (2 * k + 1)) / (2 * order);
        const sigma = -Math.sinh(mu) * Math.sin(theta);
        const omega = Math.cosh(mu) * Math.cos(theta);
        const pMag2 = sigma * sigma + omega * omega;

        const K = warpedFc;
        const K2 = K * K;

        if (isHighpass) {
            const norm = 1 - 2 * sigma * K + pMag2 * K2;
            sections.push({
                b0: 1 / norm,
                b1: -2 / norm,
                b2: 1 / norm,
                a1: 2 * (pMag2 * K2 - 1) / norm,
                a2: (1 + 2 * sigma * K + pMag2 * K2) / norm
            });
        } else {
            const norm = 1 - 2 * sigma * K + pMag2 * K2;
            sections.push({
                b0: (pMag2 * K2) / norm,
                b1: (2 * pMag2 * K2) / norm,
                b2: (pMag2 * K2) / norm,
                a1: (2 * (pMag2 * K2 - 1)) / norm,
                a2: (1 + 2 * sigma * K + pMag2 * K2) / norm
            });
        }
    }

    if (order % 2 === 1) {
        const K = warpedFc;
        const sigma = -Math.sinh(mu);

        if (isHighpass) {
            const norm = 1 - sigma * K;
            sections.push({
                b0: 1 / norm,
                b1: -1 / norm,
                b2: 0,
                a1: (sigma * K - 1 + 2) / norm,
                a2: 0
            });
        } else {
            const norm = 1 - sigma * K;
            sections.push({
                b0: (-sigma * K) / norm,
                b1: (-sigma * K) / norm,
                b2: 0,
                a1: (sigma * K + 1 - 2) / norm,
                a2: 0
            });
        }
    }

    // Нормализация DC/Nyquist gain
    if (sections.length > 0) {
        let gain = 1;
        if (isHighpass) {
            // Nyquist gain (z = -1)
            for (const s of sections) {
                gain *= (s.b0 - s.b1 + s.b2) / (1 - s.a1 + s.a2);
            }
        } else {
            // DC gain (z = 1)
            for (const s of sections) {
                const denom = 1 + s.a1 + s.a2;
                gain *= denom !== 0 ? (s.b0 + s.b1 + s.b2) / denom : 1;
            }
        }
        if (Math.abs(gain) > 1e-10) {
            const correction = 1 / Math.abs(gain);
            sections[0].b0 *= correction;
            sections[0].b1 *= correction;
            sections[0].b2 *= correction;
        }
    }

    return sections;
}

function applyBiquadCascade(input, sections, states, tempBuf) {
    let signal = input;
    for (let s = 0; s < sections.length; s++) {
        const sec = sections[s];
        const st = states[s];
        const output = (s === sections.length - 1) ? tempBuf : new Float32Array(signal.length);

        for (let i = 0; i < signal.length; i++) {
            const x = signal[i];
            const y = sec.b0 * x + sec.b1 * st.x1 + sec.b2 * st.x2
                     - sec.a1 * st.y1 - sec.a2 * st.y2;
            st.x2 = st.x1;
            st.x1 = x;
            st.y2 = st.y1;
            st.y1 = y;
            output[i] = y;
        }
        signal = output;
    }
    return signal;
}

const IIRFilterPlugin = {
    type: 'БИХ-фильтр',
    id: 'iir-filter',
    icon: 'dsp-iir',
    description: 'IIR-фильтр (Баттерворт / Чебышев I)',
    group: 'filters',

    signals: {
        input: 'real',
        output: 'real'
    },

    defaultParams: {
        filterDesign: 'butterworth',
        filterType: 'lowpass',
        cutoffFrequency: 1000,
        order: 4,
        ripple: 1
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const sampleRate = params.sampleRate ?? 48000;
            const fc = params.cutoffFrequency ?? 1000;
            const order = Math.max(1, Math.min(params.order ?? 4, 10));
            const design = params.filterDesign ?? 'butterworth';
            const fType = params.filterType ?? 'lowpass';
            const ripple = params.ripple ?? 1;
            const isHighpass = fType === 'highpass';

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    sections: null,
                    biquadStates: null,
                    tempBuf: new Float32Array(chunkSize),
                    lastKey: ''
                });
            }
            const state = this.states.get(nodeId);

            const key = `${design}_${fType}_${fc}_${order}_${ripple}_${sampleRate}`;
            if (state.lastKey !== key) {
                let sections;
                if (design === 'chebyshev1') {
                    sections = designChebyshev1Biquads(order, fc, sampleRate, ripple, isHighpass);
                } else {
                    sections = designButterworthBiquads(order, fc, sampleRate, isHighpass);
                }

                state.sections = sections;
                state.biquadStates = sections.map(() => ({ x1: 0, x2: 0, y1: 0, y2: 0 }));
                state.tempBuf = new Float32Array(chunkSize);
                state.lastKey = key;
            }

            return applyBiquadCascade(input, state.sections, state.biquadStates, state.tempBuf);
        }
    }
};

export default IIRFilterPlugin;
