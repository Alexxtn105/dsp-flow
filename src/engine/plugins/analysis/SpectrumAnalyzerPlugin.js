/**
 * Spectrum Analyzer — Спектральный анализатор (БПФ)
 *
 * Назначение:
 *   Показывает частотный состав входного сигнала в реальном времени.
 *   Любой сигнал можно представить как сумму синусоид разных частот и амплитуд —
 *   спектроанализатор раскладывает сигнал на эти составляющие и отображает их
 *   в виде графика «амплитуда от частоты». Это основной инструмент диагностики
 *   в цифровой обработке сигналов: позволяет увидеть полезный сигнал, шум,
 *   гармоники, помехи и оценить эффективность фильтрации.
 *
 * Алгоритм:
 *   1. Входные отсчёты записываются в кольцевой буфер размером fftSize.
 *   2. При каждом вызове process() содержимое буфера копируется и умножается
 *      на оконную функцию (Blackman-Harris по умолчанию). Окно сглаживает края
 *      блока данных, уменьшая «утечку» спектра (spectral leakage).
 *   3. Выполняется быстрое преобразование Фурье (БПФ/FFT), преобразующее
 *      временной сигнал в частотную область.
 *   4. Из комплексных коэффициентов БПФ вычисляется магнитуда (амплитуда)
 *      каждой частотной составляющей — в децибелах (дБ) или в линейном масштабе.
 *   5. Применяется экспоненциальное усреднение: S[n] = S[n-1] + α·(X[n] - S[n-1]),
 *      где α = 1/averaging. Усреднение сглаживает шумовые выбросы на спектре
 *      ценой замедления отклика на изменения сигнала.
 *
 * Параметры:
 *   - fftSize (int, по умолчанию 2048) — размер БПФ, определяет частотное
 *     разрешение: Δf = sampleRate / fftSize. Должен быть степенью двойки.
 *     Типичные значения: 512, 1024, 2048, 4096, 8192.
 *     Больше → точнее по частоте, но медленнее обновление.
 *   - windowFunction (string, по умолчанию 'blackman-harris') — оконная функция.
 *     Варианты: 'hann', 'hamming', 'blackman', 'blackman-harris', 'rectangular'.
 *     Blackman-Harris обеспечивает наилучшее подавление боковых лепестков (-92 дБ),
 *     но немного расширяет основной лепесток.
 *   - dBScale (boolean, по умолчанию true) — отображение в децибелах.
 *     В дБ удобнее: динамический диапазон 60–100 дБ виден на одном графике.
 *     В линейном масштабе слабые сигналы практически неразличимы.
 *   - averaging (int, по умолчанию 5) — количество кадров экспоненциального
 *     усреднения. 1 = без усреднения (максимальное временное разрешение).
 *     5–10 = сглаженный спектр (удобно для оценки уровня шума).
 *     20+ = сильное усреднение (для стационарных сигналов).
 *
 * Вход:  real (Float32Array — отсчёты вещественного сигнала)
 * Выход: null (блок визуализации, данные передаются в SpectrumView)
 *
 * Примеры использования:
 *
 *   1. Анализ тонального сигнала:
 *      Sine(1000 Гц) → SpectrumAnalyzer
 *      На спектре виден острый пик на частоте 1 кГц, остальные частоты
 *      на уровне шума (-80…-100 дБ). Ширина пика зависит от оконной функции.
 *
 *   2. Оценка фильтрации:
 *      NoiseGenerator → LowpassFIR(cutoff=2000) → SpectrumAnalyzer
 *      Спектр шума обрезан выше 2 кГц — виден характерный «склон» АЧХ фильтра.
 *      Крутизна склона зависит от порядка фильтра.
 *
 *   3. Поиск гармоник:
 *      AudioFile → SpectrumAnalyzer(fftSize=4096, averaging=10)
 *      Увеличенный размер БПФ и усреднение позволяют увидеть тонкую структуру
 *      спектра: основной тон, обертона, призвуки.
 */
import WindowFunctions from '../_shared/WindowFunctions';
import { fft, computeMagnitudeDB } from '../_shared/FFTUtils';

export default {
    type: 'Спектроанализатор',
    id: 'spectrum-analyzer',
    icon: 'dsp-spectrum',
    description: 'Спектральный анализ',
    group: 'visualization',
    signals: { input: 'real', output: null },
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
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize / 2);

            const fftSize = params.fftSize || 2048;
            const windowName = params.windowFunction || 'blackman-harris';
            const windowFunc = WindowFunctions[windowName] || WindowFunctions['blackman-harris'];
            const useDbs = params.dBScale !== false;
            const avgFrames = Math.max(1, params.averaging || 1);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    buffer: new Float32Array(fftSize),
                    pointer: 0,
                    avgSpectrum: null
                });
            }

            const state = this.states.get(nodeId);

            // Пересоздаём буфер при изменении fftSize
            if (state.buffer.length !== fftSize) {
                state.buffer = new Float32Array(fftSize);
                state.pointer = 0;
                state.avgSpectrum = null;
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

            const half = fftSize / 2;
            const currentSpectrum = new Float32Array(half);

            if (useDbs) {
                const dbSpectrum = computeMagnitudeDB(real, imag);
                currentSpectrum.set(dbSpectrum);
            } else {
                // Линейная магнитуда
                for (let i = 0; i < half; i++) {
                    const scale = (i === 0) ? (1 / fftSize) : (2 / fftSize);
                    currentSpectrum[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) * scale;
                }
            }

            // Экспоненциальное усреднение
            if (avgFrames > 1) {
                const alpha = 1 / avgFrames;
                if (!state.avgSpectrum || state.avgSpectrum.length !== half) {
                    state.avgSpectrum = new Float32Array(currentSpectrum);
                } else {
                    for (let i = 0; i < half; i++) {
                        state.avgSpectrum[i] += alpha * (currentSpectrum[i] - state.avgSpectrum[i]);
                    }
                }
                return new Float32Array(state.avgSpectrum);
            }

            return currentSpectrum;
        }
    }
};
