/**
 * Фильтр Ремеза — оптимальный полосовой КИХ-фильтр
 *
 * Назначение:
 *   Полосовой фильтр, спроектированный алгоритмом Ремеза (Parks-McClellan).
 *   В отличие от оконного sinc-метода (BandpassFIR), алгоритм Ремеза
 *   минимизирует максимальную ошибку (equiripple design): пульсации
 *   в полосе пропускания и полосе задерживания равномерно распределены
 *   и имеют одинаковую амплитуду. Это даёт оптимальный фильтр при
 *   заданном порядке — более крутые скаты и лучшее подавление, чем
 *   у оконного метода с тем же числом коэффициентов.
 *
 * Алгоритм:
 *   Алгоритм Паркса-Макклеллана (Remez exchange) — итерационный метод
 *   проектирования КИХ-фильтров с линейной фазой. На каждой итерации:
 *   1. Находятся экстремумы (точки максимальной ошибки) в частотной
 *      характеристике.
 *   2. Коэффициенты пересчитываются так, чтобы ошибка стала равномерной.
 *   3. Процесс повторяется до сходимости.
 *   Порядок принудительно делается нечётным (Type I линейная фаза).
 *
 *   Преимущества перед оконным sinc: при одинаковом порядке фильтра
 *   Ремез даёт более крутые скаты и глубокое подавление. Недостаток:
 *   проектирование медленнее (итерационный алгоритм).
 *
 * Параметры:
 *   - order (int, по умолчанию 101) — порядок фильтра. Автоматически
 *     округляется до нечётного. Больший порядок → более крутые скаты.
 *     Рекомендуемый диапазон: 31–501. Вычисление коэффициентов при
 *     больших порядках может занять заметное время.
 *   - lowCutoff (float, по умолчанию 1000) — нижняя граница полосы
 *     пропускания в Гц.
 *   - highCutoff (float, по умолчанию 3000) — верхняя граница полосы
 *     пропускания в Гц.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array) — отфильтрованный сигнал в заданной полосе
 *
 * Примеры использования:
 *
 *   1. Точная полосовая фильтрация:
 *      AudioFile → Remez(1000–3000Hz, order=101) → SpectrumAnalyzer
 *      На спектре видны очень крутые скаты на границах полосы и
 *      равномерные пульсации в полосе пропускания.
 *
 *   2. Сравнение с оконным фильтром:
 *      Signal → BandpassFIR(1000–3000Hz, order=64)  → SpectrumAnalyzer
 *      Signal → Remez(1000–3000Hz, order=64)         → SpectrumAnalyzer
 *      При одинаковом порядке Ремез показывает лучшее подавление
 *      за полосой пропускания.
 *
 *   3. Фильтрация речи в шумном канале:
 *      AudioFile + NoiseGenerator → Summer → Remez(300–3400Hz, order=151) → Speaker
 *      Оптимальный фильтр максимально подавляет шум за пределами
 *      речевого диапазона.
 */
import { designRemezBandpass } from '../_shared/FilterDesign';

function createRemezProcessor() {
    return {
        states: new Map(),
        clearStates() { this.states.clear(); },

        init(nodeId, params, sampleRate) {
            let order = params.order || 101;
            if (order % 2 === 0) order += 1; // нечётный для Type I линейной фазы
            const lowCutoff = params.lowCutoff || 1000;
            const highCutoff = params.highCutoff || 3000;

            const coeffs = designRemezBandpass(lowCutoff, highCutoff, sampleRate, order);
            const buffer = new Float32Array(order);

            this.states.set(nodeId, {
                coeffs,
                buffer,
                pointer: 0,
                order,
                _lowCutoff: lowCutoff,
                _highCutoff: highCutoff,
                _order: order
            });
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            let state = this.states.get(nodeId);
            const sampleRate = params.sampleRate || 48000;

            if (!state) {
                this.init(nodeId, params, sampleRate);
                state = this.states.get(nodeId);
            } else {
                const currentLowCutoff = params.lowCutoff || 1000;
                const currentHighCutoff = params.highCutoff || 3000;
                const currentOrder = params.order || 64;
                if (state._lowCutoff !== currentLowCutoff || state._highCutoff !== currentHighCutoff || state._order !== currentOrder) {
                    const oldBuffer = state.buffer;
                    const oldPointer = state.pointer;
                    this.init(nodeId, params, sampleRate);
                    state = this.states.get(nodeId);
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
    type: 'Фильтр Ремеза',
    id: 'remez-filter',
    icon: 'dsp-remez',
    description: 'Полосовой КИХ-фильтр (алгоритм Паркс-Макклеллана / Ремеза)',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        order: 101,
        lowCutoff: 1000,
        highCutoff: 3000,
    },
    processor: createRemezProcessor()
};
