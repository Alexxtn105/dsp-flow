/**
 * Сумматор (Summer) — Взвешенное сложение действительных сигналов
 *
 * Назначение:
 *   Складывает два (или более) действительных сигнала с заданными весовыми
 *   коэффициентами. Это один из базовых блоков DSP, необходимый для смешивания
 *   сигналов, формирования суммарных/разностных каналов и построения
 *   обратных связей. В аналоговой электронике аналогом является операционный
 *   усилитель в режиме суммирования.
 *
 * Алгоритм:
 *   Для каждого отсчёта: y[n] = w0·x0[n] + w1·x1[n] + ...
 *   После суммирования может применяться нормализация: усреднение (деление
 *   на число активных входов) или пиковая нормализация (деление на максимум
 *   абсолютного значения выходного сигнала в чанке).
 *
 * Параметры:
 *   - numInputs (int, по умолчанию 2) — количество входов сумматора.
 *     Определяет, сколько сигналов можно подключить одновременно.
 *   - weights (массив float, по умолчанию [1.0, 1.0]) — весовые коэффициенты
 *     для каждого входа. Отрицательный вес инвертирует сигнал (вычитание).
 *     Длина массива должна соответствовать numInputs.
 *   - normalization (string, по умолчанию 'none') — режим нормализации:
 *     'none' — без нормализации, выход = взвешенная сумма;
 *     'average' — деление на количество активных входов (среднее);
 *     'peak' — нормализация по пиковому значению (максимум = 1.0).
 *
 * Вход:  real (2 входа, Float32Array)
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Смешивание двух тонов:
 *      Sine(1000 Гц) + Sine(3000 Гц) → Summer → Oscilloscope
 *      На осциллографе видна суперпозиция двух синусоид, на спектре — два пика.
 *
 *   2. Вычитание сигналов (адаптивная компенсация):
 *      Summer(weights: [1.0, -1.0]) — вычитает второй вход из первого.
 *      Полезно для подавления помех: исходный сигнал на первый вход,
 *      оценка помехи на второй.
 *
 *   3. Усреднение каналов:
 *      Summer(normalization: 'average') — среднее двух сигналов.
 *      Применяется для снижения шума при наличии нескольких измерений.
 */
export default {
    type: 'Сумматор',
    id: 'summer',
    icon: 'dsp-sum',
    description: 'Сумматор',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real', inputsCount: 2 } as const,
    defaultParams: {
        numInputs: 2,
        weights: [1.0, 1.0],
        normalization: 'none',
    },
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const output = new Float32Array(chunkSize);
            const weights = (params.weights || []) as number[];
            const normalization = (params.normalization || 'none') as string;

            let activeInputs = 0;
            for (let idx = 0; idx < inputs.length; idx++) {
                const input = inputs[idx];
                if (!input) continue;
                activeInputs++;
                const w = idx < weights.length ? weights[idx] : 1.0;
                for (let i = 0; i < chunkSize; i++) {
                    output[i] += (i < input.length ? input[i] : 0) * w;
                }
            }

            if (normalization === 'average' && activeInputs > 1) {
                for (let i = 0; i < chunkSize; i++) {
                    output[i] /= activeInputs;
                }
            } else if (normalization === 'peak') {
                let peak = 0;
                for (let i = 0; i < chunkSize; i++) {
                    const abs = Math.abs(output[i]);
                    if (abs > peak) peak = abs;
                }
                if (peak > 0) {
                    for (let i = 0; i < chunkSize; i++) {
                        output[i] /= peak;
                    }
                }
            }

            return output;
        }
    }
};
