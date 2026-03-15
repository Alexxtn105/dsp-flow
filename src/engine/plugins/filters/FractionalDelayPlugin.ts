/**
 * Fractional Delay — Дробная задержка
 *
 * Назначение:
 *   Задерживает сигнал на произвольное (дробное) количество отсчётов
 *   с использованием интерполяции Лагранжа 3-го порядка.
 *   Используется в beam-forming, хорус-эффектах, точной временной
 *   коррекции и фракционном ресемплинге.
 *
 * Алгоритм:
 *   1. Кольцевой буфер хранит историю.
 *   2. Целая часть задержки определяет позицию чтения.
 *   3. Дробная часть d интерполируется полиномом Лагранжа:
 *      y = Σ L_k · x[n-int-k], k=0..3
 *      где L_k — коэффициенты Лагранжа для d.
 *
 * Параметры:
 *   - delay (float, 0.0–100.0) — задержка в отсчётах (дробная)
 *
 * Вход:  real
 * Выход: real
 */

import type { PluginDefinition } from '../../types';

interface FractionalDelayState {
    buffer: Float32Array;
    writePos: number;
}

const MAX_DELAY = 100;
const BUFFER_SIZE = MAX_DELAY + 4; // extra for interpolation

const FractionalDelayPlugin = {
    type: 'Дробная задержка',
    id: 'fractional-delay',
    icon: 'dsp-frac-delay',
    description: 'Дробная задержка (интерполяция Лагранжа 3-го порядка)',
    group: 'filters',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        delay: 10.5
    },

    processor: {
        states: new Map<string, FractionalDelayState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const totalDelay = Math.max(0, Math.min(MAX_DELAY, (params.delay ?? 10.5) as number));
            const intDelay = Math.floor(totalDelay);
            const d = totalDelay - intDelay; // fractional part [0, 1)

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    buffer: new Float32Array(BUFFER_SIZE),
                    writePos: 0
                });
            }
            const state = this.states.get(nodeId)!;

            const buf = state.buffer;
            const output = new Float32Array(chunkSize);

            // Lagrange 3rd order coefficients for fractional delay d
            // Points: x[-1], x[0], x[1], x[2] relative to integer read position
            const L0 = -d * (d - 1) * (d - 2) / 6;
            const L1 = (d + 1) * (d - 1) * (d - 2) / 2;
            const L2 = -(d + 1) * d * (d - 2) / 2;
            const L3 = (d + 1) * d * (d - 1) / 6;

            for (let i = 0; i < chunkSize; i++) {
                // Write input to buffer
                buf[state.writePos] = i < input.length ? input[i] : 0;

                // Read position (integer part)
                const readBase = state.writePos - intDelay - 1;

                // 4 samples for interpolation
                const s0 = buf[(readBase + BUFFER_SIZE) % BUFFER_SIZE];
                const s1 = buf[(readBase + 1 + BUFFER_SIZE) % BUFFER_SIZE];
                const s2 = buf[(readBase + 2 + BUFFER_SIZE) % BUFFER_SIZE];
                const s3 = buf[(readBase + 3 + BUFFER_SIZE) % BUFFER_SIZE];

                output[i] = L0 * s0 + L1 * s1 + L2 * s2 + L3 * s3;

                state.writePos = (state.writePos + 1) % BUFFER_SIZE;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default FractionalDelayPlugin;
