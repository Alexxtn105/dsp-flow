/**
 * Референсный синусный генератор — Управляемый числовой осциллятор (NCO)
 *
 * Назначение:
 *   NCO (Numerically Controlled Oscillator) — генератор с внешним управлением
 *   частотой и фазой. В отличие от обычного синусного генератора, частота и фаза
 *   могут изменяться в реальном времени через управляющие входы. Это ключевой блок
 *   для построения PLL (петля фазовой автоподстройки), когерентных демодуляторов,
 *   адаптивных фильтров и систем частотного синтеза.
 *
 * Алгоритм:
 *   Фазовый аккумулятор аналогичен обычному генератору, но на каждом отсчёте:
 *   1. Мгновенная частота берётся из входа управления (или из параметра frequency).
 *   2. Смещение фазы берётся из второго входа (или из параметра phase).
 *   3. Вычисляется приращение: Δφ = 2π · freq / sampleRate.
 *   4. Формируется комплексный выход: I = sin(phase), Q = cos(phase).
 *   Фаза нормализуется в [0, 2π) для предотвращения потери точности при длительной
 *   работе.
 *
 * Комплексный выход (I = sin, Q = cos):
 *   NCO выдаёт аналитический сигнал — комплексную экспоненту e^(jφ),
 *   представленную парой I/Q. Это позволяет использовать NCO для комплексного
 *   перемножения (сдвиг частоты), фазовой коррекции и формирования опорного
 *   сигнала в PLL. Формат выхода: interleaved [I0, Q0, I1, Q1, ...].
 *
 * Параметры:
 *   - frequency (float, по умолчанию 1000) — базовая частота в Гц.
 *     Используется, когда вход частоты не подключён. Диапазон: 0–sampleRate/2.
 *   - amplitude (float, по умолчанию 1.0) — амплитуда выходного сигнала.
 *     Диапазон: 0.0–1.0.
 *   - phase (float, по умолчанию 0) — базовое смещение фазы в градусах.
 *     Используется, когда вход фазы не подключён. Диапазон: 0–360°.
 *   - controllable (bool, по умолчанию true) — флаг управляемого генератора.
 *
 * Входы (2 реальных):
 *   - Вход 0 «Частота (Гц)» — мгновенная частота, Гц. Каждый отсчёт задаёт
 *     частоту для соответствующего момента времени (позволяет частотную модуляцию).
 *   - Вход 1 «Фаза (рад)» — мгновенное смещение фазы, радианы. Позволяет
 *     внешнюю коррекцию фазы (например, от петлевого фильтра PLL).
 *
 * Выход: complex (interleaved Float32Array длиной chunkSize × 2, I = sin, Q = cos)
 *
 * Примеры использования:
 *
 *   1. PLL — петля фазовой автоподстройки:
 *      PSKModulator(QPSK) → PhaseDetector → LoopFilter →
 *      → RefSine(вход частоты) → PhaseDetector (опорный вход)
 *      NCO генерирует опорный сигнал, частота которого подстраивается
 *      петлевым фильтром для захвата фазы входного сигнала.
 *
 *   2. Управляемый гетеродин (сдвиг частоты):
 *      Constant(5000) → RefSine(вход частоты) → ComplexMultiplier ← входной сигнал
 *      NCO на фиксированной частоте 5 кГц используется для переноса спектра.
 *
 *   3. Частотная модуляция через NCO:
 *      Sine(100 Гц) → Gain(1000) → RefSine(вход частоты) → Oscilloscope
 *      Модулирующий сигнал 100 Гц управляет частотой NCO, создавая FM-сигнал.
 */

export default {
    type: 'Референсный синусный генератор',
    id: 'ref-sine-generator',
    icon: 'dsp-ref-sine',
    description: 'Управляемый референсный синусный генератор (NCO). Верхний вход — мгновенная частота (Гц), нижний — смещение фазы (рад)',
    group: 'generators',
    signals: { input: 'real', output: 'complex', inputsCount: 2, inputLabels: ['Частота (Гц)', 'Фаза (рад)'] },
    defaultParams: {
        frequency: 1000,
        amplitude: 1.0,
        phase: 0,
        controllable: true,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            // Комплексный выход: interleaved [I0, Q0, I1, Q1, ...] размером chunkSize * 2
            const output = new Float32Array(chunkSize * 2);
            const baseFrequency = params.frequency ?? 1000;
            const amplitude = params.amplitude ?? 1.0;
            const basePhaseOffset = (params.phase ?? 0) * (Math.PI / 180);
            const sampleRate = params.sampleRate ?? 48000;

            // Входы управления: inputs[0] — мгновенная частота (Гц), inputs[1] — смещение фазы (рад)
            const freqInput = inputs[0] ?? null;
            const phaseInput = inputs[1] ?? null;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { currentPhase: 0 });
            }
            const state = this.states.get(nodeId);

            for (let i = 0; i < chunkSize; i++) {
                const freq = freqInput ? freqInput[i] : baseFrequency;
                const phaseOffset = phaseInput ? phaseInput[i] : basePhaseOffset;
                const phaseIncrement = (2 * Math.PI * freq) / sampleRate;

                const phase = state.currentPhase + phaseOffset;
                // I = sin, Q = cos (аналитический сигнал)
                output[i * 2] = amplitude * Math.sin(phase);
                output[i * 2 + 1] = amplitude * Math.cos(phase);
                state.currentPhase += phaseIncrement;
                // Нормализация фазы в [0, 2π) для предотвращения потери точности
                if (state.currentPhase >= 2 * Math.PI || state.currentPhase < 0) {
                    state.currentPhase = state.currentPhase % (2 * Math.PI);
                    if (state.currentPhase < 0) state.currentPhase += 2 * Math.PI;
                }
            }

            return output;
        }
    }
};
