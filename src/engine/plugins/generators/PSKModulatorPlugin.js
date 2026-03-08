/**
 * BPSK/QPSK/8PSK модулятор
 *
 * Генерирует PSK-модулированный сигнал с заданной схемой созвездия.
 * Использует PRBS (Pseudo-Random Binary Sequence) для данных.
 * Выход — комплексный сигнал (I/Q).
 */

const PSKModulatorPlugin = {
    type: 'PSK модулятор',
    id: 'psk-modulator',
    icon: 'dsp-psk',
    description: 'Модулятор BPSK/QPSK/8PSK',
    group: 'generators',

    signals: {
        input: null,
        output: 'complex'
    },

    defaultParams: {
        constellation: 'QPSK',
        symbolRate: 1000,
        amplitude: 1.0
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize, nodeId) {
            const sampleRate = params.sampleRate ?? 48000;
            const symbolRate = params.symbolRate ?? 1000;
            const constellation = params.constellation ?? 'QPSK';
            const amplitude = params.amplitude ?? 1.0;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    sampleCounter: 0,
                    currentI: 0,
                    currentQ: 0,
                    lfsr: 0x1234ABCD
                });
            }
            const state = this.states.get(nodeId);

            const samplesPerSymbol = sampleRate / symbolRate;
            const output = new Float32Array(chunkSize * 2);

            // LFSR для PRBS
            function nextBit() {
                const bit = state.lfsr & 1;
                state.lfsr = (state.lfsr >>> 1) ^ (bit ? 0x80000057 : 0);
                return bit;
            }

            function getSymbol() {
                if (constellation === 'BPSK') {
                    const bit = nextBit();
                    return { i: bit ? amplitude : -amplitude, q: 0 };
                } else if (constellation === 'QPSK') {
                    const b0 = nextBit();
                    const b1 = nextBit();
                    const angle = (Math.PI / 4) + (b0 * 2 + b1) * (Math.PI / 2);
                    return {
                        i: amplitude * Math.cos(angle),
                        q: amplitude * Math.sin(angle)
                    };
                } else {
                    // 8PSK
                    const b0 = nextBit();
                    const b1 = nextBit();
                    const b2 = nextBit();
                    const idx = (b0 << 2) | (b1 << 1) | b2;
                    const angle = idx * (Math.PI / 4);
                    return {
                        i: amplitude * Math.cos(angle),
                        q: amplitude * Math.sin(angle)
                    };
                }
            }

            for (let i = 0; i < chunkSize; i++) {
                if (state.sampleCounter <= 0) {
                    const sym = getSymbol();
                    state.currentI = sym.i;
                    state.currentQ = sym.q;
                    state.sampleCounter = samplesPerSymbol;
                }

                output[i * 2] = state.currentI;
                output[i * 2 + 1] = state.currentQ;
                state.sampleCounter--;
            }

            return output;
        }
    }
};

export default PSKModulatorPlugin;
