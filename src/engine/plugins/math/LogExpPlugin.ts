/**
 * Логарифм / Экспонента (Log/Exp) — Логарифмические и экспоненциальные функции
 *
 * Назначение:
 *   Применяет одну из пяти математических функций к каждому отсчёту сигнала.
 *   Логарифмические функции используются для перехода к децибельной шкале,
 *   сжатия динамического диапазона и логарифмического масштабирования.
 *   Экспоненциальные — для обратного преобразования (из дБ в линейные
 *   единицы) и моделирования экспоненциальных процессов (затухание, рост).
 *
 * Алгоритм:
 *   - 'ln':    y = ln(max(|x|, ε))        — натуральный логарифм
 *   - 'log10': y = log₁₀(max(|x|, ε))     — десятичный логарифм
 *   - 'dB':    y = 20·log₁₀(max(|x|, ε))  — децибелы (напряжение)
 *   - 'exp':   y = e^(min(x, 88))          — экспонента (с защитой от переполнения)
 *   - 'pow10': y = 10^(min(x, 38))         — степень 10 (с защитой от переполнения)
 *
 *   Для логарифмических функций берётся |x| (модуль) и ограничивается снизу
 *   значением epsilon, чтобы избежать log(0) = -Infinity.
 *   Для экспоненциальных функций аргумент ограничивается сверху для
 *   предотвращения переполнения Float32/Float64.
 *
 * Параметры:
 *   - function (string, по умолчанию 'ln') — выбор функции:
 *     'ln' — натуральный логарифм (основание e ≈ 2.718);
 *     'log10' — десятичный логарифм (основание 10);
 *     'dB' — децибелы: 20·log₁₀(|x|). Для мощности используйте 10·log₁₀;
 *     'exp' — экспонента e^x;
 *     'pow10' — десятичная экспонента 10^x.
 *   - epsilon (float, по умолчанию 1e-10) — минимальное значение аргумента
 *     логарифма. Предотвращает -Infinity при x=0 или очень малых значениях.
 *     Диапазон: 1e-15–1e-3.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Отображение уровня сигнала в дБ:
 *      Сигнал → LogExp(function: 'dB') → NumericIndicator
 *      Показывает мгновенный уровень в децибелах. Значение 0 дБ
 *      соответствует амплитуде 1.0, -20 дБ — амплитуде 0.1.
 *
 *   2. Сжатие динамического диапазона:
 *      AudioFile → LogExp(function: 'log10') → Oscilloscope
 *      Логарифмическое отображение делает видимыми как громкие,
 *      так и тихие участки сигнала.
 *
 *   3. Обратное преобразование из дБ:
 *      Данные в дБ → LogExp(function: 'pow10') → Gain(0.05)
 *      Преобразует дБ обратно в линейный масштаб (с поправкой на 1/20).
 */

const LogExpPlugin = {
    type: 'Логарифм/Экспонента',
    id: 'log-exp',
    icon: 'dsp-log',
    description: 'Логарифмические и экспоненциальные функции',
    group: 'math-blocks',

    signals: {
        input: 'real',
        output: 'real'
    },

    defaultParams: {
        function: 'ln',
        epsilon: 1e-10
    },

    processor: {
        states: new Map<string, Record<string, never>>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const func = (params.function ?? 'ln') as string;
            const eps = (params.epsilon ?? 1e-10) as number;
            const output = new Float32Array(chunkSize);

            for (let i = 0; i < chunkSize; i++) {
                const x = input[i];

                switch (func) {
                    case 'ln':
                        output[i] = Math.log(Math.max(Math.abs(x), eps));
                        break;
                    case 'log10':
                        output[i] = Math.log10(Math.max(Math.abs(x), eps));
                        break;
                    case 'dB':
                        output[i] = 20 * Math.log10(Math.max(Math.abs(x), eps));
                        break;
                    case 'exp':
                        output[i] = Math.exp(Math.min(x, 88));
                        break;
                    case 'pow10':
                        output[i] = Math.pow(10, Math.min(x, 38));
                        break;
                    default:
                        output[i] = x;
                }
            }

            return output;
        }
    }
};

export default LogExpPlugin;
