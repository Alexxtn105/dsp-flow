/**
 * АМ/ЧМ/ФМ демодулятор
 *
 * - AM: детектор огибающей (|аналитический сигнал| через Гильберт)
 * - FM: производная фазы (мгновенная частота)
 * - PM: извлечение фазы (atan2 аналитического сигнала)
 */

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
                    prevPhase: 0,
                    // Гильберт-фильтр (15 коэфф.)
                    hilbertBuffer: new Float32Array(15),
                    hilbertIdx: 0,
                    delayBuffer: new Float32Array(15),
                    delayIdx: 0,
                    dcBlock: 0,
                    prevDcIn: 0
                });
            }
            const state = this.states.get(nodeId);

            // Коэффициенты Гильберт-фильтра (15-point)
            const N = 15;
            const M = Math.floor(N / 2);
            const hilbertCoeffs = new Float32Array(N);
            for (let n = 0; n < N; n++) {
                if (n === M) {
                    hilbertCoeffs[n] = 0;
                } else {
                    const k = n - M;
                    hilbertCoeffs[n] = (k % 2 !== 0) ? (2 / (Math.PI * k)) : 0;
                    // Окно Хэмминга
                    hilbertCoeffs[n] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
                }
            }

            for (let i = 0; i < chunkSize; i++) {
                const x = input[i];

                // Заполняем буферы Гильберта и задержки
                state.hilbertBuffer[state.hilbertIdx] = x;
                state.delayBuffer[state.delayIdx] = x;

                // Выход Гильберт-фильтра (Q-компонента)
                let q = 0;
                for (let k = 0; k < N; k++) {
                    const idx = (state.hilbertIdx - k + N) % N;
                    q += hilbertCoeffs[k] * state.hilbertBuffer[idx];
                }

                // Задержанный вход (I-компонента)
                const delayedIdx = (state.delayIdx - M + N) % N;
                const iComp = state.delayBuffer[delayedIdx];

                state.hilbertIdx = (state.hilbertIdx + 1) % N;
                state.delayIdx = (state.delayIdx + 1) % N;

                if (modType === 'AM') {
                    // Огибающая = |аналитический сигнал|
                    const envelope = Math.sqrt(iComp * iComp + q * q);
                    // DC-блокировка
                    const dcOut = envelope - state.prevDcIn + 0.995 * state.dcBlock;
                    state.prevDcIn = envelope;
                    state.dcBlock = dcOut;
                    output[i] = dcOut;
                } else if (modType === 'FM') {
                    // Мгновенная частота из производной фазы
                    const dI = iComp - state.prevI;
                    const dQ = q - state.prevQ;
                    const denom = iComp * iComp + q * q;
                    let instFreq = 0;
                    if (denom > 1e-10) {
                        instFreq = (iComp * dQ - q * dI) / denom;
                    }
                    output[i] = instFreq * sampleRate / (2 * Math.PI);
                    state.prevI = iComp;
                    state.prevQ = q;
                } else {
                    // PM: извлечение фазы
                    let phase = Math.atan2(q, iComp);
                    // Unwrap
                    let delta = phase - state.prevPhase;
                    if (delta > Math.PI) delta -= 2 * Math.PI;
                    if (delta < -Math.PI) delta += 2 * Math.PI;
                    state.prevPhase = phase;
                    output[i] = phase;
                }
            }

            return output;
        }
    }
};

export default AMFMPMDemodulatorPlugin;
