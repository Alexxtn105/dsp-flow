/**
 * БИХ-фильтр (IIR) — фильтр с бесконечной импульсной характеристикой
 *
 * Назначение:
 *   Реализует цифровые фильтры с обратной связью (рекурсивные). В отличие от
 *   КИХ-фильтров (FIR), у которых выход зависит только от входных отсчётов,
 *   БИХ-фильтр использует и свои предыдущие выходные значения. Благодаря этому
 *   БИХ-фильтр обеспечивает значительно более крутые скаты при малом порядке:
 *   фильтр 4-го порядка Баттерворта даёт скат 80 дБ/декаду, тогда как
 *   КИХ-фильтру для аналогичного подавления потребовались бы сотни коэффициентов.
 *
 *   Недостаток БИХ по сравнению с КИХ: нелинейная фазовая характеристика —
 *   разные частоты задерживаются на разное время, что может искажать форму
 *   сигнала. Если линейная фаза критична (например, в аудио), лучше
 *   использовать КИХ-фильтры (LowpassFIR, HighpassFIR и др.).
 *
 * Алгоритм:
 *   Поддерживаются два классических дизайна аналоговых фильтров-прототипов:
 *
 *   Баттерворт (Butterworth):
 *     Максимально плоская АЧХ в полосе пропускания — без пульсаций.
 *     Скат: order × 20 дБ/декаду. Оптимальный выбор для большинства задач.
 *
 *   Чебышев I (Chebyshev Type I):
 *     Более крутой скат, чем Баттерворт, при том же порядке, но ценой
 *     равномерных пульсаций в полосе пропускания. Параметр ripple (дБ)
 *     задаёт допустимую амплитуду пульсаций.
 *
 *   Аналоговый прототип преобразуется в цифровой фильтр методом билинейного
 *   преобразования (bilinear transform) с предварительным варпингом частоты
 *   (frequency prewarping) для точного соответствия частоты среза.
 *
 *   Реализация — каскад биквадратных секций (biquad, Second-Order Sections / SOS).
 *   Каждая секция — фильтр 2-го порядка с 5 коэффициентами (b0, b1, b2, a1, a2).
 *   Каскадирование обеспечивает числовую стабильность даже при высоких порядках.
 *   ФВЧ проектируется через прямую трансформацию прототипа (s → ωc/s).
 *
 * Параметры:
 *   - filterDesign (string, по умолчанию 'butterworth') — тип фильтра:
 *     'butterworth' — максимально плоская АЧХ,
 *     'chebyshev1' — более крутой скат с пульсациями в полосе пропускания.
 *   - filterType (string, по умолчанию 'lowpass') — тип фильтрации:
 *     'lowpass' — ФНЧ (пропускает низкие, подавляет высокие),
 *     'highpass' — ФВЧ (пропускает высокие, подавляет низкие).
 *   - cutoffFrequency (float, по умолчанию 1000) — частота среза в Гц.
 *     На этой частоте коэффициент передачи = -3 дБ (Баттерворт) или
 *     = -ripple дБ (Чебышев). Диапазон: 1 .. sampleRate/2 - 1.
 *   - order (int, по умолчанию 4) — порядок фильтра. Определяет крутизну
 *     ската и количество biquad-секций (ceil(order/2)). Допустимый диапазон:
 *     1–10. Порядки выше 8 могут вносить числовые артефакты.
 *   - ripple (float, по умолчанию 1) — амплитуда пульсаций в полосе
 *     пропускания в дБ (только для Чебышева I). Меньшие значения (0.1–0.5) —
 *     минимальные пульсации, но менее крутой скат. Большие (1–3) — крутой
 *     скат, но заметные пульсации. Для Баттерворта этот параметр игнорируется.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array) — отфильтрованный сигнал
 *
 * Примеры использования:
 *
 *   1. Резкий ФНЧ малым порядком:
 *      NoiseGenerator → IIRFilter(butterworth, lowpass, 2000Hz, order=6) → SpectrumAnalyzer
 *      Баттерворт 6-го порядка даёт скат 120 дБ/декаду — на спектре
 *      видна почти вертикальная стенка на 2 кГц.
 *
 *   2. Сравнение Баттерворта и Чебышева:
 *      Signal → IIR(butterworth, lowpass, 1000Hz, order=4) → SpectrumAnalyzer
 *      Signal → IIR(chebyshev1, lowpass, 1000Hz, order=4, ripple=1) → SpectrumAnalyzer
 *      Чебышев показывает более крутой скат, но с пульсациями ±1 дБ
 *      в полосе 0–1000 Гц.
 *
 *   3. ФВЧ для удаления постоянной составляющей:
 *      AudioFile → IIRFilter(butterworth, highpass, 20Hz, order=2) → Speaker
 *      Лёгкий ФВЧ 2-го порядка убирает DC и инфразвук, минимально
 *      влияя на звуковой сигнал.
 */
