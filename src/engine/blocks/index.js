/**
 * Базовые DSP блоки
 */

/**
 * Пропускающий блок (для визуализаторов)
 */
export const PassthroughBlock = {
    process(inputs, params, chunkSize) {
        return inputs[0] || new Float32Array(chunkSize);
    }
};

/**
 * Блок входного сигнала (обрабатывается особым образом в DSPProcessor)
 */
export const InputSignalBlock = {
    process(inputs, params, chunkSize) {
        // Этот блок обрабатывается в DSPProcessor
        return new Float32Array(chunkSize);
    }
};

/**
 * Синусный генератор
 */
export const SineGeneratorBlock = {
    // Состояние фазы для каждого экземпляра блока
    states: new Map(),

    process(inputs, params, chunkSize, nodeId) {
        const output = new Float32Array(chunkSize);
        const frequency = params.frequency || 1000;
        const amplitude = params.amplitude !== undefined ? params.amplitude : 1.0;
        const phaseOffset = (params.phase || 0) * (Math.PI / 180); // в радианы
        const sampleRate = params.sampleRate || 48000;

        // Получаем или инициализируем состояние
        if (!this.states.has(nodeId)) {
            this.states.set(nodeId, { currentPhase: 0 });
        }
        const state = this.states.get(nodeId);

        const phaseIncrement = (2 * Math.PI * frequency) / sampleRate;

        for (let i = 0; i < chunkSize; i++) {
            output[i] = amplitude * Math.sin(state.currentPhase + phaseOffset);
            state.currentPhase += phaseIncrement;

            // Предотвращаем переполнение phase
            if (state.currentPhase > 2 * Math.PI) {
                state.currentPhase -= 2 * Math.PI;
            }
        }

        return output;
    }
};

/**
 * Косинусный генератор
 */
export const CosineGeneratorBlock = {
    // Состояние фазы для каждого экземпляра блока
    states: new Map(),

    process(inputs, params, chunkSize, nodeId) {
        const output = new Float32Array(chunkSize);
        const frequency = params.frequency || 1000;
        const amplitude = params.amplitude !== undefined ? params.amplitude : 1.0;
        const phaseOffset = (params.phase || 0) * (Math.PI / 180); // в радианы
        const sampleRate = params.sampleRate || 48000;

        // Получаем или инициализируем состояние
        if (!this.states.has(nodeId)) {
            this.states.set(nodeId, { currentPhase: 0 });
        }
        const state = this.states.get(nodeId);

        const phaseIncrement = (2 * Math.PI * frequency) / sampleRate;

        for (let i = 0; i < chunkSize; i++) {
            output[i] = amplitude * Math.cos(state.currentPhase + phaseOffset);
            state.currentPhase += phaseIncrement;

            // Предотвращаем переполнение phase
            if (state.currentPhase > 2 * Math.PI) {
                state.currentPhase -= 2 * Math.PI;
            }
        }

        return output;
    }
};

/**
 * Сумматор - складывает все входные сигналы
 */
export const SummerBlock = {
    process(inputs, params, chunkSize) {
        if (inputs.length === 0) {
            return new Float32Array(chunkSize);
        }

        const output = new Float32Array(chunkSize);

        for (const input of inputs) {
            if (input) {
                for (let i = 0; i < Math.min(chunkSize, input.length); i++) {
                    output[i] += input[i];
                }
            }
        }

        return output;
    }
};

/**
 * Перемножитель - умножает все входные сигналы
 */
export const MultiplierBlock = {
    process(inputs, params, chunkSize) {
        if (inputs.length === 0) {
            return new Float32Array(chunkSize);
        }

        // Инициализируем выход единицами
        const output = new Float32Array(chunkSize).fill(1);

        for (const input of inputs) {
            if (input) {
                for (let i = 0; i < Math.min(chunkSize, input.length); i++) {
                    output[i] *= input[i];
                }
            }
        }

        return output;
    }
};

/**
 * FIR фильтр (Фильтр с конечной импульсной характеристикой)
 */
