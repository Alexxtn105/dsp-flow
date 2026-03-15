/**
 * Плагин восстановления несущей (Carrier Recovery — петля Костаса)
 *
 * Реализует петлю Костаса для когерентного восстановления несущей частоты
 * в цифровых модуляционных схемах (BPSK, QPSK):
 *
 *   Вход (complex) ──► Смеситель ──► Решающее устройство ──► Петлевой фильтр ──► NCO ──┐
 *                          ▲                                                            │
 *                          └────────────────────────────────────────────────────────────┘
 *
 * Архитектура:
 *   1. Смеситель — перемножение входного сигнала с сопряжённым NCO:
 *        mixI = inI·ncoI + inQ·ncoQ
 *        mixQ = inQ·ncoI - inI·ncoQ
 *   2. Решающий фазовый детектор (decision-directed):
 *      - BPSK: e = sign(I) · Q
 *      - QPSK: e = sign(I)·Q - sign(Q)·I
 *      В отличие от классического PLL (atan2), Костас-петля использует
 *      решения по символам для формирования ошибки, что позволяет
 *      устранить неоднозначность фазы модуляции.
 *   3. Петлевой фильтр — пропорционально-интегральный (PI) контроллер:
 *        u(n) = Kp·e(n) + Ki·∑e(k)
 *      Коэффициенты рассчитываются по формулам Гарднера:
 *        Kp = 2·ζ·ωn,  Ki = ωn²
 *   4. NCO (числовой управляемый генератор) — фазовый аккумулятор,
 *      управляемый суммой базовой частоты и выхода петлевого фильтра
 *
 * Выходы:
 *   - [0] Комплексный выход NCO (interleaved I/Q) — восстановленная несущая
 *   - [1] Фазовая ошибка (real) — сигнал рассогласования петли
 *
 * Параметры:
 *   - centerFrequency: начальная частота NCO (Гц)
 *   - bandwidth: полоса захвата петли (Гц). Определяет натуральную частоту ωn = 2π·BW
 *   - damping: коэффициент демпфирования ζ (обычно 0.707 для оптимума Баттерворта)
 *   - costasMode: режим решающего устройства ('bpsk' или 'qpsk')
 *
 * Вход:  complex (interleaved Float32Array [I0, Q0, I1, Q1, ...])
 * Выход 0: complex — выход NCO (восстановленная несущая, interleaved I/Q)
 * Выход 1: real — фазовая ошибка (сигнал рассогласования петли)
 *
 * Примеры использования:
 *
 *   1. Восстановление несущей BPSK-сигнала:
 *      PSKModulator(BPSK, fc=1000) → CarrierRecovery(fc=1000, BW=50, mode=bpsk)
 *      → [выход 0] → Constellation
 *      Петля Костаса захватывает несущую BPSK-сигнала. На созвездии
 *      видны два кластера точек на оси I после захвата.
 *
 *   2. Когерентный приём QPSK:
 *      PSKModulator(QPSK, fc=2000) → CarrierRecovery(fc=2000, BW=30, mode=qpsk)
 *      → Constellation
 *      В режиме QPSK решающее устройство учитывает 4-точечное созвездие,
 *      обеспечивая корректное слежение за фазой несущей.
 *
 *   3. Анализ захвата петли Костаса:
 *      PSKModulator(BPSK, fc=1050) → CarrierRecovery(fc=1000, BW=100, mode=bpsk)
 *      → [выход 1: фазовая ошибка] → Oscilloscope
 *      Начальная расстройка 50 Гц. Фазовая ошибка затухает до нуля
 *      по мере захвата петли. Полоса BW=100 Гц достаточна для захвата.
 */
import type { PluginDefinition, SignalType } from '../../types';

interface CarrierRecoveryState {
    ncoPhase: number;
    integrator: number;
}

