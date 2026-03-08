/**
 * АМ/ЧМ/ФМ демодулятор
 *
 * - AM: детектор огибающей (|аналитический сигнал| через Гильберт)
 * - FM: мгновенная частота через conj(z[n-1])·z[n]
 * - PM: извлечение фазы (atan2 аналитического сигнала)
 */

// Предвычисленные коэффициенты Гильберт-фильтра (31-point, окно Хэмминга)
const HILBERT_N = 31;
const HILBERT_M = Math.floor(HILBERT_N / 2);
const HILBERT_COEFFS = new Float64Array(HILBERT_N);
for (let n = 0; n < HILBERT_N; n++) {
    if (n === HILBERT_M) {
        HILBERT_COEFFS[n] = 0;
    } else {
        const k = n - HILBERT_M;
        HILBERT_COEFFS[n] = (k % 2 !== 0) ? (2 / (Math.PI * k)) : 0;
        HILBERT_COEFFS[n] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (HILBERT_N - 1));
    }
}

const AMFMPMDemodulatorPlugin = {
    type: 'АМ/ЧМ/ФМ демодулятор',
    id: 'amfmpm-demodulator',
    icon: 'dsp-demodulator',
    description: 'Демодулятор (АМ, ЧМ, ФМ)',
    group: 'detectors',

    signals: {
        input: 'real',
        output: 'real'
    },

    defaultParams: {
        modulationType: 'AM',
        carrierFrequency: 10000
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const output = new Float32Array(chunkSize);
            const modType = params.modulationType ?? 'AM';
            const sampleRate = params.sampleRate ?? 48000;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    prevI: 0,
                    prevQ: 0,
                    buffer: new Float32Array(HILBERT_N),
                    bufIdx: 0,
                    dcBlock: 0,
                    prevDcIn: 0
                });
            }
            const state = this.states.get(nodeId);

            for (let i = 0; i < chunkSize; i++) {
                const x = input[i];

                // Записываем в кольцевой буфер
                state.buffer[state.bufIdx] = x;

                // Выход Гильберт-фильтра (Q-компонента)
                let q = 0;
                for (let k = 0; k < HILBERT_N; k++) {
                    const idx = (state.bufIdx - k + HILBERT_N) % HILBERT_N;
                    q += HILBERT_COEFFS[k] * state.buffer[idx];
                }

                // Задержанный вход (I-компонента)
                const delayedIdx = (state.bufIdx - HILBERT_M + HILBERT_N) % HILBERT_N;
                const iComp = state.buffer[delayedIdx];

                state.bufIdx = (state.bufIdx + 1) % HILBERT_N;

                if (modType === 'AM') {
                    const envelope = Math.sqrt(iComp * iComp + q * q);
                    // DC-блокировка
                    const dcOut = envelope - state.prevDcIn + 0.995 * state.dcBlock;
                    state.prevDcIn = envelope;
                    state.dcBlock = dcOut;
                    output[i] = dcOut;
                } else if (modType === 'FM') {
                    // conj(prev) * current → мгновенная частота
                    const crossI = iComp * state.prevI + q * state.prevQ;
                    const crossQ = q * state.prevI - iComp * state.prevQ;
                    output[i] = Math.atan2(crossQ, crossI) * sampleRate / (2 * Math.PI);
                    state.prevI = iComp;
                    state.prevQ = q;
                } else {
                    // PM: извлечение фазы
                    output[i] = Math.atan2(q, iComp);
                }
            }

            return output;
        }
    }
};

export default AMFMPMDemodulatorPlugin;