export const FIRFilterBlock = {
    // Буфер для хранения предыдущих отсчётов
    buffers: new Map(),

    /**
     * Генерирует коэффициенты для ФНЧ (sinc)
     */
    generateLowpassCoefficients(cutoff, sampleRate, order = 31) {
        const fc = cutoff / sampleRate;
        const coefficients = new Float32Array(order);
        const middle = Math.floor(order / 2);

        for (let i = 0; i < order; i++) {
            const n = i - middle;
            if (n === 0) {
                coefficients[i] = 2 * fc;
            } else {
                coefficients[i] = Math.sin(2 * Math.PI * fc * n) / (Math.PI * n);
            }
            // Применяем окно Хэмминга
            coefficients[i] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (order - 1));
        }

        // Нормализация
        const sum = coefficients.reduce((a, b) => a + b, 0);
        for (let i = 0; i < order; i++) {
            coefficients[i] /= sum;
        }

        return coefficients;
    },

    /**
     * Генерирует коэффициенты для ФВЧ
     */
    generateHighpassCoefficients(cutoff, sampleRate, order = 31) {
        const lowpass = this.generateLowpassCoefficients(cutoff, sampleRate, order);
        const highpass = new Float32Array(order);
        const middle = Math.floor(order / 2);

        for (let i = 0; i < order; i++) {
            if (i === middle) {
                highpass[i] = 1 - lowpass[i];
            } else {
                highpass[i] = -lowpass[i];
            }
        }

        return highpass;
    },

    /**
     * Генерирует коэффициенты для полосового фильтра
     */
    generateBandpassCoefficients(lowCutoff, highCutoff, sampleRate, order = 31) {
        const lowpass = this.generateLowpassCoefficients(highCutoff, sampleRate, order);
        const highpass = this.generateHighpassCoefficients(lowCutoff, sampleRate, order);
        const bandpass = new Float32Array(order);

        for (let i = 0; i < order; i++) {
            bandpass[i] = lowpass[i] + highpass[i];
        }

        return bandpass;
    },

    process(inputs, params, chunkSize) {
        if (inputs.length === 0 || !inputs[0]) {
            return new Float32Array(chunkSize);
        }

        const input = inputs[0];
        const cutoff = params.cutoffFrequency || params.frequency || 1000;
        const sampleRate = params.sampleRate || 48000;
        const order = params.order || 31;
        const filterType = params.filterType || 'lowpass';

        // Получаем или генерируем коэффициенты
        let coefficients;
        switch (filterType) {
            case 'highpass':
                coefficients = this.generateHighpassCoefficients(cutoff, sampleRate, order);
                break;
            case 'bandpass':
                const lowCutoff = params.lowCutoff || cutoff * 0.8;
                const highCutoff = params.highCutoff || cutoff * 1.2;
                coefficients = this.generateBandpassCoefficients(lowCutoff, highCutoff, sampleRate, order);
                break;
            default:
                coefficients = this.generateLowpassCoefficients(cutoff, sampleRate, order);
        }

        // Применяем свёртку
        const output = new Float32Array(chunkSize);

        for (let i = 0; i < chunkSize; i++) {
            let sum = 0;
            for (let j = 0; j < coefficients.length && i - j >= 0; j++) {
                sum += input[i - j] * coefficients[j];
            }
            output[i] = sum;
        }

        return output;
    }
};

/**
 * БПФ (Быстрое преобразование Фурье)
 */
export const FFTBlock = {
    /**
     * Вычисляет БПФ методом Кули-Тьюки
     */
    fft(real, imag) {
        const n = real.length;

        if (n <= 1) return;

        // Bit-reversal перестановка
        for (let i = 1, j = 0; i < n; i++) {
            let bit = n >> 1;
            for (; j & bit; bit >>= 1) {
                j ^= bit;
            }
            j ^= bit;

            if (i < j) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }
        }

        // Кули-Тьюки итеративно
        for (let len = 2; len <= n; len <<= 1) {
            const angle = (2 * Math.PI) / len;
            const wReal = Math.cos(angle);
            const wImag = Math.sin(angle);

            for (let i = 0; i < n; i += len) {
                let curReal = 1;
                let curImag = 0;

                for (let j = 0; j < len / 2; j++) {
                    const uReal = real[i + j];
                    const uImag = imag[i + j];
                    const vReal = real[i + j + len / 2] * curReal - imag[i + j + len / 2] * curImag;
                    const vImag = real[i + j + len / 2] * curImag + imag[i + j + len / 2] * curReal;

                    real[i + j] = uReal + vReal;
                    imag[i + j] = uImag + vImag;
                    real[i + j + len / 2] = uReal - vReal;
                    imag[i + j + len / 2] = uImag - vImag;

                    const temp = curReal * wReal - curImag * wImag;
                    curImag = curReal * wImag + curImag * wReal;
                    curReal = temp;
                }
            }
        }
    },

    /**
     * Вычисляет магнитуду спектра
     */
    computeMagnitude(real, imag) {
        const n = real.length;
        const magnitude = new Float32Array(n / 2);

        for (let i = 0; i < n / 2; i++) {
            magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }

        return magnitude;
    },

    /**
     * Вычисляет магнитуду в дБ
     */
    computeMagnitudeDB(real, imag) {
        const magnitude = this.computeMagnitude(real, imag);
        const maxMag = Math.max(...magnitude);

        for (let i = 0; i < magnitude.length; i++) {
            magnitude[i] = 20 * Math.log10(magnitude[i] / maxMag + 1e-10);
        }

        return magnitude;
    },

    process(inputs, params, chunkSize) {
        if (inputs.length === 0 || !inputs[0]) {
            return new Float32Array(chunkSize / 2);
        }

        const input = inputs[0];

        // Дополняем до степени двойки
        const fftSize = Math.pow(2, Math.ceil(Math.log2(input.length)));
        const real = new Float32Array(fftSize);
        const imag = new Float32Array(fftSize);

        // Копируем входные данные
        for (let i = 0; i < input.length; i++) {
            real[i] = input[i];
        }

        // Выполняем БПФ
        this.fft(real, imag);

        // Возвращаем магнитуду в дБ
        return this.computeMagnitudeDB(real, imag);
    }
};
