/**
 * Фильтр верхних частот (ФВЧ) на основе КИХ-фильтра
 *
 * Назначение:
 *   Пропускает частоты выше заданной частоты среза (cutoff), подавляя
 *   все низкочастотные составляющие. ФВЧ используется для удаления
 *   постоянной составляющей (DC offset), низкочастотных дрейфов,
 *   инфранизких помех и выделения высокочастотных компонентов сигнала.
 *
 * Алгоритм:
 *   Строится на основе оконного sinc-фильтра (windowed sinc) методом
 *   спектральной инверсии ФНЧ: сначала проектируется ФНЧ с частотой
 *   среза cutoff, затем его коэффициенты инвертируются для получения ФВЧ.
 *   Реализация через фабрику createFIRProcessor('highpass') из FIRFilterPlugin.
 *
 * Параметры:
 *   - order (int, по умолчанию 64) — порядок фильтра (количество
 *     коэффициентов). Больший порядок → более крутой скат на частоте
 *     среза. Рекомендуемый диапазон: 16–512. Малые значения (16–32) дают
 *     плавный переход, большие (128–512) — почти идеальный «кирпичный» скат.
 *   - cutoff (float, по умолчанию 1000) — частота среза в Гц.
 *     Частоты ниже cutoff подавляются, выше — проходят без изменений.
 *     Допустимый диапазон: 1 .. sampleRate/2 - 1.
 *   - windowFunction (string, по умолчанию 'hamming') — оконная функция.
 *     Варианты: 'rectangular', 'hamming', 'hanning', 'blackman',
 *     'blackman-harris', 'nuttall', 'flattop'.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array) — сигнал без низкочастотных составляющих
 *
 * Примеры использования:
 *
 *   1. Удаление DC offset:
 *      Constant(0.5) + Sine(1000) → Summer → HighpassFIR(10Hz) → Oscilloscope
 *      Постоянная составляющая 0.5 удалена, синусоида центрирована около нуля.
 *
 *   2. Выделение высокочастотного шума:
 *      AudioFile → HighpassFIR(5000Hz, order=128) → SpectrumAnalyzer
 *      На спектре видны только компоненты выше 5 кГц.
 *
 *   3. Каскад ФВЧ + ФНЧ = полосовой фильтр:
 *      Signal → HighpassFIR(1000Hz) → LowpassFIR(3000Hz) → Oscilloscope
 *      Эквивалент полосового фильтра 1–3 кГц (но менее эффективен,
 *      чем специализированный BandpassFIR).
 */
import type { PluginDefinition } from '../../types';
import { createFIRProcessor } from './FIRFilterPlugin';

export default {
    type: 'ФВЧ КИХ-фильтр',
    id: 'highpass-fir-filter',
    icon: 'dsp-highpass',
    description: 'ФВЧ КИХ-фильтр',
    group: 'filters',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {
        order: 64,
        cutoff: 1000,
        windowFunction: 'hamming',
    },
    processor: createFIRProcessor('highpass')
};
