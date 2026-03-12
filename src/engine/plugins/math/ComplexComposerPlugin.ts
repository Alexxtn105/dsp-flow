/**
 * Формирователь комплексного сигнала (Complex Composer) — Re + jIm → Complex
 *
 * Назначение:
 *   Объединяет два действительных сигнала в один комплексный: первый вход
 *   становится действительной частью (Re), второй — мнимой (Im).
 *   Это обратная операция к RealPart/ImagPart. Блок необходим, когда
 *   I и Q компоненты формируются отдельно (например, раздельными
 *   генераторами Sine и Cosine) и их нужно объединить в комплексный
 *   сигнал для дальнейшей обработки (фильтрация, визуализация на
 *   созвездии и т.д.).
 *
 * Алгоритм:
 *   output[2n]     = Re[n]  (действительная часть, верхний вход)
 *   output[2n + 1] = Im[n]  (мнимая часть, нижний вход)
 *   Если один из входов не подключён, соответствующая компонента = 0.
 *
 * Параметры:
 *   Нет параметров.
 *
 * Входы:
 *   - Верхний вход (input 0): Re — действительная часть
 *   - Нижний вход (input 1): Im — мнимая часть
 * Вход:  real (2 входа, Float32Array)
 * Выход: complex (interleaved Float32Array [Re0, Im0, Re1, Im1, ...])
 *
 * Примеры использования:
 *
 *   1. Формирование квадратурного сигнала:
 *      Sine(1000 Гц) + Cosine(1000 Гц) → ComplexComposer → Constellation
 *      На созвездии видна окружность — вектор вращается с частотой 1 кГц.
 *
 *   2. Ручное формирование I/Q:
 *      Генератор_I → [Re], Генератор_Q → [Im] → ComplexComposer → Обработка
 *      Позволяет создать комплексный сигнал из произвольных
 *      действительных компонент.
 *
 *   3. Восстановление комплексного сигнала после раздельной обработки:
 *      Complex → RealPart → Фильтр → [Re]
 *      Complex → ImagPart → Фильтр → [Im] → ComplexComposer
 *      Раздельная фильтрация I и Q с последующим объединением.
 */
export default {
    type: 'Формирователь комплексного',
    id: 'complex-composer',
    icon: 'dsp-complex-compose',
    description: 'Формирует комплексный сигнал из двух действительных (Re + jIm). Верхний вход — действительная часть, нижний — мнимая',
    group: 'math-blocks',
    signals: { input: 'real', output: 'complex', inputsCount: 2 },
    defaultParams: {},
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const re = inputs[0];
            const im = inputs[1];

            if (!re && !im) return new Float32Array(chunkSize * 2);

            const numSamples = re ? re.length : im.length;
            const output = new Float32Array(numSamples * 2);

            for (let i = 0; i < numSamples; i++) {
                output[i * 2] = re ? re[i] : 0;
                output[i * 2 + 1] = im ? im[i] : 0;
            }

            return output;
        }
    }
};
