/**
 * Порог / Компаратор
 *
 * Бинаризация сигнала: если вход > порога → outputHigh, иначе → outputLow.
 * Опциональный гистерезис для устойчивости переключения.
 */

const ThresholdPlugin = {
    type: 'Компаратор',
    id: 'threshold',
    icon: 'dsp-threshold',
    description: 'Пороговый компаратор с гистерезисом',
    group: 'math-blocks',

    signals: {
        input: 'real',
        output: 'real'
    },

    defaultParams: {
        threshold: 0,
        outputHigh: 1,
        outputLow: 0,
        hysteresis: 0
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const threshold = params.threshold ?? 0;
            const high = params.outputHigh ?? 1;
            const low = params.outputLow ?? 0;
            const hyst = params.hysteresis ?? 0;
            const output = new Float32Array(chunkSize);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentState: false });
            }
            const state = this.states.get(nodeId);

            const upperThreshold = threshold + hyst / 2;
            const lowerThreshold = threshold - hyst / 2;

            for (let i = 0; i < chunkSize; i++) {
                if (state.currentState) {
                    if (input[i] < lowerThreshold) {
                        state.currentState = false;
                    }
                } else {
                    if (input[i] > upperThreshold) {
                        state.currentState = true;
                    }
                }
                output[i] = state.currentState ? high : low;
            }

            return output;
        }
    }
};

export default ThresholdPlugin;
