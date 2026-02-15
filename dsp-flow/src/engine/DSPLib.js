/**
 * DSP Library - библиотека алгоритмов цифровой обработки сигналов
 */

import FFT from 'fft.js';

export class DSPLib {
    /**
     * FIR фильтр (КИХ-фильтр)
     */
    static firFilter(input, coefficients) {
        const output = new Float32Array(input.length);
        const N = coefficients.length;

        for (let n = 0; n < input.length; n++) {
            let sum = 0;
            for (let k = 0; k < N; k++) {
                if (n - k >= 0) {
                    sum += coefficients[k] * input[n - k];
                }
            }
            output[n] = sum;
        }

        return output;
    }

    /**
     * Генерация коэффициентов КИХ-фильтра (окно Хэмминга)
     */
    static generateFIRCoefficients(order, cutoff, sampleRate, filterType = 'lowpass') {
        const coefficients = new Float32Array(order);
        const fc = cutoff / sampleRate; // Нормализованная частота среза
        const M = order - 1;

        for (let n = 0; n < order; n++) {
            // Идеальная импульсная характеристика
            let h;
            if (n === M / 2) {
                h = 2 * fc;
            } else {
                const x = 2 * Math.PI * fc * (n - M / 2);
                h = Math.sin(x) / (Math.PI * (n - M / 2));
            }

            // Окно Хэмминга
            const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / M);
            coefficients[n] = h * window;

            // Инверсия для ФВЧ
            if (filterType === 'highpass') {
                coefficients[n] = -coefficients[n];
                if (n === M / 2) {
                    coefficients[n] += 1;
                }
            }
        }

        // Нормализация
        const sum = coefficients.reduce((a, b) => a + Math.abs(b), 0);
        for (let i = 0; i < order; i++) {
            coefficients[i] /= sum;
        }

