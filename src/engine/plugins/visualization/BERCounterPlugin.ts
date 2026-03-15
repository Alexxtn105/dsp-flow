/**
 * BER Counter — Счётчик битовых ошибок
 *
 * Назначение:
 *   Сравнивает два битовых потока (Tx и Rx) и подсчитывает коэффициент
 *   битовых ошибок (BER). Биты определяются по порогу: >threshold → 1, иначе → 0.
 *   BER = errorBits / totalBits.
 *
 * Параметры:
 *   - threshold (float, по умолчанию 0.5) — порог для определения бита.
 *
 * Вход:  2× real (Tx биты + Rx биты)
 * Выход: null (визуализация — BER)
 */

import type { PluginDefinition } from '../../types';

interface BERState {
    totalBits: number;
    errorBits: number;
}

export default {
    type: 'Счётчик BER',
    id: 'ber-counter',
    icon: 'dsp-ber-counter',
    description: 'Счётчик битовых ошибок (BER)',
    group: 'visualization',
    signals: {
        input: 'real',
        output: null,
        inputsCount: 2,
        inputLabels: ['Tx', 'Rx']
    } as const,
    defaultParams: {
        threshold: 0.5,
    },
    processor: {
        states: new Map<string, BERState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string) {
            const tx = inputs[0];
            const rx = inputs[1];

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { totalBits: 0, errorBits: 0 });
            }
            const state = this.states.get(nodeId)!;
            const threshold = (params.threshold ?? 0.5) as number;

            if (!tx || !rx) {
                return { ber: 0, totalBits: state.totalBits, errorBits: state.errorBits };
            }

            let chunkErrors = 0;
            for (let i = 0; i < chunkSize; i++) {
                const txBit = (i < tx.length ? tx[i] : 0) > threshold ? 1 : 0;
                const rxBit = (i < rx.length ? rx[i] : 0) > threshold ? 1 : 0;
                if (txBit !== rxBit) chunkErrors++;
            }

            state.totalBits += chunkSize;
            state.errorBits += chunkErrors;

            const ber = state.totalBits > 0 ? state.errorBits / state.totalBits : 0;

            return { ber, totalBits: state.totalBits, errorBits: state.errorBits };
        }
    }
} satisfies PluginDefinition;
