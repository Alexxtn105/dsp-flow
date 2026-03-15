/**
 * Плагин CFAR-детектора (Cell-Averaging Constant False Alarm Rate)
 *
 * Реализует адаптивный пороговый детектор CA-CFAR для обнаружения целей
 * на фоне шума с заданной вероятностью ложной тревоги:
 *
 *   ┌─────────┬──────────┬─────┬──────────┬─────────┐
 *   │ Training │  Guard   │ CUT │  Guard   │ Training│
 *   │  cells   │  cells   │     │  cells   │  cells  │
 *   └─────────┴──────────┴─────┴──────────┴─────────┘
 *
 * Архитектура:
 *   1. Для каждого тестируемого элемента (CUT — Cell Under Test):
 *      - Пропускаются guardCells защитных ячеек с каждой стороны
 *        (предотвращают утечку энергии цели в оценку шума)
 *      - Усредняется мощность в trainingCells обучающих ячейках с каждой стороны
 *   2. Вычисление масштабного коэффициента:
 *        α = N · (Pfa^(-1/N) - 1),  где N = 2 · trainingCells
 *      Этот коэффициент обеспечивает заданную вероятность ложной тревоги Pfa
 *      при экспоненциальном распределении мощности шума
 *   3. Адаптивный порог:
 *        threshold = averagePower · α
 *   4. Решение: если input[i] > threshold → обнаружение (выход 1.0), иначе 0.0
 *   5. Для краевых элементов, где недостаточно ячеек, выход = 0.0
 *
 * Параметры:
 *   - guardCells: число защитных ячеек с каждой стороны CUT
 *   - trainingCells: число обучающих ячеек с каждой стороны CUT
 *   - pfa: требуемая вероятность ложной тревоги (напр. 1e-4)
 *
 * Вход:  real (Float32Array) — мощность или амплитуда сигнала
 * Выход: real — бинарная маска обнаружений (1.0 = цель, 0.0 = шум)
 *
 * Примеры использования:
 *
 *   1. Обнаружение спектральных пиков:
 *      Sine(1000) + NoiseGenerator → SpectrumAnalyzer → CFARDetector(guard=2, train=10, Pfa=1e-4)
 *      → Oscilloscope
 *      CFAR обнаруживает спектральный пик синусоиды на фоне шума.
 *      Адаптивный порог автоматически подстраивается под уровень шума.
 *
 *   2. Радарный детектор с переменным уровнем помех:
 *      Генератор_целей → AWGNChannel(переменный SNR) → CFARDetector(guard=4, train=16, Pfa=1e-6)
 *      → Oscilloscope
 *      CA-CFAR поддерживает постоянную вероятность ложной тревоги
 *      независимо от изменения уровня шума.
 *
 *   3. Обнаружение импульсов:
 *      Impulse → NoiseGenerator → Summer → CFARDetector(guard=2, train=8, Pfa=1e-3)
 *      → Oscilloscope
 *      Детектор выделяет позиции импульсов в зашумлённом сигнале.
 *      Защитные ячейки предотвращают подавление цели собственной энергией.
 */
import type { PluginDefinition } from '../../types';

const CFARDetectorPlugin = {
    type: 'CFAR-детектор',
    id: 'cfar-detector',
    icon: 'dsp-cfar',
    description: 'Адаптивный пороговый детектор с постоянной вероятностью ложной тревоги',
    group: 'detectors',
    signals: {
        input: 'real' as const,
        output: 'real' as const,
    },
    defaultParams: {
        guardCells: 2,
        trainingCells: 10,
        pfa: 1e-4,
    },
    processor: {
        states: new Map<string, Record<string, never>>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number): { outputs: Float32Array[] } {
            const output = new Float32Array(chunkSize);
            const input = inputs[0];

            if (!input) return { outputs: [output] };

            const guardCells = (params.guardCells ?? 2) as number;
            const trainingCells = (params.trainingCells ?? 10) as number;
            const pfa = (params.pfa ?? 1e-4) as number;

            // Общее число обучающих ячеек (с обеих сторон)
            const N = 2 * trainingCells;

            // Масштабный коэффициент для заданной Pfa:
            //   α = N · (Pfa^(-1/N) - 1)
            const safePfa = Math.max(1e-12, Math.min(pfa, 0.999));
            const scaleFactor = N * (Math.pow(safePfa, -1 / N) - 1);

            // Минимальное расстояние от CUT до края для полного окна
            const windowHalf = guardCells + trainingCells;

            for (let i = 0; i < chunkSize; i++) {
                // Для краевых элементов — недостаточно ячеек
                if (i < windowHalf || i >= chunkSize - windowHalf) {
                    output[i] = 0.0;
                    continue;
                }

                // Усреднение мощности в обучающих ячейках
                let sumPower = 0;
                for (let k = 0; k < trainingCells; k++) {
                    // Левые обучающие ячейки
                    sumPower += input[i - guardCells - 1 - k];
                    // Правые обучающие ячейки
                    sumPower += input[i + guardCells + 1 + k];
                }

                const averagePower = sumPower / N;

                // Адаптивный порог
                const threshold = averagePower * scaleFactor;

                // Решение об обнаружении
                output[i] = input[i] > threshold ? 1.0 : 0.0;
            }

            return { outputs: [output] };
        }
    }
};

export default CFARDetectorPlugin satisfies PluginDefinition;
