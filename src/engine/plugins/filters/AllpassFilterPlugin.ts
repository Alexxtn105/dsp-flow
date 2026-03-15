/**
 * Allpass-фильтр — фазовращатель с единичной амплитудной характеристикой
 *
 * Назначение:
 *   Реализует цифровой фильтр, который пропускает все частоты без изменения
 *   амплитуды (|H(f)| = 1 для всех частот), но изменяет фазовые соотношения
 *   между частотными компонентами сигнала. Allpass-фильтры — фундаментальный
 *   строительный блок для фазовых эквалайзеров, ревербераторов, фейзеров
 *   и систем коррекции групповой задержки.
 *
 * Алгоритм:
 *   Биквадратная (biquad) секция 2-го порядка allpass:
 *     w0 = 2 * PI * fc / sampleRate
 *     alpha = sin(w0) / (2 * Q)     (Q = параметр bandwidth)
 *     b0 = 1 - alpha,  b1 = -2*cos(w0),  b2 = 1 + alpha
 *     a0 = 1 + alpha,  a1 = -2*cos(w0),  a2 = 1 - alpha
 *     Все коэффициенты нормализуются делением на a0.
 *
 *   Для порядков выше 2 используется каскад biquad-секций (order/2 секций),
 *   каждая с одинаковым дизайном. Это обеспечивает более крутой фазовый
 *   переход вблизи центральной частоты.
 *
 * Параметры:
 *   - centerFrequency (float, по умолчанию 1000) — центральная частота
 *     фазового перехода в Гц. На этой частоте фазовый сдвиг = -180° (для
 *     одной секции 2-го порядка). Диапазон: 1 .. sampleRate/2.
 *   - bandwidth (float, по умолчанию 1.0) — добротность Q, определяющая
 *     крутизну фазового перехода. Большие значения — более резкий переход.
 *     Малые (< 0.5) — плавный фазовый сдвиг.
 *   - order (int, по умолчанию 2) — порядок фильтра. Определяет количество
 *     каскадных biquad-секций (order/2). Чётные значения: 2, 4, 6...
 *     Каждая секция добавляет 360° суммарного фазового диапазона.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array) — сигнал с изменённой фазой, амплитуда сохранена
 *
 * Примеры использования:
 *
 *   1. Фейзер-эффект:
 *      AudioFile → AllpassFilter(fc=500Hz, Q=1.0, order=4) → Mixer(с сухим) → Speaker
 *      Смешивание исходного сигнала с allpass-обработанным создаёт
 *      характерные «ноздревые» провалы (notches) в спектре.
 *
 *   2. Коррекция групповой задержки:
 *      Signal → IIRFilter(lowpass) → AllpassFilter(fc=1000Hz, Q=0.7) → Oscilloscope
 *      Allpass компенсирует нелинейную фазу БИХ-фильтра, выравнивая
 *      групповую задержку в полосе пропускания.
 *
 *   3. Анализ фазовых свойств:
 *      Chirp → AllpassFilter(fc=2000Hz, Q=2.0, order=6) → SpectrumAnalyzer
 *      На спектре амплитуда остаётся плоской, а на фазовом графике
 *      виден крутой переход вблизи 2 кГц.
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

interface AllpassState {
    sections: BiquadSection[] | null;
    biquadStates: BiquadState[] | null;
    lastKey: string;
}

function designAllpassBiquads(fc: number, Q: number, order: number, sampleRate: number): BiquadSection[] {
    const numSections = Math.max(1, Math.floor(order / 2));
    const w0 = 2 * Math.PI * Math.min(fc, sampleRate * 0.499) / sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const alpha = sinW0 / (2 * Q);

    const a0 = 1 + alpha;
    const section: BiquadSection = {
        b0: (1 - alpha) / a0,
        b1: (-2 * cosW0) / a0,
        b2: (1 + alpha) / a0,
        a1: (-2 * cosW0) / a0,
        a2: (1 - alpha) / a0
    };

    const sections: BiquadSection[] = [];
    for (let i = 0; i < numSections; i++) {
        sections.push({ ...section });
    }
    return sections;
}

function applyBiquadCascade(input: Float32Array, sections: BiquadSection[], states: BiquadState[]): Float32Array {
    let signal: Float32Array = input;
    for (let s = 0; s < sections.length; s++) {
        const sec = sections[s];
        const st = states[s];
        const output = new Float32Array(signal.length);

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

const AllpassFilterPlugin = {
    type: 'Allpass-фильтр',
    id: 'allpass-filter',
    icon: 'dsp-allpass',
    description: 'Allpass-фильтр (фазовый сдвиг, |H(f)| = 1)',
    group: 'filters',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        centerFrequency: 1000,
        bandwidth: 1.0,
        order: 2
    },

    processor: {
        states: new Map<string, AllpassState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const sampleRate = (params.sampleRate as number) ?? 48000;
            const fc = (params.centerFrequency as number) ?? 1000;
            const Q = Math.max(0.01, (params.bandwidth as number) ?? 1.0);
            const order = Math.max(2, Math.min((params.order as number) ?? 2, 20));

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    sections: null,
                    biquadStates: null,
                    lastKey: ''
                });
            }
            const state = this.states.get(nodeId)!;

            const key = `${fc}_${Q}_${order}_${sampleRate}`;
            if (state.lastKey !== key) {
                const sections = designAllpassBiquads(fc, Q, order, sampleRate);
                state.sections = sections;
                state.biquadStates = sections.map(() => ({ x1: 0, x2: 0, y1: 0, y2: 0 }));
                state.lastKey = key;
            }

            return applyBiquadCascade(input, state.sections!, state.biquadStates!);
        }
    }
};

export default AllpassFilterPlugin satisfies PluginDefinition;
