/**
 * CIC-фильтр (Cascaded Integrator-Comb)
 *
 * Эффективная реализация децимации/интерполяции
 * без использования умножителей.
 * Структура: каскад интеграторов → изменение частоты → каскад гребёнок.
 */

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
                    integrators: new Float64Array(stages),
                    combDelays: Array.from({ length: stages }, () => new Float64Array(R)),
                    combIndices: new Array(stages).fill(0),
                    sampleCounter: 0,
                    lastKey: ''
                });
            }
            const state = this.states.get(nodeId);

            // Сброс при изменении параметров
            const key = `${stages}_${R}_${mode}`;
            if (state.lastKey !== key) {
                state.integrators = new Float64Array(stages);
                state.combDelays = Array.from({ length: stages }, () => new Float64Array(R));
                state.combIndices = new Array(stages).fill(0);
                state.sampleCounter = 0;
                state.lastKey = key;
            }

            const output = new Float32Array(chunkSize);

            if (mode === 'decimate') {
                let outIdx = 0;
                const gain = Math.pow(R, stages);

                for (let i = 0; i < chunkSize; i++) {
                    // Каскад интеграторов
                    let val = input[i];
                    for (let s = 0; s < stages; s++) {
                        state.integrators[s] += val;
                        val = state.integrators[s];
                    }

                    state.sampleCounter++;
                    if (state.sampleCounter >= R) {
                        state.sampleCounter = 0;

                        // Каскад гребёнок (comb) — на пониженной частоте
                        let combVal = val;
                        for (let s = 0; s < stages; s++) {
                            const delayed = state.combDelays[s][state.combIndices[s]];
                            state.combDelays[s][state.combIndices[s]] = combVal;
                            state.combIndices[s] = (state.combIndices[s] + 1) % R;
                            combVal = combVal - delayed;
                        }

                        // Нормализация и запись
                        if (outIdx < chunkSize) {
                            output[outIdx] = combVal / gain;
                            outIdx++;
                        }
                    }
                }

                // Заполнить оставшиеся нулями (уже Float32Array)
            } else {
                // Интерполяция
                const gain = Math.pow(R, stages);
                let outIdx = 0;

                for (let i = 0; i < chunkSize; i++) {
                    // Каскад гребёнок (на входной частоте)
                    let combVal = input[i];
                    for (let s = 0; s < stages; s++) {
                        const delayed = state.combDelays[s][state.combIndices[s]];
                        state.combDelays[s][state.combIndices[s]] = combVal;
                        state.combIndices[s] = (state.combIndices[s] + 1) % R;
                        combVal = combVal - delayed;
                    }

                    // Вставка R сэмплов (zero-stuffing + интегрирование)
                    for (let r = 0; r < R && outIdx < chunkSize; r++) {
                        let val = (r === 0) ? combVal : 0;

                        // Каскад интеграторов (на выходной частоте)
                        for (let s = 0; s < stages; s++) {
                            state.integrators[s] += val;
                            val = state.integrators[s];
                        }

                        output[outIdx] = val / gain;
                        outIdx++;
                    }
                }
            }

            return output;
        }
    }
};

export default CICFilterPlugin;
