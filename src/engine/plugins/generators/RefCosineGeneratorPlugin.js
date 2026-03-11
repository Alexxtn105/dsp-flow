/**
 * Референсный косинусный генератор — Управляемый числовой осциллятор (NCO)
 *
 * Назначение:
 *   NCO (Numerically Controlled Oscillator) с косинусной квадратурой. Аналогичен
 *   RefSine, но формирует комплексный выход с другим отображением I/Q:
 *   I = cos(φ), Q = −sin(φ). Это соответствует комплексной экспоненте e^(−jφ),
 *   что удобно для задач, где требуется сопряжённый опорный сигнал (например,
 *   понижающее преобразование частоты = умножение на e^(−j·2π·f·t)).
 *
 * Алгоритм:
 *   Фазовый аккумулятор идентичен RefSine. На каждом отсчёте:
 *   1. Мгновенная частота берётся из входа управления (или из параметра frequency).
 *   2. Смещение фазы берётся из второго входа (или из параметра phase).
 *   3. Вычисляется приращение: Δφ = 2π · freq / sampleRate.
 *   4. Формируется комплексный выход: I = cos(phase), Q = −sin(phase).
 *   Фаза нормализуется в [0, 2π).
 *
 * Отличие от RefSine:
 *   RefSine:   I = sin(φ), Q = cos(φ)   → представляет e^(jφ) (с точностью до поворота)
 *   RefCosine: I = cos(φ), Q = −sin(φ)  → представляет e^(−jφ)
 *   При комплексном перемножении входного сигнала на e^(−jφ) происходит понижение
 *   частоты (перенос спектра вниз), что необходимо в приёмниках.
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
 *   - Вход 0 «Частота (Гц)» — мгновенная частота, Гц.
 *   - Вход 1 «Фаза (рад)» — мгновенное смещение фазы, радианы.
 *
 * Выход: complex (interleaved Float32Array длиной chunkSize × 2, I = cos, Q = −sin)
 *
 * Примеры использования:
 *
 *   1. Понижающее преобразование частоты (downconversion):
 *      Входной сигнал на несущей 10 кГц → ComplexMultiplier ← RefCosine(10000 Гц)
 *      → LowpassFIR → Constellation
 *      Умножение на e^(−j·2π·10000·t) переносит спектр на нулевую частоту (baseband).
 *
 *   2. PLL с косинусным NCO:
 *      Сигнал → PhaseDetector → LoopFilter →
 *      → RefCosine(вход частоты) → PhaseDetector (опорный)
 *      Используется, когда фазовый детектор ожидает косинусный опорный сигнал.
 *
 *   3. Сравнение RefSine и RefCosine:
 *      RefSine(1000 Гц) → Oscilloscope (канал 1)
 *      RefCosine(1000 Гц) → Oscilloscope (канал 2)
 *      На I-компоненте RefSine виден sin, на I-компоненте RefCosine — cos.
 */

export default {
    type: 'Референсный косинусный генератор',
    id: 'ref-cosine-generator',
    icon: 'dsp-ref-cosine',
    description: 'Управляемый референсный косинусный генератор (NCO). Верхний вход — мгновенная частота (Гц), нижний — смещение фазы (рад)',
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
                // I = cos, Q = -sin (аналитический сигнал)
                output[i * 2] = amplitude * Math.cos(phase);
                output[i * 2 + 1] = -amplitude * Math.sin(phase);
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
