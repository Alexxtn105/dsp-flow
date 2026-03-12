/**
 * Режекторный (Notch) КИХ-фильтр — подавление узкой полосы частот
 *
 * Назначение:
 *   Удаляет (подавляет) сигнал в узкой полосе вокруг заданной частоты,
 *   пропуская все остальные частоты без изменений. Это противоположность
 *   полосового фильтра: полосовой пропускает только нужную полосу,
 *   а режекторный — убирает нежелательную. Типичное применение —
 *   удаление помехи с известной частотой (сетевая наводка 50/60 Гц,
 *   тональная помеха, пилот-тон и т.п.).
 *
 * Алгоритм:
 *   Фильтр строится методом спектральной инверсии: сначала проектируется
 *   полосовой КИХ-фильтр (windowed sinc) на нужную полосу, затем его
 *   коэффициенты инвертируются по формуле notch[n] = δ[n-center] - bandpass[n].
 *   Результат — фильтр, который вычитает полосовую составляющую из сигнала.
 *   Для точной режекции полосовой фильтр нормализуется так, чтобы его
 *   коэффициент передачи на центральной частоте был равен 1.0.
 *   Порядок фильтра принудительно делается нечётным (Type I линейная фаза)
 *   для целочисленной групповой задержки.
 *
 * Параметры:
 *   - notchFrequency (float, по умолчанию 1000) — центральная частота
 *     режекции в Гц. Именно эта частота будет подавлена максимально.
 *     Допустимый диапазон: 1 .. sampleRate/2 - 1.
 *   - bandwidth (float, по умолчанию 200) — ширина полосы режекции в Гц.
 *     Определяет, насколько широкая область вокруг notchFrequency будет
 *     подавлена. Узкая полоса (50–100 Гц) — точечное удаление тона,
 *     широкая (500+ Гц) — удаление целого диапазона.
 *   - order (int, по умолчанию 65) — порядок фильтра (количество
 *     коэффициентов). Больший порядок → более крутые скаты и глубокая
 *     режекция, но увеличивает задержку и вычислительную нагрузку.
 *     Рекомендуемый диапазон: 31–255. Автоматически округляется до
 *     нечётного значения.
 *   - windowFunction (string, по умолчанию 'hamming') — оконная функция.
 *     Варианты: 'rectangular', 'hamming', 'hanning', 'blackman',
 *     'blackman-harris', 'nuttall', 'flattop'. Окно влияет на ширину
 *     переходной полосы и уровень боковых лепестков. Hamming — хороший
 *     компромисс, Blackman — более глубокое подавление боковых лепестков.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array) — сигнал с подавленной полосой
 *
 * Примеры использования:
 *
 *   1. Удаление тональной помехи:
 *      Sine(1000) + NoiseGenerator → Summer → NotchFIR(1000Hz, bw=200) → Oscilloscope
 *      На осциллографе виден только шум — синусоида 1 кГц удалена.
 *
 *   2. Подавление сетевой наводки 50 Гц:
 *      AudioFile → NotchFIR(50Hz, bw=10, order=127) → Speaker
 *      Узкая полоса и высокий порядок точно убирают наводку,
 *      минимально затрагивая полезный сигнал.
 *
 *   3. Каскад режекторных фильтров:
 *      Signal → NotchFIR(1000Hz) → NotchFIR(2000Hz) → NotchFIR(3000Hz) → Oscilloscope
 *      Последовательное удаление нескольких дискретных помех.
 */
import type { PluginDefinition } from '../../types';
import WindowFunctions from '../_shared/WindowFunctions';
import type { WindowFunctionName } from '../_shared/WindowFunctions';
import { sinc } from '../_shared/FilterDesign';

/**
 * Коэффициенты компенсации переходных полос для каждой оконной функции.
 * Расширяют внутренний bandpass так, чтобы заданная ширина полосы
 * соответствовала области глубокой режекции (≈ -20 дБ).
 * compensation_per_side = factor * sampleRate / order
 */
const TRANSITION_COMPENSATION: Record<string, number> = {
    rectangular: 0.25,
    hamming: 0.90,
    hanning: 1.00,
    blackman: 1.15,
    'blackman-harris': 1.35,
    nuttall: 1.35,
    flattop: 1.90
};

