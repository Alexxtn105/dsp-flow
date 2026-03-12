/**
 * Фазовый детектор — Извлечение и отслеживание фазы комплексного сигнала
 *
 * Назначение:
 *   Извлекает мгновенную фазу из комплексного (I/Q) сигнала и представляет
 *   её в одном из нескольких форматов. Фаза — это угол вектора (I, Q) на
 *   комплексной плоскости. Для синусоиды с постоянной частотой фаза линейно
 *   нарастает во времени (пилообразная форма при периодическом диапазоне,
 *   линейный рост при накоплении). Для фазомодулированного сигнала фаза
 *   содержит информационный сигнал.
 *
 * Алгоритм:
 *   1. Из комплексного отсчёта z[n] = I + jQ вычисляется мгновенная фаза:
 *      φ[n] = atan2(Q, I), результат в диапазоне (−π, π].
 *   2. Развёртка фазы (phase unwrapping): вычисляется Δφ = φ[n] − φ[n−1],
 *      и если |Δφ| > π, корректируется на ±2π. Это устраняет разрывы
 *      при переходе фазы через ±π.
 *   3. Накопление: accumPhase += Δφ. Накопленная фаза непрерывно растёт
 *      (или убывает) без скачков.
 *   4. Преобразование в выбранный формат выхода (outputRange).
 *   5. Масштабирование на коэффициент чувствительности.
 *
 *   Защита: при магнитуде |z| < 1e-10 фаза не определена — выводится
 *   последнее накопленное значение.
 *
 * Параметры:
 *   - referenceFrequency (float, по умолчанию 1000, Гц) — опорная частота.
 *     В текущей реализации используется для информационных целей.
 *     Рекомендуемый диапазон: 0–sampleRate/2.
 *   - sensitivity (float, по умолчанию 1.0) — коэффициент усиления выхода.
 *     Масштабирует значение фазы. Значения > 1 усиливают, < 1 ослабляют.
 *     Рекомендуемый диапазон: 0.01–100.
 *   - outputRange (string, по умолчанию '±180°') — формат выходных значений:
 *     '±180°'  — накопленная фаза в градусах (непрерывный рост/убывание).
 *                Для синусоиды 1 кГц при sampleRate=48000 фаза растёт
 *                на 7.5° за отсчёт (360°·1000/48000).
 *     '0-360°' — фаза в градусах, свёрнутая в диапазон [0, 360).
 *                Пилообразная форма с периодом, равным периоду сигнала.
 *     '0-2π'   — фаза в радианах, свёрнутая в диапазон [0, 2π).
 *                Аналог '0-360°', но в радианах.
 *     '±π'     — накопленная фаза в радианах (непрерывный рост/убывание).
 *                Наиболее «сырой» формат, удобный для дальнейшей обработки.
 *
 * Вход:  complex (interleaved Float32Array [I0, Q0, I1, Q1, ...])
 * Выход: real (Float32Array) — фаза в выбранном формате × sensitivity
 *
 * Примеры использования:
 *
 *   1. Визуализация линейного роста фазы:
 *      RefSine(1000) → ComplexComposer → PhaseDetector(±180°) → Oscilloscope
 *      На осциллографе — линейно нарастающая линия (накопленная фаза
 *      в градусах). За 1 мс фаза вырастает на 360° (один полный оборот).
 *
 *   2. Пилообразная фаза:
 *      RefSine(1000) → ComplexComposer → PhaseDetector(0-360°) → Oscilloscope
 *      Фаза «оборачивается» каждые 360°, создавая пилообразную форму
 *      с частотой повторения 1000 Гц.
 *
 *   3. Демодуляция фазовой модуляции:
 *      AMFMPMModulator(PM) → HilbertTransformer → PhaseDetector(±π, sens=1.0)
 *      → Oscilloscope
 *      Извлечённая фаза повторяет форму модулирующего сигнала.
 *      Режим '±π' удобен для ФМ-демодуляции, т.к. выход в радианах
 *      непосредственно соответствует индексу модуляции.
 *
 *   4. Измерение фазового сдвига:
 *      RefSine(1000) → ComplexComposer → PhaseDetector(±180°)
 *      → NumericIndicator
 *      Текущее значение фазы на индикаторе. Полезно для калибровки
 *      и сравнения фазовых задержек между блоками.
 */
import type { PluginDefinition } from '../../types';
import { unwrapPhaseDelta } from '../_shared/SignalUtils';

interface PhaseDetectorState {
    prevPhase: number;
    accumPhase: number;
}

const PhaseDetectorPlugin = {
    type: 'Фазовый детектор',
    id: 'phase-detector',
    icon: 'dsp-phase-detect',
    description: 'Фазовый детектор',
    group: 'detectors',
    signals: { input: 'complex', output: 'real' } as const,
    defaultParams: {
        referenceFrequency: 1000,
        sensitivity: 1.0,
        outputRange: '±180°',
    },
    processor: {
        states: new Map<string, PhaseDetectorState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { prevPhase: 0, accumPhase: 0 });
            }
            const state = this.states.get(nodeId)!;

            const range = (params.outputRange ?? '±180°') as string;
            const sensitivity = (params.sensitivity ?? 1.0) as number;
            // Interleaved I/Q: input.length = chunkSize * 2, выход = chunkSize
            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                const I = input[i * 2];
                const Q = input[i * 2 + 1];

                // M5: Обработка нулевой магнитуды — фаза неопределена
                const mag = Math.hypot(I, Q);
                if (mag < 1e-10) {
                    // Выводим последнее накопленное значение
                    output[i] = state.accumPhase;
                    continue;
                }

                let phase = Math.atan2(Q, I);

                // Phase unwrapping
                const delta = unwrapPhaseDelta(phase - state.prevPhase);
                state.accumPhase += delta;
                state.prevPhase = phase;

                let value: number;
                switch (range) {
                    case '±180°':
                        value = state.accumPhase * (180 / Math.PI);
                        break;
                    case '0-360°': {
                        const deg = state.accumPhase * (180 / Math.PI);
                        value = ((deg % 360) + 360) % 360;
                        break;
                    }
                    case '0-2π':
                        value = ((state.accumPhase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                        break;
                    default: // '±π'
                        value = state.accumPhase;
                        break;
                }

                output[i] = value * sensitivity;
            }

            return output;
        }
    }
};

export default PhaseDetectorPlugin satisfies PluginDefinition;
