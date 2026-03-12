/**
 * PSK модулятор — Фазовая манипуляция (BPSK, QPSK, 8PSK)
 *
 * Назначение:
 *   Генерирует модулированный сигнал с фазовой манипуляцией (Phase Shift Keying).
 *   PSK — основной вид цифровой модуляции, где информация кодируется в фазе несущей.
 *   Каждому символу соответствует определённая точка на фазовой диаграмме (созвездии).
 *   Блок генерирует псевдослучайные данные через PRBS и формирует I/Q-отсчёты.
 *
 * Схемы созвездия:
 *   - BPSK (Binary PSK) — 2 точки (1 бит/символ). Фазы: 0° и 180°.
 *     I = ±A, Q = 0. Самая помехоустойчивая схема, но наименьшая скорость.
 *
 *   - QPSK (Quadrature PSK) — 4 точки (2 бита/символ). Фазы: 45°, 135°, 225°, 315°.
 *     Вдвое выше скорость при том же символьном такте, чуть ниже помехоустойчивость.
 *     angle = π/4 + (b0·2 + b1) · π/2, I = A·cos(angle), Q = A·sin(angle).
 *
 *   - 8PSK — 8 точек (3 бита/символ). Фазы: 0°, 45°, 90°, ..., 315°.
 *     Втрое выше скорость относительно BPSK, но требует лучшего отношения
 *     сигнал/шум для безошибочного приёма.
 *
 * Алгоритм:
 *   1. Вычисляется samplesPerSymbol = sampleRate / symbolRate — количество отсчётов
 *      на один символ. Например, при sampleRate=48000 и symbolRate=1000 получаем 48.
 *   2. Когда счётчик отсчётов достигает samplesPerSymbol, генерируется новый символ:
 *      - LFSR (Linear Feedback Shift Register) с полиномом 0x80000057 генерирует
 *        псевдослучайную битовую последовательность (PRBS). LFSR инициализируется
 *        seed-значением 0x1234ABCD и обеспечивает длинную некоррелированную
 *        последовательность (период 2³² − 1).
 *      - Из 1/2/3 бит (в зависимости от схемы) формируется точка созвездия (I, Q).
 *   3. Между сменами символов I/Q-значения остаются постоянными (прямоугольные
 *      импульсы — без фильтрации формы импульса).
 *
 * Параметры:
 *   - constellation (string, по умолчанию 'QPSK') — схема созвездия: 'BPSK', 'QPSK', '8PSK'.
 *   - symbolRate (float, по умолчанию 1000) — символьная скорость в символах/с (бод).
 *     Определяет, сколько символов передаётся за секунду. Должна быть значительно
 *     меньше sampleRate. Диапазон: 10–sampleRate/4. Типичные значения: 100, 1000, 4800.
 *   - amplitude (float, по умолчанию 1.0) — амплитуда точек созвездия.
 *     Диапазон: 0.0–1.0.
 *
 * Вход:  нет (данные генерируются внутренним PRBS)
 * Выход: complex (interleaved Float32Array длиной chunkSize × 2, [I0, Q0, I1, Q1, ...])
 *
 * Примеры использования:
 *
 *   1. Наблюдение QPSK-созвездия:
 *      PSKModulator(QPSK, symbolRate 1000) → Constellation
 *      На диаграмме видны 4 точки в углах квадрата (±A/√2, ±A/√2).
 *
 *   2. Полная цепочка демодуляции QPSK:
 *      PSKModulator(QPSK, sps=4) → канал с шумом →
 *      → TimingRecovery(sps=4) → PLL → Constellation
 *      Символьная синхронизация и PLL компенсируют сдвиги, на созвездии
 *      видны чёткие 4 точки.
 *
 *   3. Спектр PSK-сигнала:
 *      PSKModulator(BPSK, symbolRate 500) → SpectrumAnalyzer
 *      Спектр имеет форму sinc² с нулями на кратных symbolRate от центра.
 *      Основной лепесток занимает полосу 2 · symbolRate = 1000 Гц.
 *
 *   4. Сравнение схем модуляции:
 *      PSKModulator(BPSK) → Constellation  (2 точки на оси I)
 *      PSKModulator(QPSK) → Constellation  (4 точки по углам)
 *      PSKModulator(8PSK) → Constellation  (8 точек по кругу)
 */

import type { PluginDefinition } from '../../types';

interface PSKModulatorState {
    sampleCounter: number;
    currentI: number;
    currentQ: number;
    lfsr: number;
}

const PSKModulatorPlugin = {
    type: 'PSK модулятор',
    id: 'psk-modulator',
    icon: 'dsp-psk',
    description: 'Модулятор BPSK/QPSK/8PSK',
    group: 'generators',

    signals: {
        input: null,
        output: 'complex'
    } as const,

    defaultParams: {
        constellation: 'QPSK',
        symbolRate: 1000,
        amplitude: 1.0
    },

    processor: {
        states: new Map<string, PSKModulatorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
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
            const state = this.states.get(nodeId)!;

            const samplesPerSymbol = (sampleRate as number) / (symbolRate as number);
            const output = new Float32Array(chunkSize * 2);

            // LFSR для PRBS
            function nextBit(): number {
                const bit = state.lfsr & 1;
                state.lfsr = (state.lfsr >>> 1) ^ (bit ? 0x80000057 : 0);
                return bit;
            }

            function getSymbol(): { i: number; q: number } {
                if (constellation === 'BPSK') {
                    const bit = nextBit();
                    return { i: bit ? (amplitude as number) : -(amplitude as number), q: 0 };
                } else if (constellation === 'QPSK') {
                    const b0 = nextBit();
                    const b1 = nextBit();
                    const angle = (Math.PI / 4) + (b0 * 2 + b1) * (Math.PI / 2);
                    return {
                        i: (amplitude as number) * Math.cos(angle),
                        q: (amplitude as number) * Math.sin(angle)
                    };
                } else {
                    // 8PSK
                    const b0 = nextBit();
                    const b1 = nextBit();
                    const b2 = nextBit();
                    const idx = (b0 << 2) | (b1 << 1) | b2;
                    const angle = idx * (Math.PI / 4);
                    return {
                        i: (amplitude as number) * Math.cos(angle),
                        q: (amplitude as number) * Math.sin(angle)
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
