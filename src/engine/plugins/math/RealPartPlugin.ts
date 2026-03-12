/**
 * Действительная часть (Real Part) — Извлечение Re(z) из комплексного сигнала
 *
 * Назначение:
 *   Извлекает действительную (синфазную, In-phase, I) компоненту
 *   комплексного сигнала. Преобразует комплексный сигнал в действительный,
 *   отбрасывая мнимую часть. Для комплексной экспоненты exp(j2πft)
 *   действительная часть — это cos(2πft). Блок необходим для перехода
 *   от комплексного представления к действительному при выводе на
 *   осциллограф, на Speaker или для подачи на блоки, принимающие
 *   только действительные сигналы.
 *
 * Алгоритм:
 *   output[n] = input[2n]  (чётные элементы interleaved-массива)
 *   Размер выходного массива = входной / 2.
 *
 * Параметры:
 *   Нет параметров.
 *
 * Вход:  complex (interleaved Float32Array [Re0, Im0, Re1, Im1, ...])
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Визуализация I-компоненты:
 *      RefSine(1000 Гц) → RealPart → Oscilloscope
 *      На осциллографе видна косинусоида (или синусоида, в зависимости
 *      от начальной фазы генератора).
 *
 *   2. Переход к действительному сигналу:
 *      Комплексный фильтр → RealPart → Speaker
 *      Для воспроизведения через динамик нужен действительный сигнал.
 *
 *   3. Раздельная обработка I/Q:
 *      Сигнал → RealPart → Обработка_I → [Re]
 *      Сигнал → ImagPart → Обработка_Q → [Im] → ComplexComposer
 *      Позволяет применить разные действительные фильтры к I и Q
 *      компонентам, а затем собрать результат обратно.
 */
export default {
    type: 'Re (действ. часть)',
    id: 'real-part',
    icon: 'dsp-real',
    description: 'Извлечение действительной части комплексного сигнала',
    group: 'math-blocks',
    signals: { input: 'complex', output: 'real' },
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const numSamples = input.length >> 1;
            const output = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                output[i] = input[i * 2];
            }

            return output;
        }
    }
};
