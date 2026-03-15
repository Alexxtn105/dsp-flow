/**
 * Плагин ФАПЧ (Фазовая автоподстройка частоты / Phase-Locked Loop)
 *
 * Реализует классическую петлю ФАПЧ 2-го порядка с посэмпловой обратной связью:
 *
 *   Вход (complex) ──► Фазовый детектор ──► Петлевой фильтр ──► NCO ──┐
 *                            ▲                                         │
 *                            └─────────────────────────────────────────┘
 *
 * Архитектура:
 *   1. Фазовый детектор — перемножение входного сигнала с опорным NCO,
 *      извлечение фазовой ошибки через atan2(Q·I_nco - I·Q_nco, I·I_nco + Q·Q_nco)
 *   2. Петлевой фильтр — пропорционально-интегральный (PI) контроллер:
 *        u(n) = Kp·e(n) + Ki·∑e(k)
 *      где Kp и Ki рассчитываются из натуральной частоты ωn и коэффициента
 *      демпфирования ζ по формулам Гарднера:
 *        Kp = 2·ζ·ωn,  Ki = ωn²
 *   3. NCO (числовой управляемый генератор) — фазовый аккумулятор,
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
 *
 * Вход:  complex (interleaved Float32Array [I0, Q0, I1, Q1, ...])
 * Выход 0: complex — выход NCO (восстановленная несущая, interleaved I/Q)
 * Выход 1: real — фазовая ошибка (сигнал рассогласования петли, радианы)
 *
 * Примеры использования:
 *
 *   1. Захват и слежение за синусоидой:
 *      RefSine(1000) → ComplexComposer → PLL(fc=1000, BW=50) → ComplexMagnitude
 *      → Oscilloscope
 *      PLL захватывает входной тон с частотой 1000 Гц. На выходе NCO —
 *      синусоида, синхронизированная по фазе и частоте с входом.
 *      ComplexMagnitude показывает стабильную амплитуду после захвата.
 *      Фазовая ошибка (выход 1) стремится к нулю при установившемся режиме.
 *
 *   2. Восстановление несущей в PSK-приёмнике:
 *      PSKModulator(QPSK, sps=4) → TimingRecovery(sps=4) → PLL(fc=0, BW=30)
 *      → Constellation
 *      В цепочке цифрового приёмника PLL компенсирует фазовый сдвиг несущей.
 *      Без PLL точки созвездия QPSK повёрнуты на произвольный угол,
 *      после PLL — выровнены по осям. centerFrequency = 0, т.к. сигнал
 *      после TimingRecovery уже на нулевой промежуточной частоте.
 *
 *   3. Анализ захвата петли:
 *      RefSine(1050) → ComplexComposer → PLL(fc=1000, BW=100)
 *      → [выход 1: фазовая ошибка] → Oscilloscope
 *      Начальная расстройка 50 Гц. На осциллографе видно, как фазовая ошибка
 *      осциллирует в начале и затухает до нуля по мере захвата петли.
 *      Ширина полосы BW=100 Гц достаточна для захвата расстройки в 50 Гц.
 */
import type { PluginDefinition, SignalType } from '../../types';

interface PLLState {
    ncoPhase: number;
    integrator: number;
}

const PLLPlugin = {
    type: 'ФАПЧ',
    id: 'pll',
    icon: 'dsp-pll',
    description: 'Фазовая автоподстройка частоты (PLL 2-го порядка)',
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
    },
    processor: {
        states: new Map<string, PLLState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): { outputs: Float32Array[] } {
            const input = inputs[0];
            // Комплексный выход NCO: interleaved [I0, Q0, I1, Q1, ...]
            const ncoOutput = new Float32Array(chunkSize * 2);
            // Действительный выход фазовой ошибки
            const errorOutput = new Float32Array(chunkSize);

            if (!input) return { outputs: [ncoOutput, errorOutput] };

            const sampleRate = (params.sampleRate ?? 48000) as number;
            const centerFreq = (params.centerFrequency ?? 1000) as number;
            const bandwidth = (params.bandwidth ?? 50) as number;
            const zeta = (params.damping ?? 0.707) as number;

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

                // 3. Фазовый детектор — ошибка фазы между входом и NCO
                //    e = arg(input · conj(nco)) = atan2(inQ·ncoI - inI·ncoQ, inI·ncoI + inQ·ncoQ)
                const cross = inQ * ncoI - inI * ncoQ;
                const dot   = inI * ncoI + inQ * ncoQ;
                const phaseError = Math.atan2(cross, dot);

                // 4. Петлевой фильтр (PI)
                state.integrator += Ki * phaseError;

                // Ограничение интегратора для предотвращения расходимости
                const maxIntegral = Math.PI;
                if (state.integrator > maxIntegral) state.integrator = maxIntegral;
                else if (state.integrator < -maxIntegral) state.integrator = -maxIntegral;

                const loopOutput = Kp * phaseError + state.integrator;

                // 5. NCO — обновление фазы
                state.ncoPhase += basePhaseIncrement + loopOutput;

                // Нормализация фазы
                if (state.ncoPhase >= 2 * Math.PI) state.ncoPhase -= 2 * Math.PI;
                else if (state.ncoPhase < 0) state.ncoPhase += 2 * Math.PI;

                // 6. Выходы
                ncoOutput[i * 2] = Math.cos(state.ncoPhase);
                ncoOutput[i * 2 + 1] = Math.sin(state.ncoPhase);
                errorOutput[i] = phaseError;
            }

            return { outputs: [ncoOutput, errorOutput] };
        }
    }
};

export default PLLPlugin satisfies PluginDefinition;