import type { PluginDefinition } from '../../types';

interface BiquadSection {
    b0: number;
    b1: number;
    b2: number;
    a1: number;
    a2: number;
}

interface BiquadState {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}

interface IIRState {
    sections: BiquadSection[] | null;
    biquadStates: BiquadState[] | null;
    tempBuf: Float32Array;
    lastKey: string;
}

function designButterworthBiquads(order: number, fc: number, sampleRate: number, isHighpass: boolean): BiquadSection[] {
    const sections: BiquadSection[] = [];
    const numSections = Math.floor(order / 2);
    // Prewarp: цифровая частота → аналоговая
    const warpedFc = Math.tan(Math.PI * Math.min(fc, sampleRate * 0.499) / sampleRate);

    for (let k = 0; k < numSections; k++) {
        const theta = (Math.PI * (2 * k + 1)) / (2 * order);
        const sinT = Math.sin(theta);

        if (isHighpass) {
            // ФВЧ: s → wc/s
            const K = warpedFc;
            const norm = K * K + 2 * sinT * K + 1;
            sections.push({
                b0: 1 / norm,
                b1: -2 / norm,
                b2: 1 / norm,
                a1: 2 * (K * K - 1) / norm,
                a2: (K * K - 2 * sinT * K + 1) / norm
            });
        } else {
            const K = warpedFc;
            const K2 = K * K;
            const norm = 1 + 2 * sinT * K + K2;
            sections.push({
                b0: K2 / norm,
                b1: 2 * K2 / norm,
                b2: K2 / norm,
                a1: 2 * (K2 - 1) / norm,
                a2: (1 - 2 * sinT * K + K2) / norm
            });
        }
    }

    if (order % 2 === 1) {
        const K = warpedFc;
        if (isHighpass) {
            const norm = K + 1;
            sections.push({
                b0: 1 / norm,
                b1: -1 / norm,
                b2: 0,
                a1: (K - 1) / norm,
                a2: 0
            });
        } else {
            const norm = 1 + K;
            sections.push({
                b0: K / norm,
                b1: K / norm,
                b2: 0,
                a1: (K - 1) / norm,
                a2: 0
            });
        }
    }

    return sections;
}

