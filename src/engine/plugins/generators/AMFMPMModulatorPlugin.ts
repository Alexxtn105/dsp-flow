/**
 * АМ/ЧМ/ФМ модулятор — Амплитудная, частотная и фазовая модуляция
 *
 * Назначение:
 *   Принимает модулирующий (информационный) сигнал и переносит его на высокочастотную
 *   несущую одним из трёх способов: амплитудная (AM), частотная (FM) или фазовая (PM)
 *   модуляция. Это базовые виды аналоговой модуляции, используемые в радиосвязи,
 *   радиовещании и телеметрии.
 *
 * Алгоритм:
 *   Используется фазовый аккумулятор с базовым приращением Δφ = 2π · fc / sampleRate.
 *
 *   - AM (амплитудная модуляция):
 *     s(t) = (1 + m · x(t)) · cos(φ)
 *     Амплитуда несущей изменяется пропорционально модулирующему сигналу x(t).
 *     При m=1 и x(t)=±1 глубина модуляции 100%. При m > 1 возникает перемодуляция
 *     (искажение огибающей). Спектр: несущая + две боковые полосы (fc ± fm).
 *
 *   - FM (частотная модуляция):
 *     s(t) = cos(φ), где φ += Δφ + 2π · m · x(t) / sampleRate
 *     Мгновенная частота отклоняется от несущей пропорционально x(t).
 *     Параметр m здесь — частотная девиация (Гц): максимальное отклонение частоты
 *     от несущей при x(t)=1. Спектр шире AM, ширина ≈ 2·(Δf + fm) (правило Карсона).
 *
 *   - PM (фазовая модуляция):
 *     s(t) = cos(φ + m · x(t))
 *     Фаза несущей сдвигается пропорционально x(t). Параметр m — индекс фазовой
 *     модуляции (радианы): максимальный сдвиг фазы при x(t)=1. PM тесно связана
 *     с FM: FM = PM с интегрированным модулирующим сигналом.
 *
 * Параметры:
 *   - modulationType (string, по умолчанию 'AM') — тип модуляции: 'AM', 'FM', 'PM'.
 *   - carrierFrequency (float, по умолчанию 10000) — частота несущей в Гц.
 *     Диапазон: 0–sampleRate/2. Должна быть значительно выше частоты модулирующего
 *     сигнала (обычно в 5–10+ раз).
 *   - modulationIndex (float, по умолчанию 0.5) — индекс/глубина модуляции.
 *     Для AM: глубина модуляции (0–1, где 1 = 100%). Значения > 1 — перемодуляция.
 *     Для FM: частотная девиация в Гц. Типичные значения: 75 (FM-радио), 5 (узкополосная).
 *     Для PM: индекс фазовой модуляции в радианах. Типичные значения: 0.5–π.
 *
 * Вход:  real (модулирующий сигнал, Float32Array). Если вход не подключён, x(t)=0
 *         (немодулированная несущая).
 * Выход: real (модулированный сигнал, Float32Array длиной chunkSize)
 *
 * Примеры использования:
 *
 *   1. AM-модуляция с наблюдением огибающей:
 *      Sine(500 Гц) → AMFMPMModulator(AM, несущая 10000, m=0.8) → Oscilloscope
 *      На осциллографе видна высокочастотная несущая с огибающей в форме синуса 500 Гц.
 *
 *   2. FM-модуляция и спектральный анализ:
 *      Sine(200 Гц) → AMFMPMModulator(FM, несущая 5000, девиация 1000) → SpectrumAnalyzer
 *      На спектре видна несущая 5 кГц с боковыми полосами, ширина ≈ 2·(1000+200) = 2400 Гц.
 *
 *   3. AM-демодуляция (детектирование огибающей):
 *      Sine(300 Гц) → AMFMPMModulator(AM, 10000, m=0.5) →
 *      → AmplitudeDetector → LowpassFIR → Oscilloscope
 *      Детектор огибающей восстанавливает исходный сигнал 300 Гц.
 *
 *   4. FM-демодуляция:
 *      Sine(100 Гц) → AMFMPMModulator(FM, 8000, девиация 500) →
 *      → FrequencyDiscriminator → LowpassFIR → Oscilloscope
 *      Частотный дискриминатор извлекает модулирующий сигнал из FM.
 */

import type { PluginDefinition } from '../../types';

interface AMFMPMModulatorState {
    phase: number;
}

const AMFMPMModulatorPlugin = {
    type: 'АМ/ЧМ/ФМ модулятор',
    id: 'amfmpm-modulator',
    icon: 'dsp-modulator',
    description: 'Модулятор (АМ, ЧМ, ФМ)',
    group: 'generators',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        modulationType: 'AM',
        carrierFrequency: 10000,
        modulationIndex: 0.5
    },

    processor: {
        states: new Map<string, AMFMPMModulatorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            const output = new Float32Array(chunkSize);
            const sampleRate = params.sampleRate ?? 48000;
            const fc = params.carrierFrequency ?? 10000;
            const m = params.modulationIndex ?? 0.5;
            const modType = params.modulationType ?? 'AM';

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { phase: 0 });
            }
            const state = this.states.get(nodeId)!;

            const phaseInc = (2 * Math.PI * (fc as number)) / (sampleRate as number);

            for (let i = 0; i < chunkSize; i++) {
                const x = input ? input[i] : 0;

                if (modType === 'AM') {
                    output[i] = (1 + (m as number) * x) * Math.cos(state.phase);
                    state.phase += phaseInc;
                } else if (modType === 'FM') {
                    // m = частотная девиация (Гц), единый фазовый аккумулятор
                    state.phase += phaseInc + (2 * Math.PI * (m as number) * x) / (sampleRate as number);
                    output[i] = Math.cos(state.phase);
                } else {
                    // PM: m = индекс фазовой модуляции (рад)
                    output[i] = Math.cos(state.phase + (m as number) * x);
                    state.phase += phaseInc;
                }

                // Нормализация фазы в обе стороны
                if (state.phase >= 2 * Math.PI) {
                    state.phase -= 2 * Math.PI;
                } else if (state.phase < 0) {
                    state.phase += 2 * Math.PI;
                }
            }

            return output;
        }
    }
};

export default AMFMPMModulatorPlugin;
