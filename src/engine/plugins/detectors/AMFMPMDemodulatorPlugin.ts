/**
 * АМ/ЧМ/ФМ демодулятор — Универсальный демодулятор аналоговых модуляций
 *
 * Назначение:
 *   Извлекает информационный (модулирующий) сигнал из модулированного колебания.
 *   Поддерживает три вида аналоговой модуляции: амплитудную (AM), частотную (FM)
 *   и фазовую (PM). На вход подаётся действительный (real) сигнал, внутри
 *   формируется аналитический (комплексный) сигнал через преобразование Гильберта,
 *   после чего извлекается нужный параметр.
 *
 * Принцип работы:
 *   Ключевая идея — преобразование действительного сигнала в аналитический:
 *     z(t) = x(t) + j·H{x(t)},
 *   где H{} — преобразование Гильберта, создающее квадратурную (Q) компоненту.
 *   I-компонента — это задержанный на HILBERT_M отсчётов входной сигнал.
 *   Используется 31-точечный КИХ-фильтр Гильберта с окном Хэмминга.
 *
 *   Режимы демодуляции:
 *     - AM (амплитудная модуляция):
 *       Огибающая = |z(t)| = √(I² + Q²). Информация закодирована в амплитуде
 *       несущей. После извлечения огибающей применяется DC-блокировка (фильтр
 *       вида y[n] = x[n] - x[n-1] + 0.995·y[n-1]) для удаления постоянной
 *       составляющей, соответствующей уровню несущей.
 *
 *     - FM (частотная модуляция):
 *       Мгновенная частота = d(phase)/dt. Вычисляется через произведение
 *       conj(z[n-1])·z[n], где фазовая разность = atan2(Im, Re) этого
 *       произведения. Результат масштабируется: f = Δφ · sampleRate / (2π).
 *       Информация закодирована в отклонении частоты от несущей.
 *
 *     - PM (фазовая модуляция):
 *       Мгновенная фаза = atan2(Q, I). Информация закодирована непосредственно
 *       в фазе несущей. Выход — значения в радианах (от -π до π).
 *
 * Параметры:
 *   - modulationType (string, по умолчанию 'AM') — тип демодуляции.
 *     Допустимые значения: 'AM', 'FM', 'PM'.
 *   - carrierFrequency (float, по умолчанию 10000, Гц) — частота несущей.
 *     Используется для информационных целей (в текущей реализации не влияет
 *     непосредственно на алгоритм, т.к. Гильберт-фильтр работает широкополосно).
 *
 * Внутренние детали:
 *   - Гильберт-фильтр: 31-точечный КИХ (HILBERT_N=31), задержка HILBERT_M=15
 *     отсчётов. Коэффициенты: h[n] = (2/πk) для нечётных k, 0 для чётных,
 *     домножены на окно Хэмминга (0.54 − 0.46·cos(2πn/(N−1))).
 *   - Кольцевой буфер хранит последние 31 отсчётов для свёртки.
 *   - DC-блокировка (только AM) — рекурсивный фильтр 1-го порядка с коэффициентом
 *     0.995, удаляющий постоянную составляющую огибающей.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array) — демодулированный сигнал
 *
 * Примеры использования:
 *
 *   1. Демодуляция FM-сигнала:
 *      AMFMPMModulator(FM, fc=10000, dev=5000) → AMFMPMDemodulator(FM)
 *      → Oscilloscope
 *      Модулятор создаёт ЧМ-сигнал, демодулятор извлекает исходное
 *      модулирующее колебание. На осциллографе виден восстановленный сигнал.
 *
 *   2. Демодуляция AM-сигнала:
 *      AMFMPMModulator(AM) → AMFMPMDemodulator(AM) → Oscilloscope
 *      Детектор огибающей выделяет модулирующий сигнал из AM-колебания.
 *      DC-блокировка убирает постоянную составляющую несущей.
 *
 *   3. Анализ фазы PM-сигнала:
 *      AMFMPMModulator(PM) → AMFMPMDemodulator(PM) → Oscilloscope
 *      Извлечённая фаза повторяет форму модулирующего сигнала.
 *
 *   4. Спектральный анализ после демодуляции:
 *      AMFMPMModulator(FM) → AMFMPMDemodulator(FM) → SpectrumAnalyzer
 *      Позволяет убедиться, что спектр демодулированного сигнала
 *      соответствует исходному модулирующему сигналу.
 */
