/**
 * Multi-Channel Spectrum Analyzer — Многоканальный спектроанализатор (4 канала)
 *
 * Назначение:
 *   Четыре независимых спектроанализатора на одном экране. Позволяет
 *   одновременно наблюдать спектры нескольких сигналов — например, сравнивать
 *   спектр до и после фильтрации, анализировать разные ветви обработки
 *   или контролировать несколько каналов связи параллельно.
 *
 *   Каждый канал выполняет полный цикл спектрального анализа независимо:
 *   собственный кольцевой буфер, оконная функция, БПФ и усреднение.
 *   Неподключённые каналы не отображаются.
 *
 * Алгоритм (для каждого канала):
 *   Идентичен одноканальному SpectrumAnalyzer:
 *   1. Входные отсчёты записываются в кольцевой буфер размером fftSize.
 *   2. Содержимое буфера умножается на оконную функцию.
 *   3. Выполняется быстрое преобразование Фурье (БПФ).
 *   4. Вычисляется магнитуда (в дБ или линейная).
 *   5. Применяется экспоненциальное усреднение.
 *   Результаты всех каналов упаковываются в объект {channels: [ch1, ch2, ch3, ch4]}.
 *
 * Параметры:
 *   - fftSize (int, по умолчанию 2048) — размер БПФ для всех каналов.
 *     Определяет частотное разрешение: Δf = sampleRate / fftSize.
 *     Должен быть степенью двойки. Типичные значения: 512, 1024, 2048, 4096.
 *   - windowFunction (string, по умолчанию 'blackman-harris') — оконная функция.
 *     Варианты: 'hann', 'hamming', 'blackman', 'blackman-harris', 'rectangular'.
 *   - dBScale (boolean, по умолчанию true) — отображение в децибелах.
 *   - averaging (int, по умолчанию 5) — количество кадров экспоненциального
 *     усреднения. 1 = без усреднения, 5–10 = сглаженный спектр.
 *
 * Вход:  4× real (до 4 каналов: «Канал 1», «Канал 2», «Канал 3», «Канал 4»)
 * Выход: null (блок визуализации, данные передаются в MultiChannelSpectrumView)
 *
 * Примеры использования:
 *
 *   1. Сравнение спектров до и после фильтрации:
 *      NoiseGenerator → MultiChannelSpectrumAnalyzer (Канал 1)
 *      NoiseGenerator → LowpassFIR(1000) → MultiChannelSpectrumAnalyzer (Канал 2)
 *      На Канале 1 — плоский спектр шума, на Канале 2 — обрезанный фильтром.
 *
 *   2. Мониторинг нескольких сигналов:
 *      Sine(1000) → MultiChannelSpectrumAnalyzer (Канал 1)
 *      Sine(2000) → MultiChannelSpectrumAnalyzer (Канал 2)
 *      Sine(3000) → MultiChannelSpectrumAnalyzer (Канал 3)
 *      Sine(4000) → MultiChannelSpectrumAnalyzer (Канал 4)
 *      Каждый канал показывает пик на своей частоте.
 *
 *   3. Анализ каскада фильтров:
 *      Signal → Filter1 → MultiChannelSpectrumAnalyzer (Канал 1)
 *      Filter1 → Filter2 → MultiChannelSpectrumAnalyzer (Канал 2)
 *      Позволяет оценить вклад каждого фильтра в общую обработку.
 */
import WindowFunctions from '../_shared/WindowFunctions.js';
import { fft, computeMagnitudeDB } from '../_shared/FFTUtils.js';

export default {
    type: 'Многоканальный спектроанализатор',
    id: 'multi-spectrum-analyzer',
    icon: 'dsp-multi-spectrum',
    description: 'Спектральный анализ (4 канала)',
    group: 'visualization',
    signals: {
        input: 'real',
        output: null,
        inputsCount: 4,
        inputLabels: ['Канал 1', 'Канал 2', 'Канал 3', 'Канал 4']
    },
    defaultParams: {
        fftSize: 2048,
        windowFunction: 'blackman-harris',
        dBScale: true,
        averaging: 5,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const fftSize = params.fftSize || 2048;
            const windowName = params.windowFunction || 'blackman-harris';
            const windowFunc = WindowFunctions[windowName] || WindowFunctions['blackman-harris'];
            const useDbs = params.dBScale !== false;
            const avgFrames = Math.max(1, params.averaging || 1);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { channels: [{}, {}, {}, {}] });
            }
            const state = this.states.get(nodeId);

            const channels = [];
            for (let ch = 0; ch < 4; ch++) {
                const input = inputs[ch];
                if (!input) {
                    channels.push(null);
                    continue;
                }

                let chState = state.channels[ch];
                if (!chState.buffer || chState.buffer.length !== fftSize) {
                    chState.buffer = new Float32Array(fftSize);
                    chState.pointer = 0;
                    chState.avgSpectrum = null;
                }

                const { buffer } = chState;
                let { pointer } = chState;

                for (let i = 0; i < input.length; i++) {
                    buffer[pointer] = input[i];
                    pointer = (pointer + 1) % fftSize;
                }
                chState.pointer = pointer;

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

                const half = fftSize / 2;
                const currentSpectrum = new Float32Array(half);

                if (useDbs) {
                    const dbSpectrum = computeMagnitudeDB(real, imag);
                    currentSpectrum.set(dbSpectrum);
                } else {
                    for (let i = 0; i < half; i++) {
                        const scale = (i === 0) ? (1 / fftSize) : (2 / fftSize);
                        currentSpectrum[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) * scale;
                    }
                }

                if (avgFrames > 1) {
                    const alpha = 1 / avgFrames;
                    if (!chState.avgSpectrum || chState.avgSpectrum.length !== half) {
                        chState.avgSpectrum = new Float32Array(currentSpectrum);
                    } else {
                        for (let i = 0; i < half; i++) {
                            chState.avgSpectrum[i] += alpha * (currentSpectrum[i] - chState.avgSpectrum[i]);
                        }
                    }
                    channels.push(new Float32Array(chState.avgSpectrum));
                } else {
                    channels.push(currentSpectrum);
                }
            }

            return { channels };
        }
    }
};
