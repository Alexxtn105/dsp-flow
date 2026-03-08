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
 */

export default {
    type: 'ФАПЧ',
    id: 'pll',
    icon: 'dsp-pll',
    description: 'Фазовая автоподстройка частоты (PLL 2-го порядка)',
    group: 'detectors',
    signals: {
        input: 'complex',
        output: 'complex',
        outputsCount: 2,
        outputTypes: ['complex', 'real'],
        outputLabels: ['NCO (I/Q)', 'Фазовая ошибка']
    },
    defaultParams: {
        centerFrequency: 1000,
        bandwidth: 50,
        damping: 0.707,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            // Комплексный выход NCO: interleaved [I0, Q0, I1, Q1, ...]
            const ncoOutput = new Float32Array(chunkSize * 2);
            // Действительный выход фазовой ошибки
            const errorOutput = new Float32Array(chunkSize);

            if (!input) return { outputs: [ncoOutput, errorOutput] };

            const sampleRate = params.sampleRate ?? 48000;
            const centerFreq = params.centerFrequency ?? 1000;
            const bandwidth = params.bandwidth ?? 50;
            const zeta = params.damping ?? 0.707;

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
            const state = this.states.get(nodeId);

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