import type { PluginDefinition } from '../../types';

// Предвычисленные коэффициенты Гильберт-фильтра (31-point, окно Хэмминга)
const HILBERT_N = 31;
const HILBERT_M = Math.floor(HILBERT_N / 2);
const HILBERT_COEFFS = new Float64Array(HILBERT_N);
for (let n = 0; n < HILBERT_N; n++) {
    if (n === HILBERT_M) {
        HILBERT_COEFFS[n] = 0;
    } else {
        const k = n - HILBERT_M;
        HILBERT_COEFFS[n] = (k % 2 !== 0) ? (2 / (Math.PI * k)) : 0;
        HILBERT_COEFFS[n] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (HILBERT_N - 1));
    }
}

interface AMFMPMDemodulatorState {
    prevI: number;
    prevQ: number;
    buffer: Float32Array;
    bufIdx: number;
    dcBlock: number;
    prevDcIn: number;
}

const AMFMPMDemodulatorPlugin = {
    type: 'АМ/ЧМ/ФМ демодулятор',
    id: 'amfmpm-demodulator',
    icon: 'dsp-demodulator',
    description: 'Демодулятор (АМ, ЧМ, ФМ)',
    group: 'detectors',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        modulationType: 'AM',
        carrierFrequency: 10000
    },

    processor: {
        states: new Map<string, AMFMPMDemodulatorState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const output = new Float32Array(chunkSize);
            const modType = (params.modulationType ?? 'AM') as string;
            const sampleRate = (params.sampleRate ?? 48000) as number;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    prevI: 0,
                    prevQ: 0,
                    buffer: new Float32Array(HILBERT_N),
                    bufIdx: 0,
                    dcBlock: 0,
                    prevDcIn: 0
                });
            }
            const state = this.states.get(nodeId)!;

            for (let i = 0; i < chunkSize; i++) {
                const x = input[i];

                // Записываем в кольцевой буфер
                state.buffer[state.bufIdx] = x;

                // Выход Гильберт-фильтра (Q-компонента)
                let q = 0;
                for (let k = 0; k < HILBERT_N; k++) {
                    const idx = (state.bufIdx - k + HILBERT_N) % HILBERT_N;
                    q += HILBERT_COEFFS[k] * state.buffer[idx];
                }

                // Задержанный вход (I-компонента)
                const delayedIdx = (state.bufIdx - HILBERT_M + HILBERT_N) % HILBERT_N;
                const iComp = state.buffer[delayedIdx];

                state.bufIdx = (state.bufIdx + 1) % HILBERT_N;

                if (modType === 'AM') {
                    const envelope = Math.sqrt(iComp * iComp + q * q);
                    // DC-блокировка
                    const dcOut = envelope - state.prevDcIn + 0.995 * state.dcBlock;
                    state.prevDcIn = envelope;
                    state.dcBlock = dcOut;
                    output[i] = dcOut;
                } else if (modType === 'FM') {
                    // conj(prev) * current → мгновенная частота
                    const crossI = iComp * state.prevI + q * state.prevQ;
                    const crossQ = q * state.prevI - iComp * state.prevQ;
                    output[i] = Math.atan2(crossQ, crossI) * sampleRate / (2 * Math.PI);
                    state.prevI = iComp;
                    state.prevQ = q;
                } else {
                    // PM: извлечение фазы
                    output[i] = Math.atan2(q, iComp);
                }
            }

            return output;
        }
    }
};

export default AMFMPMDemodulatorPlugin satisfies PluginDefinition;
