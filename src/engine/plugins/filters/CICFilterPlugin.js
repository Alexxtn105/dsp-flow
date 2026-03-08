/**
 * CIC-фильтр (Cascaded Integrator-Comb)
 *
 * Эффективная реализация децимации/интерполяции
 * без использования умножителей.
 * Структура: каскад интеграторов → изменение частоты → каскад гребёнок.
 *
 * Интеграторы используют модульную арифметику (wrapping)
 * через Int32Array для корректной работы при длительном сигнале.
 */

const CIC_INT_SCALE = 32768; // масштаб float → int

const CICFilterPlugin = {
    type: 'CIC-фильтр',
    id: 'cic-filter',
    icon: 'dsp-cic',
    description: 'Каскадный интегратор-гребёнка (CIC)',
    group: 'filters',

    signals: {
        input: 'real',
        output: 'real'
    },

    defaultParams: {
        stages: 3,
        decimationFactor: 4,
        mode: 'decimate'
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const stages = Math.max(1, Math.min(params.stages ?? 3, 6));
            const R = Math.max(2, Math.min(params.decimationFactor ?? 4, 64));
            const mode = params.mode ?? 'decimate';

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    integrators: new Int32Array(stages),
                    combPrev: new Int32Array(stages),
                    sampleCounter: 0,
                    lastKey: ''
                });
            }
            const state = this.states.get(nodeId);

            const key = `${stages}_${R}_${mode}`;
            if (state.lastKey !== key) {
                state.integrators = new Int32Array(stages);
                state.combPrev = new Int32Array(stages);
                state.sampleCounter = 0;
                state.lastKey = key;
            }

            const output = new Float32Array(chunkSize);
            const gain = Math.pow(R, stages) * CIC_INT_SCALE;

            if (mode === 'decimate') {
                let outIdx = 0;

                for (let i = 0; i < chunkSize; i++) {
                    // Масштабируем вход в целочисленный диапазон
                    let val = (input[i] * CIC_INT_SCALE) | 0;

                    // Каскад интеграторов (wrapping arithmetic через Int32)
                    for (let s = 0; s < stages; s++) {
                        state.integrators[s] = (state.integrators[s] + val) | 0;
                        val = state.integrators[s];
                    }

                    state.sampleCounter++;
                    if (state.sampleCounter >= R) {
                        state.sampleCounter = 0;

                        // Каскад гребёнок (comb): y = x - x_prev, задержка M=1
                        let combVal = val;
                        for (let s = 0; s < stages; s++) {
                            const prev = state.combPrev[s];
                            state.combPrev[s] = combVal;
                            combVal = (combVal - prev) | 0;
                        }

                        if (outIdx < chunkSize) {
                            output[outIdx] = combVal / gain;
                            outIdx++;
                        }
                    }
                }
            } else {
                // Интерполяция
                let outIdx = 0;

                for (let i = 0; i < chunkSize; i++) {
                    let val = (input[i] * CIC_INT_SCALE) | 0;

                    // Каскад гребёнок (comb): y = x - x_prev, задержка M=1
                    let combVal = val;
                    for (let s = 0; s < stages; s++) {
                        const prev = state.combPrev[s];
                        state.combPrev[s] = combVal;
                        combVal = (combVal - prev) | 0;
                    }

                    // Вставка R сэмплов (zero-stuffing + интегрирование)
                    for (let r = 0; r < R && outIdx < chunkSize; r++) {
                        let intVal = (r === 0) ? combVal : 0;

                        for (let s = 0; s < stages; s++) {
                            state.integrators[s] = (state.integrators[s] + intVal) | 0;
                            intVal = state.integrators[s];
                        }

                        output[outIdx] = intVal / gain;
                        outIdx++;
                    }
                }
            }

            return output;
        }
    }
};

export default CICFilterPlugin;
