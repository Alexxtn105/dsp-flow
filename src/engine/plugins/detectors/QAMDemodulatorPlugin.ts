/**
 * QAM Demodulator — Демодулятор QAM (16/64/256)
 *
 * Назначение:
 *   Демодулирует QAM-сигнал, определяя переданный символ по принятым I/Q-отсчётам.
 *   Поддерживает hard decision (ближайшая точка созвездия по Евклидову расстоянию)
 *   и soft decision (LLR — log-likelihood ratio для каждого бита).
 *
 * Алгоритм:
 *   Hard decision:
 *     Для каждого отсчёта находится ближайшая точка созвездия.
 *     Выход — индекс символа (нормализованный в [0, 1]).
 *
 *   Soft decision:
 *     Для каждого бита вычисляется приближённый LLR:
 *     LLR(bk) ≈ min_{s: bk=0} |r-s|² - min_{s: bk=1} |r-s|²
 *     Выход — средний LLR по битам символа.
 *
 * Параметры:
 *   - qamOrder (string) — порядок: '16QAM', '64QAM', '256QAM'
 *   - decisionType (string) — 'hard' или 'soft'
 *   - symbolRate (float) — символьная скорость
 *
 * Вход:  complex
 * Выход: real
 */

import type { PluginDefinition } from '../../types';

interface QAMDemodulatorState {
    constellation: Float32Array | null;
    bitsPerSymbol: number;
    cachedOrder: string;
    sampleCounter: number;
    currentOutput: number;
}

function binaryToGray(n: number): number {
    return n ^ (n >>> 1);
}

function buildConstellation(order: number): Float32Array {
    const sqrtM = Math.sqrt(order);
    const points = new Float32Array(order * 2);
    const avgPower = 2 * (order - 1) / 3;
    const normFactor = 1 / Math.sqrt(avgPower);

    for (let sym = 0; sym < order; sym++) {
        const gray = binaryToGray(sym);
        const iIdx = gray % sqrtM;
        const qIdx = Math.floor(gray / sqrtM);
        points[sym * 2] = (2 * iIdx - (sqrtM - 1)) * normFactor;
        points[sym * 2 + 1] = (2 * qIdx - (sqrtM - 1)) * normFactor;
    }
    return points;
}

function getOrderNum(qamOrder: string): number {
    if (qamOrder === '64QAM') return 64;
    if (qamOrder === '256QAM') return 256;
    return 16;
}

const QAMDemodulatorPlugin = {
    type: 'QAM демодулятор',
    id: 'qam-demodulator',
    icon: 'dsp-qam-demod',
    description: 'Демодулятор QAM (hard/soft decision)',
    group: 'detectors',

    signals: {
        input: 'complex',
        output: 'real'
    } as const,

    defaultParams: {
        qamOrder: '16QAM',
        decisionType: 'hard',
        symbolRate: 1000,
    },

    processor: {
        states: new Map<string, QAMDemodulatorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const input = inputs[0];
            if (!input) return output;

            const qamOrder = (params.qamOrder ?? '16QAM') as string;
            const decisionType = (params.decisionType ?? 'hard') as string;
            const sampleRate = (params.sampleRate ?? 48000) as number;
            const symbolRate = (params.symbolRate ?? 1000) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    constellation: null,
                    bitsPerSymbol: 0,
                    cachedOrder: '',
                    sampleCounter: 0,
                    currentOutput: 0
                });
            }
            const state = this.states.get(nodeId)!;

            if (state.cachedOrder !== qamOrder) {
                const orderNum = getOrderNum(qamOrder);
                state.constellation = buildConstellation(orderNum);
                state.bitsPerSymbol = Math.round(Math.log2(orderNum));
                state.cachedOrder = qamOrder;
            }

            const constellation = state.constellation!;
            const orderNum = constellation.length / 2;
            const bitsPerSymbol = state.bitsPerSymbol;
            const samplesPerSymbol = sampleRate / symbolRate;

            for (let i = 0; i < chunkSize; i++) {
                if (state.sampleCounter <= 0) {
                    const ri = input[i * 2];
                    const rq = input[i * 2 + 1];

                    if (decisionType === 'soft') {
                        // Soft decision: average LLR
                        let totalLLR = 0;
                        for (let bit = 0; bit < bitsPerSymbol; bit++) {
                            let minDist0 = Infinity;
                            let minDist1 = Infinity;
                            const mask = 1 << bit;
                            for (let s = 0; s < orderNum; s++) {
                                const di = ri - constellation[s * 2];
                                const dq = rq - constellation[s * 2 + 1];
                                const dist = di * di + dq * dq;
                                if (s & mask) {
                                    if (dist < minDist1) minDist1 = dist;
                                } else {
                                    if (dist < minDist0) minDist0 = dist;
                                }
                            }
                            totalLLR += minDist0 - minDist1;
                        }
                        state.currentOutput = totalLLR / bitsPerSymbol;
                    } else {
                        // Hard decision: nearest constellation point
                        let minDist = Infinity;
                        let bestIdx = 0;
                        for (let s = 0; s < orderNum; s++) {
                            const di = ri - constellation[s * 2];
                            const dq = rq - constellation[s * 2 + 1];
                            const dist = di * di + dq * dq;
                            if (dist < minDist) {
                                minDist = dist;
                                bestIdx = s;
                            }
                        }
                        // Normalize to [0, 1]
                        state.currentOutput = bestIdx / (orderNum - 1);
                    }
                    state.sampleCounter = samplesPerSymbol;
                }

                output[i] = state.currentOutput;
                state.sampleCounter--;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default QAMDemodulatorPlugin;
