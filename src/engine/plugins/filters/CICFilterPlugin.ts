/**
 * CIC-фильтр (Cascaded Integrator-Comb) — децимация/интерполяция без умножений
 *
 * Назначение:
 *   Каскадный интегратор-гребёнка — специализированный фильтр для изменения
 *   частоты дискретизации (децимация или интерполяция). Главное преимущество
 *   CIC — отсутствие операций умножения: фильтр состоит только из сумматоров
 *   и элементов задержки. Это делает его крайне эффективным при больших
 *   коэффициентах децимации (10x и более), где обычные FIR-фильтры
 *   потребовали бы слишком много вычислений.
 *
 *   CIC-фильтры широко применяются в SDR-приёмниках (Software Defined Radio)
 *   на первом этапе обработки для снижения частоты дискретизации с АЦП
 *   (например, с 100 МГц до 1 МГц).
 *
 * Алгоритм:
 *   Структура фильтра: каскад из N интеграторов → изменение частоты →
 *   каскад из N гребёнок (comb), где N = stages (количество каскадов).
 *
 *   Децимация:
 *     1. Каждый входной отсчёт проходит через каскад интеграторов:
 *        y[n] = y[n-1] + x[n] (накопительная сумма).
 *     2. Каждый R-й отсчёт (R = decimationFactor) передаётся в каскад
 *        гребёнок: y[n] = x[n] - x[n-1] (первая разность).
 *     3. Остальные отсчёты отбрасываются (прореживание).
 *
 *   Интерполяция (обратный порядок):
 *     1. Вход проходит через гребёнки.
 *     2. Между отсчётами вставляются R-1 нулей (zero-stuffing).
 *     3. Расширенный сигнал проходит через интеграторы.
 *
 *   Частотная характеристика CIC — sinc^N(f), что означает неравномерное
 *   подавление в полосе задерживания. Для компенсации обычно ставят
 *   дополнительный КИХ-фильтр (CIC compensation filter) после CIC.
 *
 *   Для предотвращения целочисленного переполнения при длительной работе
 *   интеграторы реализованы на Int32Array с модульной (wrapping) арифметикой.
 *   Масштабирование float → int32: ×32768.
 *
 * Параметры:
 *   - stages (int, по умолчанию 3) — количество каскадов (интеграторов
 *     и гребёнок). Больше каскадов → более крутой скат фильтра (подавление
 *     ~stages × 20 дБ на частоте Найквиста), но больше спад в полосе
 *     пропускания. Допустимый диапазон: 1–6.
 *   - decimationFactor (int, по умолчанию 4) — коэффициент децимации/
 *     интерполяции (R). Допустимый диапазон: 2–64.
 *   - mode (string, по умолчанию 'decimate') — режим работы:
 *     'decimate' — уменьшение частоты дискретизации в R раз,
 *     'interpolate' — увеличение частоты дискретизации в R раз.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array) — сигнал с изменённой частотой дискретизации
 *
 * Примеры использования:
 *
 *   1. Быстрая децимация в SDR:
 *      Signal(высокая частота) → CIC(stages=4, R=16, decimate) → FIRFilter → SpectrumAnalyzer
 *      CIC снижает частоту в 16 раз, а КИХ-фильтр компенсирует спад
 *      АЧХ в полосе пропускания.
 *
 *   2. Сравнение с обычной децимацией:
 *      Signal → CIC(stages=3, R=4)                 → Oscilloscope  (без умножений)
 *      Signal → DecimatorInterpolator(decimate, 4)  → Oscilloscope  (с FIR-фильтром)
 *      CIC быстрее при больших R, но имеет неравномерную АЧХ.
 *
 *   3. Интерполяция:
 *      Signal(12kHz) → CIC(stages=3, R=4, interpolate) → LowpassFIR → Speaker
 *      Повышение частоты в 4 раза. ФНЧ после CIC убирает остаточные
 *      образы спектра и компенсирует sinc-спад.
 */
import type { PluginDefinition } from '../../types';

const CIC_INT_SCALE = 32768; // масштаб float → int

interface CICState {
    integrators: Int32Array;
    combPrev: Int32Array;
    sampleCounter: number;
    lastKey: string;
}

const CICFilterPlugin = {
    type: 'CIC-фильтр',
    id: 'cic-filter',
    icon: 'dsp-cic',
    description: 'Каскадный интегратор-гребёнка (CIC)',
    group: 'filters',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        stages: 3,
        decimationFactor: 4,
        mode: 'decimate'
    },

    processor: {
        states: new Map<string, CICState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const stages = Math.max(1, Math.min((params.stages as number) ?? 3, 6));
            const R = Math.max(2, Math.min((params.decimationFactor as number) ?? 4, 64));
            const mode = (params.mode as string) ?? 'decimate';

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    integrators: new Int32Array(stages),
                    combPrev: new Int32Array(stages),
                    sampleCounter: 0,
                    lastKey: ''
                });
            }
            const state = this.states.get(nodeId)!;

            const key = `${stages}_${R}_${mode}`;
            if (state.lastKey !== key) {
                state.integrators = new Int32Array(stages);
                state.combPrev = new Int32Array(stages);
                state.sampleCounter = 0;
                state.lastKey = key;
            }

            const output = new Float32Array(chunkSize);
            const gain = Math.pow(R, stages) * CIC_INT_SCALE;

            if (mode === 'decimate') {
                let outIdx = 0;

                for (let i = 0; i < chunkSize; i++) {
                    // Масштабируем вход в целочисленный диапазон
                    let val = (input[i] * CIC_INT_SCALE) | 0;

                    // Каскад интеграторов (wrapping arithmetic через Int32)
                    for (let s = 0; s < stages; s++) {
                        state.integrators[s] = (state.integrators[s] + val) | 0;
                        val = state.integrators[s];
                    }

                    state.sampleCounter++;
                    if (state.sampleCounter >= R) {
                        state.sampleCounter = 0;

                        // Каскад гребёнок (comb): y = x - x_prev, задержка M=1
                        let combVal = val;
                        for (let s = 0; s < stages; s++) {
                            const prev = state.combPrev[s];
                            state.combPrev[s] = combVal;
                            combVal = (combVal - prev) | 0;
                        }

                        if (outIdx < chunkSize) {
                            output[outIdx] = combVal / gain;
                            outIdx++;
                        }
                    }
                }
            } else {
                // Интерполяция
                let outIdx = 0;

                for (let i = 0; i < chunkSize; i++) {
                    let val = (input[i] * CIC_INT_SCALE) | 0;

                    // Каскад гребёнок (comb): y = x - x_prev, задержка M=1
                    let combVal = val;
                    for (let s = 0; s < stages; s++) {
                        const prev = state.combPrev[s];
                        state.combPrev[s] = combVal;
                        combVal = (combVal - prev) | 0;
                    }

                    // Вставка R сэмплов (zero-stuffing + интегрирование)
                    for (let r = 0; r < R && outIdx < chunkSize; r++) {
                        let intVal = (r === 0) ? combVal : 0;

                        for (let s = 0; s < stages; s++) {
                            state.integrators[s] = (state.integrators[s] + intVal) | 0;
                            intVal = state.integrators[s];
                        }

                        output[outIdx] = intVal / gain;
                        outIdx++;
                    }
                }
            }

            return output;
        }
    }
};

export default CICFilterPlugin;