interface NotchState {
    coeffs: Float32Array;
    buffer: Float32Array;
    pointer: number;
    order: number;
    _notchFreq: number;
    _bandwidth: number;
    _order: number;
}

/**
 * Создаёт процессор режекторного (band-reject) КИХ-фильтра.
 * Метод: проектирование нормализованного полосового фильтра + спектральная инверсия.
 * Порядок принудительно делается нечётным для целочисленной групповой задержки.
 */
function createNotchProcessor() {
    return {
        states: new Map<string, NotchState>(),
        clearStates() { this.states.clear(); },

        init(nodeId: string, params: Record<string, unknown>, sampleRate: number) {
            // Нечётный порядок обязателен для линейной фазы Type I
            let order = (params.order as number) || 65;
            if (order % 2 === 0) order += 1;

            const notchFreq = (params.notchFrequency as number) || 1000;
            const bandwidth = (params.bandwidth as number) || 200;
            const windowName = ((params.windowFunction as string) || 'hamming') as WindowFunctionName;

            // Компенсация переходных полос окна: расширяем внутренний bandpass
            const twComp = (TRANSITION_COMPENSATION[windowName] || 0.90) * sampleRate / order;
            const lowCutoff = Math.max(1, notchFreq - bandwidth / 2 - twComp);
            const highCutoff = Math.min(sampleRate / 2 - 1, notchFreq + bandwidth / 2 + twComp);

            const M = order - 1;
            const center = M / 2; // целое число при нечётном order
            const fHigh = highCutoff / sampleRate;
            const fLow = lowCutoff / sampleRate;
            const bpCoeffs = new Float32Array(order);
            const window = WindowFunctions[windowName] || WindowFunctions.rectangular;

            // Проектируем полосовой фильтр (windowed sinc)
            for (let i = 0; i < order; i++) {
                if (i === center) {
                    bpCoeffs[i] = 2 * (fHigh - fLow);
                } else {
                    bpCoeffs[i] = 2 * fHigh * sinc(2 * fHigh * (i - center))
                               - 2 * fLow  * sinc(2 * fLow  * (i - center));
                }
                bpCoeffs[i] *= window(i, order);
            }

            // Нормализация: gain полосового фильтра на центральной частоте = 1.0
            const fc = notchFreq / sampleRate;
            let re = 0, im = 0;
            for (let i = 0; i < order; i++) {
                re += bpCoeffs[i] * Math.cos(2 * Math.PI * fc * i);
                im -= bpCoeffs[i] * Math.sin(2 * Math.PI * fc * i);
            }
            const mag = Math.sqrt(re * re + im * im);
            if (mag > 1e-10) {
                for (let i = 0; i < order; i++) {
                    bpCoeffs[i] /= mag;
                }
            }

            // Спектральная инверсия: notch = δ[n - center] - bandpass[n]
            const coeffs = new Float32Array(order);
            for (let i = 0; i < order; i++) {
                coeffs[i] = -bpCoeffs[i];
            }
            coeffs[center] += 1;

            const buffer = new Float32Array(order);

            this.states.set(nodeId, {
                coeffs,
                buffer,
                pointer: 0,
                order,
                _notchFreq: notchFreq,
                _bandwidth: bandwidth,
                _order: (params.order as number) || 65
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
                const currentNotchFreq = (params.notchFrequency as number) || 1000;
                const currentBandwidth = (params.bandwidth as number) || 200;
                const currentOrder = (params.order as number) || 65;
                if (state._notchFreq !== currentNotchFreq || state._bandwidth !== currentBandwidth || state._order !== currentOrder) {
                    const oldBuffer = state.buffer;
                    const oldPointer = state.pointer;
                    this.init(nodeId, params, sampleRate);
                    state = this.states.get(nodeId)!;
                    if (oldBuffer.length === state.buffer.length) {
                        state.buffer.set(oldBuffer);
                        state.pointer = oldPointer;
                    }
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

export default {
    type: 'Режекторный КИХ-фильтр',
    id: 'notch-fir-filter',
    icon: 'dsp-notch',
    description: 'Режекторный (notch) КИХ-фильтр',
    group: 'filters',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {
        notchFrequency: 1000,
        bandwidth: 200,
        order: 65,
        windowFunction: 'hamming'
    },
    processor: createNotchProcessor()
};