        return coefficients;
    }

    /**
     * Полосовой фильтр
     */
    static bandpassFilter(input, order, lowCutoff, highCutoff, sampleRate) {
        // Реализуем как разность двух ФНЧ
        const lowCoeffs = this.generateFIRCoefficients(order, highCutoff, sampleRate, 'lowpass');
        const highCoeffs = this.generateFIRCoefficients(order, lowCutoff, sampleRate, 'lowpass');

        const lowFiltered = this.firFilter(input, lowCoeffs);
        const highFiltered = this.firFilter(input, highCoeffs);

        const output = new Float32Array(input.length);
        for (let i = 0; i < input.length; i++) {
            output[i] = lowFiltered[i] - highFiltered[i];
        }

        return output;
    }

    /**
     * Преобразование Гильберта
     */
    static hilbertTransform(input, order = 64) {
        const coefficients = new Float32Array(order);
        const M = order - 1;

        for (let n = 0; n < order; n++) {
            if (n === M / 2) {
                coefficients[n] = 0;
            } else {
                const k = n - M / 2;
                if (k % 2 !== 0) {
                    coefficients[n] = 2 / (Math.PI * k);
                } else {
                    coefficients[n] = 0;
                }
            }

            // Окно Хэмминга
            const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / M);
            coefficients[n] *= window;
        }

        const imaginary = this.firFilter(input, coefficients);

        // Возвращаем комплексный сигнал
        return {
            real: input,
            imag: imaginary
        };
    }

    /**
     * БПФ (Fast Fourier Transform)
     */
    static fft(input, fftSize = null) {
        // Определяем размер БПФ (должен быть степенью 2)
        const size = fftSize || this.nextPowerOf2(input.length);
        
        // Дополняем нулями если нужно
        const paddedInput = new Float32Array(size);
        paddedInput.set(input.slice(0, size));

        // Создаём FFT объект
        const fft = new FFT(size);
        const complexInput = fft.createComplexArray();
        const complexOutput = fft.createComplexArray();

        // Заполняем комплексный массив (действительная часть)
        fft.realTransform(complexOutput, paddedInput);
        fft.completeSpectrum(complexOutput);

        // Разделяем на действительную и мнимую части
        const real = new Float32Array(size / 2);
        const imag = new Float32Array(size / 2);

        for (let i = 0; i < size / 2; i++) {
            real[i] = complexOutput[2 * i];
            imag[i] = complexOutput[2 * i + 1];
        }

        return { real, imag, size };
    }

    /**
     * Вычисление спектра мощности
     */
    static powerSpectrum(fftResult) {
        const { real, imag } = fftResult;
        const spectrum = new Float32Array(real.length);

        for (let i = 0; i < real.length; i++) {
            spectrum[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }

        return spectrum;
    }

    /**
     * Перевод в дБ
     */
    static toDecibels(spectrum, referenceValue = 1.0) {
        const dbSpectrum = new Float32Array(spectrum.length);

        for (let i = 0; i < spectrum.length; i++) {
            const value = spectrum[i] / referenceValue;
            dbSpectrum[i] = 20 * Math.log10(Math.max(value, 1e-10)); // Избегаем log(0)
        }

        return dbSpectrum;
    }

    /**
     * Генератор синусоиды
     */
    static generateSine(frequency, amplitude, sampleRate, numSamples, phase = 0) {
        const output = new Float32Array(numSamples);
        const angularFreq = 2 * Math.PI * frequency / sampleRate;

        for (let n = 0; n < numSamples; n++) {
            output[n] = amplitude * Math.sin(angularFreq * n + phase);
        }

        return output;
    }

    /**
     * Генератор косинусоиды
     */
    static generateCosine(frequency, amplitude, sampleRate, numSamples, phase = 0) {
        const output = new Float32Array(numSamples);
        const angularFreq = 2 * Math.PI * frequency / sampleRate;

        for (let n = 0; n < numSamples; n++) {
            output[n] = amplitude * Math.cos(angularFreq * n + phase);
        }

        return output;
    }

    /**
     * Интегратор
     */
    static integrate(input, initialValue = 0) {
        const output = new Float32Array(input.length);
        let accumulator = initialValue;

        for (let i = 0; i < input.length; i++) {
            accumulator += input[i];
            output[i] = accumulator;
        }

        return output;
    }

    /**
     * Сумматор
     */
    static sum(inputs) {
        if (inputs.length === 0) return new Float32Array(0);
        
        const length = inputs[0].length;
        const output = new Float32Array(length);

        for (let i = 0; i < length; i++) {
            let sum = 0;
            for (const input of inputs) {
                sum += input[i] || 0;
            }
            output[i] = sum;
        }

        return output;
    }

    /**
     * Перемножитель
     */
    static multiply(input1, input2) {
        const length = Math.min(input1.length, input2.length);
        const output = new Float32Array(length);

        for (let i = 0; i < length; i++) {
            output[i] = input1[i] * input2[i];
        }

        return output;
    }

    /**
     * Фазовый детектор
     */
    static phaseDetector(complexSignal, referenceFrequency, sampleRate) {
        const { real, imag } = complexSignal;
        const output = new Float32Array(real.length);

        for (let i = 0; i < real.length; i++) {
            output[i] = Math.atan2(imag[i], real[i]) * 180 / Math.PI;
        }

        return output;
    }

    /**
     * Частотный детектор
     */
    static frequencyDetector(complexSignal, sampleRate) {
        const { real, imag } = complexSignal;
        const output = new Float32Array(real.length - 1);

        for (let i = 0; i < real.length - 1; i++) {
            const phase1 = Math.atan2(imag[i], real[i]);
            const phase2 = Math.atan2(imag[i + 1], real[i + 1]);
            let phaseDiff = phase2 - phase1;

            // Разворачиваем фазу
            if (phaseDiff > Math.PI) phaseDiff -= 2 * Math.PI;
            if (phaseDiff < -Math.PI) phaseDiff += 2 * Math.PI;

            output[i] = phaseDiff * sampleRate / (2 * Math.PI);
        }

        return output;
    }

    /**
     * Следующая степень двойки
     */
    static nextPowerOf2(n) {
        return Math.pow(2, Math.ceil(Math.log2(n)));
    }

    /**
     * Скользящее БПФ (для водопада)
     */
    static slidingFFT(input, windowSize, hopSize, fftSize = null) {
        const size = fftSize || windowSize;
        const numWindows = Math.floor((input.length - windowSize) / hopSize) + 1;
        const results = [];

        for (let i = 0; i < numWindows; i++) {
            const start = i * hopSize;
            const window = input.slice(start, start + windowSize);
            
            // Применяем окно Хэмминга
            const windowed = new Float32Array(windowSize);
            for (let j = 0; j < windowSize; j++) {
                const w = 0.54 - 0.46 * Math.cos((2 * Math.PI * j) / (windowSize - 1));
                windowed[j] = window[j] * w;
            }

            const fftResult = this.fft(windowed, size);
            const spectrum = this.powerSpectrum(fftResult);
            
            results.push({
                spectrum: this.toDecibels(spectrum),
                timestamp: start / input.length
            });
        }

        return results;
    }
}

export default DSPLib;