function designChebyshev1Biquads(order: number, fc: number, sampleRate: number, rippleDb: number, isHighpass: boolean): BiquadSection[] {
    const eps = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
    const sections: BiquadSection[] = [];
    const numSections = Math.floor(order / 2);
    const mu = (1 / order) * Math.asinh(1 / eps);
    const warpedFc = Math.tan(Math.PI * Math.min(fc, sampleRate * 0.499) / sampleRate);

    for (let k = 0; k < numSections; k++) {
        const theta = (Math.PI * (2 * k + 1)) / (2 * order);
        const sigma = -Math.sinh(mu) * Math.sin(theta);
        const omega = Math.cosh(mu) * Math.cos(theta);
        const pMag2 = sigma * sigma + omega * omega;

        const K = warpedFc;
        const K2 = K * K;

        if (isHighpass) {
            const norm = 1 - 2 * sigma * K + pMag2 * K2;
            sections.push({
                b0: 1 / norm,
                b1: -2 / norm,
                b2: 1 / norm,
                a1: 2 * (pMag2 * K2 - 1) / norm,
                a2: (1 + 2 * sigma * K + pMag2 * K2) / norm
            });
        } else {
            const norm = 1 - 2 * sigma * K + pMag2 * K2;
            sections.push({
                b0: (pMag2 * K2) / norm,
                b1: (2 * pMag2 * K2) / norm,
                b2: (pMag2 * K2) / norm,
                a1: (2 * (pMag2 * K2 - 1)) / norm,
                a2: (1 + 2 * sigma * K + pMag2 * K2) / norm
            });
        }
    }

    if (order % 2 === 1) {
        const K = warpedFc;
        const sigma = -Math.sinh(mu);

        if (isHighpass) {
            const norm = 1 - sigma * K;
            sections.push({
                b0: 1 / norm,
                b1: -1 / norm,
                b2: 0,
                a1: (sigma * K - 1 + 2) / norm,
                a2: 0
            });
        } else {
            const norm = 1 - sigma * K;
            sections.push({
                b0: (-sigma * K) / norm,
                b1: (-sigma * K) / norm,
                b2: 0,
                a1: (sigma * K + 1 - 2) / norm,
                a2: 0
            });
        }
    }

    // Нормализация DC/Nyquist gain
    if (sections.length > 0) {
        let gain = 1;
        if (isHighpass) {
            // Nyquist gain (z = -1)
            for (const s of sections) {
                gain *= (s.b0 - s.b1 + s.b2) / (1 - s.a1 + s.a2);
            }
        } else {
            // DC gain (z = 1)
            for (const s of sections) {
                const denom = 1 + s.a1 + s.a2;
                gain *= denom !== 0 ? (s.b0 + s.b1 + s.b2) / denom : 1;
            }
        }
        if (Math.abs(gain) > 1e-10) {
            const correction = 1 / Math.abs(gain);
            sections[0].b0 *= correction;
            sections[0].b1 *= correction;
            sections[0].b2 *= correction;
        }
    }

    return sections;
}

function applyBiquadCascade(input: Float32Array, sections: BiquadSection[], states: BiquadState[], tempBuf: Float32Array): Float32Array {
    let signal: Float32Array = input;
    for (let s = 0; s < sections.length; s++) {
        const sec = sections[s];
        const st = states[s];
        const output = (s === sections.length - 1) ? tempBuf : new Float32Array(signal.length);

        for (let i = 0; i < signal.length; i++) {
            const x = signal[i];
            const y = sec.b0 * x + sec.b1 * st.x1 + sec.b2 * st.x2
                     - sec.a1 * st.y1 - sec.a2 * st.y2;
            st.x2 = st.x1;
            st.x1 = x;
            st.y2 = st.y1;
            st.y1 = y;
            output[i] = y;
        }
        signal = output;
    }
    return signal;
}

const IIRFilterPlugin = {
    type: 'БИХ-фильтр',
    id: 'iir-filter',
    icon: 'dsp-iir',
    description: 'IIR-фильтр (Баттерворт / Чебышев I)',
    group: 'filters',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        filterDesign: 'butterworth',
        filterType: 'lowpass',
        cutoffFrequency: 1000,
        order: 4,
        ripple: 1
    },

    processor: {
        states: new Map<string, IIRState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const sampleRate = (params.sampleRate as number) ?? 48000;
            const fc = (params.cutoffFrequency as number) ?? 1000;
            const order = Math.max(1, Math.min((params.order as number) ?? 4, 10));
            const design = (params.filterDesign as string) ?? 'butterworth';
            const fType = (params.filterType as string) ?? 'lowpass';
            const ripple = (params.ripple as number) ?? 1;
            const isHighpass = fType === 'highpass';

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    sections: null,
                    biquadStates: null,
                    tempBuf: new Float32Array(chunkSize),
                    lastKey: ''
                });
            }
            const state = this.states.get(nodeId)!;

            const key = `${design}_${fType}_${fc}_${order}_${ripple}_${sampleRate}`;
            if (state.lastKey !== key) {
                let sections: BiquadSection[];
                if (design === 'chebyshev1') {
                    sections = designChebyshev1Biquads(order, fc, sampleRate, ripple, isHighpass);
                } else {
                    sections = designButterworthBiquads(order, fc, sampleRate, isHighpass);
                }

                state.sections = sections;
                state.biquadStates = sections.map(() => ({ x1: 0, x2: 0, y1: 0, y2: 0 }));
                state.tempBuf = new Float32Array(chunkSize);
                state.lastKey = key;
            }

            return applyBiquadCascade(input, state.sections!, state.biquadStates!, state.tempBuf);
        }
    }
};

export default IIRFilterPlugin;
