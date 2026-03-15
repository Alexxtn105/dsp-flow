/**
 * Перемножитель (Multiplier) — Умножение и деление действительных сигналов
 *
 * Назначение:
 *   Перемножает (или делит) два действительных сигнала поэлементно с
 *   дополнительным масштабным коэффициентом. В радиотехнике умножение
 *   сигналов — основа амплитудной модуляции, балансного смешивания и
 *   синхронного детектирования. Если умножить два синусоидальных сигнала
 *   с частотами f1 и f2, в спектре появятся компоненты на частотах
 *   f1+f2 и f1-f2 (тригонометрическое тождество произведения).
 *
 * Алгоритм:
 *   Умножение: y[n] = x0[n] · x1[n] · ... · scaleFactor
 *   Деление:   y[n] = x0[n] / x1[n] / ... · scaleFactor
 *   При делении на ноль результат равен 0 (защита от NaN/Infinity).
 *
 * Параметры:
 *   - numInputs (int, по умолчанию 2) — количество входов.
 *   - operation (string, по умолчанию 'multiply') — тип операции:
 *     'multiply' — поэлементное умножение;
 *     'divide' — поэлементное деление (первый вход делится на остальные).
 *   - scaleFactor (float, по умолчанию 1.0) — масштабный коэффициент,
 *     применяемый к результату. Полезен для компенсации усиления.
 *
 * Вход:  real (2 входа, Float32Array)
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Амплитудная модуляция:
 *      Sine(1000 Гц) × Sine(100 Гц) → Multiplier → SpectrumAnalyzer
 *      На спектре видны две боковые полосы на 900 Гц и 1100 Гц —
 *      классический результат перемножения двух синусоид.
 *
 *   2. Синхронное детектирование:
 *      АМ-сигнал × Sine(несущая) → Multiplier → LowpassFIR → Oscilloscope
 *      Умножение на несущую частоту переносит полезный сигнал
 *      в область низких частот, ФНЧ выделяет огибающую.
 *
 *   3. Управляемый аттенюатор:
 *      Сигнал × Управляющий → Multiplier(scaleFactor: 0.5)
 *      Один сигнал модулирует амплитуду другого.
 */
export default {
    type: 'Перемножитель',
    id: 'multiplier',
    icon: 'dsp-multiply',
    description: 'Перемножитель',
    group: 'real-math',
    signals: { input: 'real', output: 'real', inputsCount: 2 } as const,
    defaultParams: {
        numInputs: 2,
        operation: 'multiply',
        scaleFactor: 1.0,
    },
    processor: {
        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const output = new Float32Array(chunkSize);
            const scale = (params.scaleFactor ?? 1.0) as number;
            const operation = (params.operation || 'multiply') as string;

            if (inputs.length === 0 || !inputs[0]) {
                return output;
            }

            // Начинаем с первого входа
            const first = inputs[0];
            for (let i = 0; i < chunkSize; i++) {
                output[i] = i < first.length ? first[i] : 0;
            }

            // Применяем операцию с каждым последующим входом
            for (let idx = 1; idx < inputs.length; idx++) {
                const inp = inputs[idx];
                if (!inp) continue;
                if (operation === 'divide') {
                    for (let i = 0; i < chunkSize; i++) {
                        const divisor = i < inp.length ? inp[i] : 0;
                        output[i] = divisor !== 0 ? output[i] / divisor : 0;
                    }
                } else {
                    for (let i = 0; i < chunkSize; i++) {
                        output[i] *= (i < inp.length ? inp[i] : 0);
                    }
                }
            }

            // Применяем масштабный коэффициент
            if (scale !== 1.0) {
                for (let i = 0; i < chunkSize; i++) {
                    output[i] *= scale;
                }
            }

            return output;
        }
    }
};
