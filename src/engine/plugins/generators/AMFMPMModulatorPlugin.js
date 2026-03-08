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
                this.states.set(nodeId, { phase: 0 });
            }
            const state = this.states.get(nodeId);

            const phaseInc = (2 * Math.PI * fc) / sampleRate;

            for (let i = 0; i < chunkSize; i++) {
                const x = input ? input[i] : 0;

                if (modType === 'AM') {
                    output[i] = (1 + m * x) * Math.cos(state.phase);
                    state.phase += phaseInc;
                } else if (modType === 'FM') {
                    // m = частотная девиация (Гц), единый фазовый аккумулятор
                    state.phase += phaseInc + (2 * Math.PI * m * x) / sampleRate;
                    output[i] = Math.cos(state.phase);
                } else {
                    // PM: m = индекс фазовой модуляции (рад)
                    output[i] = Math.cos(state.phase + m * x);
                    state.phase += phaseInc;
                }

                // Нормализация фазы в обе стороны
                if (state.phase >= 2 * Math.PI) {
                    state.phase -= 2 * Math.PI;
                } else if (state.phase < 0) {
                    state.phase += 2 * Math.PI;
                }
            }

            return output;
        }
    }
};

export default AMFMPMModulatorPlugin;
