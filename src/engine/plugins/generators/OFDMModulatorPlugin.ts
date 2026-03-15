/**
 * OFDM Modulator — Модулятор с ортогональным частотным разделением
 *
 * Назначение:
 *   Генерирует OFDM-сигнал: PRBS → QAM-маппинг поднесущих → IFFT → циклический префикс.
 *   OFDM — основа Wi-Fi, LTE, DVB-T и других широкополосных систем.
 *
 * Алгоритм:
 *   1. LFSR PRBS генерирует биты для данных.
 *   2. Биты группируются и маппятся на QAM-символы (buildConstellation с Gray-кодированием).
 *   3. QAM-символы размещаются на N поднесущих в частотной области.
 *   4. IFFT преобразует в временную область.
 *   5. Циклический префикс (CP) копируется с конца символа в начало.
 *
 * Параметры:
 *   - numSubcarriers (int, 64/128/256) — количество поднесущих (= размер IFFT)
 *   - cpLength (int, по умолчанию 16) — длина циклического префикса
 *   - qamOrder (string, '4QAM'/'16QAM'/'64QAM') — порядок QAM на поднесущих
 *
 * Вход:  нет (данные из PRBS)
 * Выход: complex (interleaved [I0, Q0, I1, Q1, ...])
 */

import type { PluginDefinition } from '../../types';
import { ifft } from '../_shared/FFTUtils';

interface OFDMModulatorState {
    lfsr: number;
    outputBuffer: Float32Array;
    bufferPos: number;
    constellation: Float32Array | null;
    bitsPerSymbol: number;
    cachedOrder: string;
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
        const iIdx = binaryToGray(sym % sqrtM);
        const qIdx = binaryToGray(Math.floor(sym / sqrtM));
        points[sym * 2] = (2 * iIdx - (sqrtM - 1)) * normFactor;
        points[sym * 2 + 1] = (2 * qIdx - (sqrtM - 1)) * normFactor;
    }
    return points;
}

function getOrderNum(qamOrder: string): number {
    if (qamOrder === '16QAM') return 16;
    if (qamOrder === '64QAM') return 64;
    return 4; // 4QAM = QPSK
}

const OFDMModulatorPlugin = {
    type: 'OFDM модулятор',
    id: 'ofdm-modulator',
    icon: 'dsp-ofdm-mod',
    description: 'Модулятор OFDM (QAM → IFFT → cyclic prefix)',
    group: 'generators',

    signals: {
        input: null,
        output: 'complex'
    } as const,

    defaultParams: {
        numSubcarriers: 64,
        cpLength: 16,
        ofdmQamOrder: '4QAM'
    },

    processor: {
        states: new Map<string, OFDMModulatorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const numSC = (params.numSubcarriers ?? 64) as number;
            const cpLen = Math.max(0, Math.min(numSC / 2, (params.cpLength ?? 16) as number));
            const qamOrder = (params.ofdmQamOrder ?? '4QAM') as string;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    lfsr: 0x1234ABCD,
                    outputBuffer: new Float32Array(0),
                    bufferPos: 0,
                    constellation: null,
                    bitsPerSymbol: 0,
                    cachedOrder: ''
                });
            }
            const state = this.states.get(nodeId)!;

            if (state.cachedOrder !== qamOrder) {
                const orderNum = getOrderNum(qamOrder);
                state.constellation = buildConstellation(orderNum);
                state.bitsPerSymbol = Math.round(Math.log2(orderNum));
                state.cachedOrder = qamOrder;
            }

            const output = new Float32Array(chunkSize * 2);
            const constellation = state.constellation!;
            const bitsPerSymbol = state.bitsPerSymbol;
            const orderNum = constellation.length / 2;
            const symbolLen = numSC + cpLen; // samples per OFDM symbol

            function nextBit(): number {
                const bit = state.lfsr & 1;
                state.lfsr = (state.lfsr >>> 1) ^ (bit ? 0x80000057 : 0);
                return bit;
            }

            function generateOFDMSymbol(): Float32Array {
                // Fill subcarriers with QAM symbols
                const real = new Float32Array(numSC);
                const imag = new Float32Array(numSC);

                // Use subcarriers 1..numSC/2-1 and numSC/2+1..numSC-1 (skip DC and Nyquist)
                for (let k = 1; k < numSC; k++) {
                    if (k === numSC / 2) continue; // skip Nyquist
                    let symIdx = 0;
                    for (let b = 0; b < bitsPerSymbol; b++) {
                        symIdx |= (nextBit() << b);
                    }
                    symIdx = symIdx % orderNum;
                    real[k] = constellation[symIdx * 2];
                    imag[k] = constellation[symIdx * 2 + 1];
                }

                // IFFT
                ifft(real, imag);

                // Add cyclic prefix: last cpLen samples prepended
                const buf = new Float32Array(symbolLen * 2);
                for (let i = 0; i < cpLen; i++) {
                    const srcIdx = numSC - cpLen + i;
                    buf[i * 2] = real[srcIdx];
                    buf[i * 2 + 1] = imag[srcIdx];
                }
                for (let i = 0; i < numSC; i++) {
                    buf[(cpLen + i) * 2] = real[i];
                    buf[(cpLen + i) * 2 + 1] = imag[i];
                }
                return buf;
            }

            let outIdx = 0;
            while (outIdx < chunkSize) {
                // If buffer is exhausted, generate new OFDM symbol
                if (state.bufferPos >= state.outputBuffer.length / 2) {
                    state.outputBuffer = generateOFDMSymbol();
                    state.bufferPos = 0;
                }

                const remaining = state.outputBuffer.length / 2 - state.bufferPos;
                const toCopy = Math.min(remaining, chunkSize - outIdx);
                for (let i = 0; i < toCopy; i++) {
                    output[(outIdx + i) * 2] = state.outputBuffer[(state.bufferPos + i) * 2];
                    output[(outIdx + i) * 2 + 1] = state.outputBuffer[(state.bufferPos + i) * 2 + 1];
                }
                state.bufferPos += toCopy;
                outIdx += toCopy;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default OFDMModulatorPlugin;
