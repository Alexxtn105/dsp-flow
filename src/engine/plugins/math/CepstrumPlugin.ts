/**
 * Cepstrum — Вещественный кепстр сигнала
 *
 * Назначение:
 *   Кепстр (cepstrum) — результат обратного преобразования Фурье от логарифма
 *   спектра мощности сигнала. Название «cepstrum» — анаграмма слова «spectrum»,
 *   отражающая «спектр спектра». Кепстр работает в области квефренсии (quefrency),
 *   которая имеет размерность времени.
 *
 *   Кепстр позволяет разделить компоненты сигнала, которые являются свёрткой
 *   в временной области (и умножением в частотной). Логарифм превращает
 *   произведение спектров в сумму, а обратное БПФ разделяет их по квефренсии.
 *
 *   Типичные применения:
 *   - Определение основного тона (pitch detection): периодический сигнал даёт
 *     выраженный пик кепстра на квефренсии, равной периоду основного тона.
 *   - Анализ речи: разделение источника возбуждения (голосовые связки) и
 *     формантной структуры (голосовой тракт).
 *   - Обнаружение эхо: отражённый сигнал проявляется как пик в кепстре
 *     на квефренсии, равной задержке эхо.
 *   - Анализ вибраций: выявление периодических компонент в спектре.
 *
 * Алгоритм:
 *   Вещественный кепстр вычисляется по формуле:
 *     c[n] = Re(IFFT(log(|FFT(w·x)|² + ε)))
 *   Шаги:
 *   1. К входному сигналу применяется окно Ханна для уменьшения спектральных утечек.
 *   2. Сигнал дополняется нулями до ближайшей степени двойки (zero-padding).
 *   3. Вычисляется БПФ (FFT) оконного сигнала.
 *   4. Для каждого бина вычисляется log(|X[k]|² + ε), где ε = 1e-20
 *      предотвращает log(0).
 *   5. Вычисляется обратное БПФ (IFFT) логарифмического спектра мощности.
 *   6. Берётся вещественная часть результата — это и есть вещественный кепстр.
 *
 * Параметры:
 *   - windowSize (int, по умолчанию 1024) — размер окна анализа.
 *     Должен быть степенью двойки для оптимальной работы БПФ.
 *     Больший размер даёт лучшее разрешение по квефренсии.
 *
 * Вход:  real (Float32Array — вещественный сигнал)
 * Выход: real (Float32Array — вещественный кепстр в области квефренсии)
 *
 * Примеры использования:
 *
 *   1. Определение основного тона:
 *      Sine(440) → Cepstrum(windowSize=2048) → Oscilloscope
 *      На осциллографе виден пик на квефренсии ≈ sampleRate/440 отсчётов,
 *      соответствующей периоду основного тона (нота Ля первой октавы).
 *
 *   2. Обнаружение эхо:
 *      [Impulse + DelayLine(задержка=200)] → Cepstrum → Oscilloscope
 *      Пик на квефренсии 200 отсчётов указывает на задержку эхо.
 *
 *   3. Анализ сложного сигнала:
 *      [Sine(200) + Sine(400) + Sine(600)] → Cepstrum(windowSize=4096)
 *      → Oscilloscope
 *      Кепстр выявляет гармоническую структуру: пик на квефренсии,
 *      соответствующей периоду основного тона 200 Гц.
 */
import type { PluginDefinition } from '../../types';
import { fft, ifft } from '../_shared/FFTUtils';

function nextPow2(n: number): number {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
}

export default {
    type: 'Кепстр',
    id: 'cepstrum',
    icon: 'dsp-cepstrum',
    description: 'Вещественный кепстр сигнала',
    group: 'real-math',

    signals: {
        input: 'real' as const,
        output: 'real' as const,
    },

    defaultParams: {
        windowSize: 1024,
    },

    processor: {
        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const windowSize = Math.max(2, (params.windowSize ?? 1024) as number);
            const analyzeLen = Math.min(windowSize, input.length);

            // Pad to next power of 2
            const fftSize = nextPow2(analyzeLen);
            const epsilon = 1e-20;

            // Apply Hann window and zero-pad
            const real = new Float32Array(fftSize);
            const imag = new Float32Array(fftSize);

            for (let i = 0; i < analyzeLen; i++) {
                const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (analyzeLen - 1 || 1)));
                real[i] = input[i] * hann;
            }
            // Remaining samples are already zero from Float32Array initialization

            // Forward FFT
            fft(real, imag);

            // Log power spectrum: log(|X|² + epsilon)
            for (let i = 0; i < fftSize; i++) {
                const powerSpectrum = real[i] * real[i] + imag[i] * imag[i];
                real[i] = Math.log(powerSpectrum + epsilon);
                imag[i] = 0;
            }

            // Inverse FFT
            ifft(real, imag);

            // Output the real part (real cepstrum)
            const output = new Float32Array(chunkSize);
            const copyLen = Math.min(chunkSize, fftSize);
            for (let i = 0; i < copyLen; i++) {
                output[i] = real[i];
            }

            return output;
        }
    }
} satisfies PluginDefinition;
