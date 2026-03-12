/**
 * Фабрика КИХ-процессоров (FIR Filter Factory)
 *
 * Назначение:
 *   Этот модуль — не плагин, а фабричная функция createFIRProcessor(),
 *   которая создаёт процессоры для КИХ-фильтров разных типов: ФНЧ (lowpass),
 *   ФВЧ (highpass) и полосовой (bandpass). Используется плагинами
 *   LowpassFIRPlugin, HighpassFIRPlugin и BandpassFIRPlugin.
 *
 * Алгоритм:
 *   Все фильтры проектируются методом «оконный sinc» (windowed sinc design):
 *   1. Вычисляется идеальная импульсная характеристика — функция sinc,
 *      масштабированная по частоте среза. Для полосового фильтра это
 *      разность двух sinc-функций (верхняя частота минус нижняя).
 *   2. Импульсная характеристика умножается на оконную функцию (Hamming,
 *      Blackman и др.), чтобы уменьшить боковые лепестки в частотной
 *      характеристике.
 *   3. Результат — массив коэффициентов (Float32Array), который применяется
 *      к входному сигналу через прямую свёртку с использованием кольцевого
 *      буфера для эффективности.
 *
 *   КИХ-фильтры (FIR — Finite Impulse Response) имеют конечную импульсную
 *   характеристику и гарантируют линейную фазовую характеристику при
 *   симметричных коэффициентах. Это означает, что все частоты задерживаются
 *   одинаково — форма сигнала не искажается.
 *
 * Параметры (передаются через params конкретного плагина):
 *   - order (int, по умолчанию 31) — порядок фильтра. Определяет количество
 *     коэффициентов и, соответственно, крутизну ската. Задержка = order/2 отсчётов.
 *   - cutoff / cutoffFrequency / frequency (float, по умолчанию 1000) — частота
 *     среза в Гц. Для полосового фильтра используются lowCutoff и highCutoff.
 *   - windowFunction (string, по умолчанию 'hamming') — оконная функция.
 *   - filterType (string) — тип фильтра, если не задан фиксированный тип
 *     через параметр фабрики. Варианты: 'lowpass', 'highpass', 'bandpass'.
 *
 * Особенности реализации:
 *   - Каждый вызов createFIRProcessor() создаёт независимый объект
 *     процессора со своим Map состояний (states).
 *   - При изменении параметров (частота среза, порядок, тип) коэффициенты
 *     пересчитываются автоматически, состояние буфера сбрасывается.
 *   - Фильтрация выполняется через кольцевой буфер (circular buffer)
 *     для минимизации копирования данных.
 */
import type { PluginDefinition } from '../../types';
import WindowFunctions from '../_shared/WindowFunctions';
import { sinc, designWindowedSinc } from '../_shared/FilterDesign';
import type { FilterType } from '../_shared/FilterDesign';
import type { WindowFunctionName } from '../_shared/WindowFunctions';

interface FIRState {
    coeffs: Float32Array;
    buffer: Float32Array;
    pointer: number;
    order: number;
    _cutoff: number;
    _order: number;
    _filterType: string;
}

export function createFIRProcessor(fixedFilterType?: string) {
    return {
        states: new Map<string, FIRState>(),
        clearStates() { this.states.clear(); },

        init(nodeId: string, params: Record<string, unknown>, sampleRate: number) {
            const order = (params.order as number) || 31;
            const cutoff = (params.cutoffFrequency as number) || (params.cutoff as number) || (params.frequency as number) || 1000;
            const type = fixedFilterType || (params.filterType as string) || 'lowpass';
            const windowName = ((params.windowFunction as string) || 'hamming') as WindowFunctionName;

            let coeffs: Float32Array;

            if (type === 'bandpass') {
                const lowCutoff = (params.lowCutoff as number) || cutoff * 0.8;
                const highCutoff = (params.highCutoff as number) || cutoff * 1.2;

                const M = order - 1;
                const fHigh = highCutoff / sampleRate;
                const fLow = lowCutoff / sampleRate;
                coeffs = new Float32Array(order);
                const window = WindowFunctions[windowName] || WindowFunctions.rectangular;

                for (let i = 0; i < order; i++) {
                    if (i === M / 2) {
                        coeffs[i] = 2 * (fHigh - fLow);
                    } else {
                        coeffs[i] = 2 * fHigh * sinc(2 * fHigh * (i - M / 2)) - 2 * fLow * sinc(2 * fLow * (i - M / 2));
                    }
                    coeffs[i] *= window(i, order);
                }
            } else {
                coeffs = designWindowedSinc(type as FilterType, cutoff, sampleRate, order, windowName);
            }

            const buffer = new Float32Array(order);

            this.states.set(nodeId, {
                coeffs,
                buffer,
                pointer: 0,
                order,
                _cutoff: cutoff,
                _order: order,
                _filterType: type
            });
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            let state = this.states.get(nodeId);
            const sampleRate = (params.sampleRate as number) || 48000;

            if (!state) {
                this.init(nodeId, params, sampleRate);
                state = this.states.get(nodeId)!;
            } else {
                // Проверяем, изменились ли параметры — пересчитываем коэффициенты
                const currentCutoff = (params.cutoffFrequency as number) || (params.cutoff as number) || (params.frequency as number) || 1000;
                const currentOrder = (params.order as number) || 31;
                const currentFilterType = fixedFilterType || (params.filterType as string) || 'lowpass';
                if (state._cutoff !== currentCutoff || state._order !== currentOrder || state._filterType !== currentFilterType) {
                    this.init(nodeId, params, sampleRate);
                    state = this.states.get(nodeId)!;
                }
            }

            const { coeffs, buffer, order } = state;
            const output = new Float32Array(input.length);
            let { pointer } = state;
            const bufferLen = buffer.length;

            for (let i = 0; i < input.length; i++) {
                buffer[pointer] = input[i];

                let acc = 0;
                let p = pointer;

                for (let j = 0; j < order; j++) {
                    acc += coeffs[j] * buffer[p];
                    p--;
                    if (p < 0) p = bufferLen - 1;
                }

                output[i] = acc;

                pointer++;
                if (pointer >= bufferLen) pointer = 0;
            }

            state.pointer = pointer;
            return output;
        }
    };
}
