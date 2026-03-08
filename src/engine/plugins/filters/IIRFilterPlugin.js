/**
 * IIR-фильтр (Баттерворт / Чебышев I / Чебышев II)
 *
 * Реализован как каскад biquad-секций (Second-Order Sections).
 * Поддерживает ФНЧ и ФВЧ.
 */

function designButterworthLowpass(order, wc) {
    const sections = [];
    const numSections = Math.floor(order / 2);

    for (let k = 0; k < numSections; k++) {
        const theta = (Math.PI * (2 * k + 1)) / (2 * order);
        const sinT = Math.sin(theta);
        const Kw = Math.tan(wc / 2);
        const Kw2 = Kw * Kw;

        const norm = 1 + 2 * sinT * Kw + Kw2;
        sections.push({
            b0: Kw2 / norm,
            b1: 2 * Kw2 / norm,
            b2: Kw2 / norm,
            a1: 2 * (Kw2 - 1) / norm,
            a2: (1 - 2 * sinT * Kw + Kw2) / norm
        });
    }

    if (order % 2 === 1) {
        const Kw = Math.tan(wc / 2);
        const norm = 1 + Kw;
        sections.push({
            b0: Kw / norm,
            b1: Kw / norm,
            b2: 0,
            a1: (Kw - 1) / norm,
            a2: 0
        });
    }

    return sections;
}

function designChebyshev1Lowpass(order, wc, rippleDb) {
    const eps = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
    const sections = [];
    const numSections = Math.floor(order / 2);
    const mu = (1 / order) * Math.asinh(1 / eps);

    for (let k = 0; k < numSections; k++) {
        const theta = (Math.PI * (2 * k + 1)) / (2 * order);
        const sigma = -Math.sinh(mu) * Math.sin(theta);
        const omega = Math.cosh(mu) * Math.cos(theta);

        const Kw = Math.tan(wc / 2);
        const Kw2 = Kw * Kw;
        const pReal = sigma;
        const pImag = omega;
        const pMag2 = pReal * pReal + pImag * pImag;

        const norm = 1 - 2 * pReal * Kw + pMag2 * Kw2;
        sections.push({
            b0: (pMag2 * Kw2) / norm,
            b1: (2 * pMag2 * Kw2) / norm,
            b2: (pMag2 * Kw2) / norm,
            a1: (2 * (pMag2 * Kw2 - 1)) / norm,
            a2: (1 + 2 * pReal * Kw + pMag2 * Kw2) / norm
        });
    }

    if (order % 2 === 1) {
        const Kw = Math.tan(wc / 2);
        const sigma = -Math.sinh(mu);
        const norm = 1 - sigma * Kw;
        sections.push({
            b0: (-sigma * Kw) / norm,
            b1: (-sigma * Kw) / norm,
            b2: 0,
            a1: (sigma * Kw + 1 - 2) / norm,
            a2: 0
        });
    }

    // Нормализация усиления
    if (sections.length > 0) {
        let dcGain = 1;
        for (const s of sections) {
            dcGain *= (s.b0 + s.b1 + s.b2) / (1 + s.a1 + s.a2);
        }
        if (Math.abs(dcGain) > 1e-10) {
            const correction = 1 / Math.abs(dcGain);
            sections[0].b0 *= correction;
            sections[0].b1 *= correction;
            sections[0].b2 *= correction;
        }
    }

    return sections;
}

function lowpassToHighpass(sections) {
    return sections.map(s => ({
        b0: s.b0,
        b1: -s.b1,
        b2: s.b2,
        a1: -s.a1,
        a2: s.a2
    }));
}

function applyBiquadCascade(input, sections, states) {
    let signal = input;
    for (let s = 0; s < sections.length; s++) {
        const sec = sections[s];
        const st = states[s];
        const output = new Float32Array(signal.length);

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
    description: 'IIR-фильтр (Баттерворт / Чебышев)',
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

            const wc = (2 * Math.PI * fc) / sampleRate;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { sections: null, biquadStates: null, lastKey: '' });
            }
            const state = this.states.get(nodeId);

            const key = `${design}_${fType}_${fc}_${order}_${ripple}_${sampleRate}`;
            if (state.lastKey !== key) {
                let sections;
                if (design === 'chebyshev1') {
                    sections = designChebyshev1Lowpass(order, wc, ripple);
                } else {
                    sections = designButterworthLowpass(order, wc);
                }

                if (fType === 'highpass') {
                    sections = lowpassToHighpass(sections);
                }

                state.sections = sections;
                state.biquadStates = sections.map(() => ({ x1: 0, x2: 0, y1: 0, y2: 0 }));
                state.lastKey = key;
            }

            return applyBiquadCascade(input, state.sections, state.biquadStates);
        }
    }
};

export default IIRFilterPlugin;
