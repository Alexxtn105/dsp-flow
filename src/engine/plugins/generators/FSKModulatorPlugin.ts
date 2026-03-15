/**
 * FSK Modulator — Частотная манипуляция (BFSK/MFSK)
 *
 * Назначение:
 *   Генерирует FSK-модулированный сигнал. Информация кодируется
 *   переключением частоты между дискретными значениями.
 *   BFSK использует 2 частоты, 4FSK — 4.
 *
 * Алгоритм:
 *   1. LFSR PRBS генерирует биты.
 *   2. Каждые log₂(M) бит определяют один из M символов.
 *   3. Символ задаёт мгновенную частоту: f = fc + (2k - M + 1) · deviation.
 *   4. Фазовый аккумулятор обеспечивает непрерывность фазы (CPFSK).
 *
 * Параметры:
 *   - symbolRate (float, по умолчанию 1000) — символьная скорость (бод)
 *   - deviation (float, по умолчанию 500) — частотная девиация (Гц)
 *   - fskOrder (string, '2FSK'/'4FSK') — порядок FSK
 *   - amplitude (float, по умолчанию 1.0)
 *
 * Вход:  нет
 * Выход: complex
 */

import type { PluginDefinition } from '../../types';

interface FSKModulatorState {
    sampleCounter: number;
    currentFreq: number;
    phase: number;
    lfsr: number;
}

const FSKModulatorPlugin = {
    type: 'FSK модулятор',
    id: 'fsk-modulator',
    icon: 'dsp-fsk-mod',
    description: 'Модулятор BFSK/4FSK с непрерывной фазой',
    group: 'generators',

    signals: {
        input: null,
        output: 'complex'
    } as const,

    defaultParams: {
        symbolRate: 1000,
        deviation: 500,
        fskOrder: '2FSK',
        amplitude: 1.0
    },

    processor: {
        states: new Map<string, FSKModulatorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const sampleRate = (params.sampleRate ?? 48000) as number;
            const symbolRate = (params.symbolRate ?? 1000) as number;
            const deviation = (params.deviation ?? 500) as number;
            const fskOrder = (params.fskOrder ?? '2FSK') as string;
            const amplitude = (params.amplitude ?? 1.0) as number;

            const M = fskOrder === '4FSK' ? 4 : 2;
            const bitsPerSymbol = Math.round(Math.log2(M));

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    sampleCounter: 0,
                    currentFreq: 0,
                    phase: 0,
                    lfsr: 0x1234ABCD
                });
            }
            const state = this.states.get(nodeId)!;

            const samplesPerSymbol = sampleRate / symbolRate;
            const output = new Float32Array(chunkSize * 2);

            function nextBit(): number {
                const bit = state.lfsr & 1;
                state.lfsr = (state.lfsr >>> 1) ^ (bit ? 0x80000057 : 0);
                return bit;
            }

            for (let i = 0; i < chunkSize; i++) {
                if (state.sampleCounter <= 0) {
                    // Generate new symbol
                    let symIdx = 0;
                    for (let b = 0; b < bitsPerSymbol; b++) {
                        symIdx |= (nextBit() << b);
                    }
                    // Frequency offset: (2k - M + 1) * deviation
                    state.currentFreq = (2 * symIdx - M + 1) * deviation;
                    state.sampleCounter = samplesPerSymbol;
                }

                // Phase accumulator (CPFSK)
                state.phase += 2 * Math.PI * state.currentFreq / sampleRate;
                // Wrap phase
                if (state.phase > Math.PI) state.phase -= 2 * Math.PI;
                if (state.phase < -Math.PI) state.phase += 2 * Math.PI;

                output[i * 2] = amplitude * Math.cos(state.phase);
                output[i * 2 + 1] = amplitude * Math.sin(state.phase);
                state.sampleCounter--;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default FSKModulatorPlugin;
