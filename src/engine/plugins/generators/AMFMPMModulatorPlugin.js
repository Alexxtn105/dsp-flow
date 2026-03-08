/**
 * АМ/ЧМ/ФМ модулятор
 *
 * Принимает модулирующий сигнал и генерирует модулированную несущую.
 * - AM: s(t) = (1 + m·x(t)) · cos(2π·fc·t)
 * - FM: s(t) = cos(2π·fc·t + 2π·Δf·∫x(t)dt)
 * - PM: s(t) = cos(2π·fc·t + Δφ·x(t))
 */

const AMFMPMModulatorPlugin = {
    type: 'АМ/ЧМ/ФМ модулятор',
    id: 'amfmpm-modulator',
    icon: 'dsp-modulator',
    description: 'Модулятор (АМ, ЧМ, ФМ)',
    group: 'generators',

    signals: {
        input: 'real',
        output: 'real'
    },

    defaultParams: {
        modulationType: 'AM',
        carrierFrequency: 10000,
        modulationIndex: 0.5
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            const output = new Float32Array(chunkSize);
            const sampleRate = params.sampleRate ?? 48000;
            const fc = params.carrierFrequency ?? 10000;
            const m = params.modulationIndex ?? 0.5;
            const modType = params.modulationType ?? 'AM';

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { carrierPhase: 0, fmIntegral: 0 });
            }
            const state = this.states.get(nodeId);

            const phaseInc = (2 * Math.PI * fc) / sampleRate;

            for (let i = 0; i < chunkSize; i++) {
                const x = input ? input[i] : 0;

                if (modType === 'AM') {
                    output[i] = (1 + m * x) * Math.cos(state.carrierPhase);
                    state.carrierPhase += phaseInc;
                } else if (modType === 'FM') {
                    // m = частотная девиация (Гц)
                    state.fmIntegral += x / sampleRate;
                    const phase = state.carrierPhase + 2 * Math.PI * m * state.fmIntegral;
                    output[i] = Math.cos(phase);
                    state.carrierPhase += phaseInc;
                } else {
                    // PM: m = индекс фазовой модуляции (рад)
                    output[i] = Math.cos(state.carrierPhase + m * x);
                    state.carrierPhase += phaseInc;
                }

                if (state.carrierPhase >= 2 * Math.PI) {
                    state.carrierPhase -= 2 * Math.PI;
                }
            }

            return output;
        }
    }
};

export default AMFMPMModulatorPlugin;
