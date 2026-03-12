/**
 * Фильтр нижних частот (ФНЧ) на основе КИХ-фильтра
 *
 * Назначение:
 *   Пропускает частоты ниже заданной частоты среза (cutoff), подавляя
 *   высокочастотные составляющие. ФНЧ — самый распространённый тип фильтра
 *   в ЦОС. Применяется для сглаживания сигнала, удаления высокочастотного
 *   шума, антиалиасинговой фильтрации перед децимацией, ограничения
 *   полосы сигнала и выделения огибающей.
 *
 * Алгоритм:
 *   Используется метод оконного sinc-фильтра (windowed sinc). Идеальный
 *   ФНЧ имеет импульсную характеристику вида sinc(2*fc*n), которая
 *   бесконечна. Усечение до конечного числа отсчётов (order) и умножение
 *   на оконную функцию даёт практически реализуемый фильтр с управляемым
 *   уровнем боковых лепестков. Реализация через фабрику
 *   createFIRProcessor('lowpass') из FIRFilterPlugin.
 *
 * Параметры:
 *   - order (int, по умолчанию 64) — порядок фильтра (количество
 *     коэффициентов). Больший порядок → более крутой скат и лучшее
 *     подавление, но увеличивает задержку на order/2 отсчётов.
 *     Рекомендуемый диапазон: 16–512.
 *   - cutoff (float, по умолчанию 1000) — частота среза в Гц.
 *     Частоты ниже cutoff проходят, выше — подавляются.
 *     Допустимый диапазон: 1 .. sampleRate/2 - 1.
 *   - windowFunction (string, по умолчанию 'hamming') — оконная функция.
 *     Варианты: 'rectangular', 'hamming', 'hanning', 'blackman',
 *     'blackman-harris', 'nuttall', 'flattop'. Hamming даёт подавление
 *     боковых лепестков ~43 дБ, Blackman ~58 дБ, Blackman-Harris ~92 дБ.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array) — сглаженный сигнал без высокочастотных компонентов
 *
 * Примеры использования:
 *
 *   1. Удаление высокочастотного шума:
 *      Sine(100) + NoiseGenerator → Summer → LowpassFIR(500Hz) → Oscilloscope
 *      Шум подавлен, на осциллографе видна чистая синусоида 100 Гц.
 *
 *   2. Антиалиасинговый фильтр перед децимацией:
 *      AudioFile → LowpassFIR(4000Hz, order=128) → DecimatorInterpolator(factor=4)
 *      ФНЧ ограничивает полосу до 4 кГц перед прореживанием в 4 раза,
 *      предотвращая наложение спектров (aliasing).
 *
 *   3. Выделение огибающей AM-сигнала:
 *      AMFMPMModulator(AM) → AmplitudeDetector → LowpassFIR(100Hz) → Oscilloscope
 *      ФНЧ сглаживает огибающую, убирая остатки несущей частоты.
 */
import type { PluginDefinition } from '../../types';
import { createFIRProcessor } from './FIRFilterPlugin';

export default {
    type: 'ФНЧ КИХ-фильтр',
    id: 'lowpass-fir-filter',
    icon: 'dsp-lowpass',
    description: 'ФНЧ КИХ-фильтр',
    group: 'filters',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {
        order: 64,
        cutoff: 1000,
        windowFunction: 'hamming',
    },
    processor: createFIRProcessor('lowpass')
};
