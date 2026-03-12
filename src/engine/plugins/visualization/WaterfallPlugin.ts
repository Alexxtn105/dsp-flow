/**
 * Waterfall — Спектрограмма (водопадная диаграмма)
 *
 * Назначение:
 *   Спектрограмма (waterfall, «водопад») — это двумерное отображение спектра
 *   сигнала во времени. По горизонтали — частота, по вертикали — время
 *   (новые данные «текут» сверху вниз), цвет точки — амплитуда на данной
 *   частоте в данный момент. Это позволяет увидеть, как частотный состав
 *   сигнала меняется со временем — то, что обычный спектроанализатор
 *   показать не может (он отображает только текущий «снимок» спектра).
 *
 *   Спектрограмма незаменима для анализа:
 *   - Речи и музыки (видны форманты, гармоники, ритм)
 *   - Сигналов с частотной модуляцией (видна траектория частоты)
 *   - Интерференции и помех (видны кратковременные выбросы)
 *   - Скачкообразной перестройки частоты (frequency hopping)
 *
 * Алгоритм:
 *   Обработка идентична SpectrumAnalyzer:
 *   1. Входные отсчёты записываются в кольцевой буфер размером fftSize.
 *   2. Содержимое буфера умножается на оконную функцию.
 *   3. Выполняется БПФ (FFT).
 *   4. Вычисляется магнитуда в децибелах (computeMagnitudeDB).
 *   Отличие в том, что каждый кадр спектра передаётся в WaterfallView,
 *   который накапливает кадры и отрисовывает двумерную карту «частота × время».
 *
 * Параметры:
 *   - fftSize (int, по умолчанию 2048) — размер БПФ. Определяет частотное
 *     разрешение: Δf = sampleRate / fftSize. Должен быть степенью двойки.
 *     Типичные значения: 512, 1024, 2048, 4096.
 *   - windowFunction (string, по умолчанию 'blackman-harris') — оконная функция.
 *     Варианты: 'hann', 'hamming', 'blackman', 'blackman-harris', 'rectangular'.
 *   - colorMap (string, по умолчанию 'audition') — цветовая карта для отображения
 *     амплитуды. Определяет, какими цветами кодируются уровни сигнала
 *     (например, тёмные цвета = тишина, яркие = сильный сигнал).
 *   - speed (int, по умолчанию 1) — скорость прокрутки водопада.
 *     Большее значение → быстрее обновление, больше временное разрешение,
 *     но короче видимая история.
 *
 * Вход:  real (Float32Array — отсчёты вещественного сигнала)
 * Выход: null (блок визуализации, данные передаются в WaterfallView)
 *
 * Примеры использования:
 *
 *   1. Анализ ЧМ-сигнала:
 *      AMFMPMModulator(FM, deviation=500) → Waterfall
 *      На спектрограмме видна «змейка» — траектория мгновенной частоты,
 *      отклоняющаяся от несущей в такт модулирующему сигналу.
 *
 *   2. Визуализация речи/музыки:
 *      AudioFile(speech.wav) → Waterfall(fftSize=4096)
 *      Видны характерные горизонтальные полосы — форманты голоса,
 *      а также паузы между словами (тёмные участки).
 *
 *   3. Обнаружение кратковременных помех:
 *      Signal → Waterfall(speed=2)
 *      Кратковременная помеха видна как горизонтальная яркая полоса
 *      на определённой частоте в определённый момент времени.
 */
import WindowFunctions from '../_shared/WindowFunctions';
import { fft, computeMagnitudeDB } from '../_shared/FFTUtils';

interface WaterfallState {
    buffer: Float32Array;
    pointer: number;
}

export default {
    type: 'Водопад',
    id: 'waterfall',
    icon: 'dsp-waterfall',
    description: 'Спектрограмма (Водопад)',
    group: 'visualization',
    signals: { input: 'real', output: null } as const,
    defaultParams: {
        fftSize: 2048,
        windowFunction: 'blackman-harris',
        colorMap: 'audition',
        speed: 1
    },
    processor: {
        states: new Map<string, WaterfallState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize / 2);

            const fftSize = (params.fftSize || 2048) as number;
            const windowName = (params.windowFunction || 'blackman-harris') as string;
            const windowFunc = WindowFunctions[windowName as keyof typeof WindowFunctions] || WindowFunctions['blackman-harris'];

            if (!this.states.has(nodeId!)) {
                this.states.set(nodeId!, {
                    buffer: new Float32Array(fftSize),
                    pointer: 0
                });
            }

            const state = this.states.get(nodeId!)!;

            // Пересоздаём буфер при изменении fftSize
            if (state.buffer.length !== fftSize) {
                state.buffer = new Float32Array(fftSize);
                state.pointer = 0;
            }

            const { buffer } = state;
            let { pointer } = state;

            for (let i = 0; i < input.length; i++) {
                buffer[pointer] = input[i];
                pointer = (pointer + 1) % fftSize;
            }
            state.pointer = pointer;

            const processingBuffer = new Float32Array(fftSize);
            for (let i = 0; i < fftSize; i++) {
                processingBuffer[i] = buffer[(pointer + i) % fftSize];
            }

            for (let i = 0; i < fftSize; i++) {
                processingBuffer[i] *= windowFunc(i, fftSize);
            }

            const real = new Float32Array(fftSize);
            const imag = new Float32Array(fftSize);
            real.set(processingBuffer);

            fft(real, imag);
            return computeMagnitudeDB(real, imag);
        }
    }
};