const CarrierRecoveryPlugin = {
    type: 'Восстановление несущей',
    id: 'carrier-recovery',
    icon: 'dsp-carrier-recovery',
    description: 'Петля Костаса для восстановления несущей',
    group: 'detectors',
    signals: {
        input: 'complex' as const,
        output: 'complex' as const,
        outputsCount: 2,
        outputTypes: ['complex', 'real'] as SignalType[],
        outputLabels: ['NCO (I/Q)', 'Phase Error']
    },
    defaultParams: {
        centerFrequency: 1000,
        bandwidth: 50,
        damping: 0.707,
        costasMode: 'bpsk',
    },
    processor: {
        states: new Map<string, CarrierRecoveryState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): { outputs: Float32Array[] } {
            // Комплексный выход NCO: interleaved [I0, Q0, I1, Q1, ...]
            const ncoOutput = new Float32Array(chunkSize * 2);
            // Действительный выход фазовой ошибки
            const errorOutput = new Float32Array(chunkSize);
            const input = inputs[0];

            if (!input) return { outputs: [ncoOutput, errorOutput] };

            const sampleRate = (params.sampleRate ?? 48000) as number;
            const centerFreq = (params.centerFrequency ?? 1000) as number;
            const bandwidth = (params.bandwidth ?? 50) as number;
            const zeta = (params.damping ?? 0.707) as number;
            const costasMode = (params.costasMode ?? 'bpsk') as string;

            // Рассчитываем коэффициенты петлевого фильтра (формулы Гарднера)
            const wn = 2 * Math.PI * bandwidth;
            const Kp = 2 * zeta * wn / sampleRate;
            const Ki = (wn * wn) / (sampleRate * sampleRate);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    ncoPhase: 0,        // Фаза NCO
                    integrator: 0,      // Интегратор петлевого фильтра
                });
            }
            const state = this.states.get(nodeId)!;

            const numSamples = input.length >> 1;
            const basePhaseIncrement = (2 * Math.PI * centerFreq) / sampleRate;

            for (let i = 0; i < numSamples; i++) {
                // 1. Входной сигнал (I/Q)
                const inI = input[i * 2];
                const inQ = input[i * 2 + 1];

                // 2. Текущий выход NCO
                const ncoI = Math.cos(state.ncoPhase);
                const ncoQ = Math.sin(state.ncoPhase);

                // 3. Смеситель — перемножение входа с сопряжённым NCO
                const mixI = inI * ncoI + inQ * ncoQ;
                const mixQ = inQ * ncoI - inI * ncoQ;

                // 4. Решающий фазовый детектор (Costas loop)
                let phaseError: number;
                if (costasMode === 'qpsk') {
                    // QPSK: e = sign(I)·Q - sign(Q)·I
                    phaseError = Math.sign(mixI) * mixQ - Math.sign(mixQ) * mixI;
                } else {
                    // BPSK: e = sign(I) · Q
                    phaseError = Math.sign(mixI) * mixQ;
                }

                // 5. Петлевой фильтр (PI)
                state.integrator += Ki * phaseError;

                // Ограничение интегратора для предотвращения расходимости
                const maxIntegral = Math.PI;
                if (state.integrator > maxIntegral) state.integrator = maxIntegral;
                else if (state.integrator < -maxIntegral) state.integrator = -maxIntegral;

                const loopOutput = Kp * phaseError + state.integrator;

                // 6. NCO — обновление фазы
                state.ncoPhase += basePhaseIncrement + loopOutput;

                // Нормализация фазы (while для больших скачков)
                while (state.ncoPhase >= 2 * Math.PI) state.ncoPhase -= 2 * Math.PI;
                while (state.ncoPhase < 0) state.ncoPhase += 2 * Math.PI;

                // 7. Выходы
                ncoOutput[i * 2] = Math.cos(state.ncoPhase);
                ncoOutput[i * 2 + 1] = Math.sin(state.ncoPhase);
                errorOutput[i] = phaseError;
            }

            return { outputs: [ncoOutput, errorOutput] };
        }
    }
};

export default CarrierRecoveryPlugin satisfies PluginDefinition;
