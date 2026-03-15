/**
 * QAM Modulator — Квадратурная амплитудная модуляция (16/64/256-QAM)
 *
 * Назначение:
 *   Генерирует QAM-модулированный сигнал с квадратурной амплитудной манипуляцией.
 *   QAM — основной вид модуляции в современных цифровых системах связи (Wi-Fi, LTE, DVB).
 *   Информация кодируется одновременно в амплитуде и фазе несущей.
 *   Блок генерирует псевдослучайные данные через PRBS и формирует I/Q-отсчёты
 *   с Gray-кодированием точек созвездия.
 *
 * Алгоритм:
 *   1. Precompute: для выбранного порядка QAM строится таблица созвездия с Gray-кодированием.
 *      Нормализация средней мощности к 1.0 (E[|s|²] = 1).
 *   2. LFSR PRBS (полином 0x80000057) генерирует биты.
 *   3. Группы из log₂(M) бит формируют индекс символа → точка (I, Q) из таблицы.
 *   4. Каждый символ длится samplesPerSymbol = sampleRate / symbolRate отсчётов.
 *
 * Параметры:
 *   - qamOrder (string, по умолчанию '16QAM') — порядок: '16QAM', '64QAM', '256QAM'
 *   - symbolRate (float, по умолчанию 1000) — символьная скорость (бод)
 *   - amplitude (float, по умолчанию 1.0) — масштаб созвездия
 *
 * Вход:  нет (данные из PRBS)
 * Выход: complex (interleaved [I0, Q0, I1, Q1, ...])
 */

import type { PluginDefinition } from '../../types';

interface QAMModulatorState {
    sampleCounter: number;
    currentI: number;
    currentQ: number;
    lfsr: number;
    constellation: Float32Array | null;
    bitsPerSymbol: number;
    cachedOrder: string;
}

/** Gray code: binary → Gray */
function binaryToGray(n: number): number {
    return n ^ (n >>> 1);
}

/** Построение QAM-созвездия с Gray-кодированием и нормализацией мощности */
function buildConstellation(order: number): Float32Array {
    const sqrtM = Math.sqrt(order);
    const points = new Float32Array(order * 2);

    // Средняя мощность для нормализации: E[|s|²] = 2(M-1)/3 для M-PAM
    const avgPower = 2 * (order - 1) / 3;
    const normFactor = 1 / Math.sqrt(avgPower);

    for (let sym = 0; sym < order; sym++) {
        const iIdx = binaryToGray(sym % sqrtM);
        const qIdx = binaryToGray(Math.floor(sym / sqrtM));
        // PAM levels: -(sqrt(M)-1), -(sqrt(M)-3), ..., +(sqrt(M)-1)
        const iVal = (2 * iIdx - (sqrtM - 1)) * normFactor;
        const qVal = (2 * qIdx - (sqrtM - 1)) * normFactor;
        points[sym * 2] = iVal;
        points[sym * 2 + 1] = qVal;
    }
    return points;
}

function getOrderNum(qamOrder: string): number {
    if (qamOrder === '64QAM') return 64;
    if (qamOrder === '256QAM') return 256;
    return 16;
}

function getBitsPerSymbol(order: number): number {
    return Math.round(Math.log2(order));
}

const QAMModulatorPlugin = {
    type: 'QAM модулятор',
    id: 'qam-modulator',
    icon: 'dsp-qam-mod',
    description: 'Модулятор 16/64/256-QAM с Gray-кодированием',
    group: 'generators',

    signals: {
        input: null,
        output: 'complex'
    } as const,

    defaultParams: {
        qamOrder: '16QAM',
        symbolRate: 1000,
        amplitude: 1.0
    },

    processor: {
        states: new Map<string, QAMModulatorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const sampleRate = (params.sampleRate ?? 48000) as number;
            const symbolRate = (params.symbolRate ?? 1000) as number;
            const qamOrder = (params.qamOrder ?? '16QAM') as string;
            const amplitude = (params.amplitude ?? 1.0) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    sampleCounter: 0,
                    currentI: 0,
                    currentQ: 0,
                    lfsr: 0x1234ABCD,
                    constellation: null,
                    bitsPerSymbol: 0,
                    cachedOrder: ''
                });
            }
            const state = this.states.get(nodeId)!;

            // Rebuild constellation if order changed
            if (state.cachedOrder !== qamOrder) {
                const orderNum = getOrderNum(qamOrder);
                state.constellation = buildConstellation(orderNum);
                state.bitsPerSymbol = getBitsPerSymbol(orderNum);
                state.cachedOrder = qamOrder;
            }

            const samplesPerSymbol = sampleRate / symbolRate;
            const output = new Float32Array(chunkSize * 2);
            const constellation = state.constellation!;
            const bitsPerSymbol = state.bitsPerSymbol;
            const orderNum = constellation.length / 2;

            function nextBit(): number {
                const bit = state.lfsr & 1;
                state.lfsr = (state.lfsr >>> 1) ^ (bit ? 0x80000057 : 0);
                return bit;
            }

            for (let i = 0; i < chunkSize; i++) {
                if (state.sampleCounter <= 0) {
                    // Generate symbol index from bits
                    let symIdx = 0;
                    for (let b = 0; b < bitsPerSymbol; b++) {
                        symIdx |= (nextBit() << b);
                    }
                    symIdx = symIdx % orderNum;
                    state.currentI = constellation[symIdx * 2] * amplitude;
                    state.currentQ = constellation[symIdx * 2 + 1] * amplitude;
                    state.sampleCounter = samplesPerSymbol;
                }

                output[i * 2] = state.currentI;
                output[i * 2 + 1] = state.currentQ;
                state.sampleCounter--;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default QAMModulatorPlugin;
