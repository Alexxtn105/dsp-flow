/**
 * Базовые DSP блоки
 */

// --- Helper Classes & Functions ---

/**
 * Window Functions
 */
const WindowFunctions = {
    rectangular: (n, N) => 1,
    hamming: (n, N) => 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1)),
    hanning: (n, N) => 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1))),
    blackman: (n, N) => 0.42 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1)) + 0.08 * Math.cos((4 * Math.PI * n) / (N - 1)),
    'blackman-harris': (n, N) =>
        0.35875 - 0.48829 * Math.cos((2 * Math.PI * n) / (N - 1))
        + 0.14128 * Math.cos((4 * Math.PI * n) / (N - 1))
        - 0.01168 * Math.cos((6 * Math.PI * n) / (N - 1)),
    nuttall: (n, N) =>
        0.355768 - 0.487396 * Math.cos((2 * Math.PI * n) / (N - 1))
        + 0.144232 * Math.cos((4 * Math.PI * n) / (N - 1))
        - 0.012604 * Math.cos((6 * Math.PI * n) / (N - 1)),
    flattop: (n, N) =>
        1 - 1.93 * Math.cos((2 * Math.PI * n) / (N - 1))
        + 1.29 * Math.cos((4 * Math.PI * n) / (N - 1))
        - 0.388 * Math.cos((6 * Math.PI * n) / (N - 1))
        + 0.032 * Math.cos((8 * Math.PI * n) / (N - 1))
};

/**
 * Sinc function
 */
const sinc = (x) => {
    if (x === 0) return 1;
    const piX = Math.PI * x;
    return Math.sin(piX) / piX;
};

/**
 * Filter Design: Windowed Sinc
 */
const designWindowedSinc = (type, cutoff, sampleRate, order, windowName) => {
    // order is number of taps
    const M = order - 1;
    const fc = cutoff / sampleRate;
    const coeffs = new Float32Array(order);
    const window = WindowFunctions[windowName] || WindowFunctions.rectangular;

    for (let i = 0; i < order; i++) {
        if (i === M / 2) {
            coeffs[i] = 2 * fc;
        } else {
            coeffs[i] = 2 * fc * sinc(2 * fc * (i - M / 2));
        }
        coeffs[i] *= window(i, order);
    }

    // Normalize for unity gain at DC
    let sum = 0;
    for (let i = 0; i < order; i++) sum += coeffs[i];
    if (sum !== 0 && type === 'lowpass') {
        for (let i = 0; i < order; i++) coeffs[i] /= sum;
    }

    // Spectral Inversion for Highpass
    if (type === 'highpass') {
        for (let i = 0; i < order; i++) coeffs[i] *= -1;
        coeffs[Math.floor(M / 2)] += 1;
    }

    // Bandpass via spectral transformation (simplified)
    // Real implementation needs 2 cutoffs.
    // This function assumes one cutoff. Bandpass needs a separate call or logic.

    return coeffs;
};

/**
 * Filter Design: Placeholder for Remez
 */
const designRemez = (type, cutoff, sampleRate, order) => {
    console.warn("Полноценный алгоритм Ремеза требует сложного итеративного решателя. Используется Windowed Sinc (Blackman) как качественное приближение.");
    return designWindowedSinc(type, cutoff, sampleRate, order, 'blackman');
};

// --- Block Implementations ---

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
    // Rename inputs/outputs to match
    process(inputs, params, chunkSize) {
        // Этот блок обрабатывается в DSPProcessor (читает файл)
        // Если вызван process, возвращаем тишину
        return new Float32Array(chunkSize);
    }
};

/**
 * Синусный генератор
 */
export const SineGeneratorBlock = {
    states: new Map(),

    process(inputs, params, chunkSize, nodeId) {
        const output = new Float32Array(chunkSize);
        const frequency = params.frequency || 1000;
        // amplitude is used directly
        const amplitude = params.amplitude !== undefined ? params.amplitude : 1.0;
        const phaseOffset = (params.phase || 0) * (Math.PI / 180);
        const sampleRate = params.sampleRate || 48000;

        if (!this.states.has(nodeId)) {
            this.states.set(nodeId, { currentPhase: 0 });
        }
        const state = this.states.get(nodeId);

        const phaseIncrement = (2 * Math.PI * frequency) / sampleRate;

        for (let i = 0; i < chunkSize; i++) {
            output[i] = amplitude * Math.sin(state.currentPhase + phaseOffset);
            state.currentPhase += phaseIncrement;
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
    states: new Map(),

    process(inputs, params, chunkSize, nodeId) {
        const output = new Float32Array(chunkSize);
        const frequency = params.frequency || 1000;
        const amplitude = params.amplitude !== undefined ? params.amplitude : 1.0;
        const phaseOffset = (params.phase || 0) * (Math.PI / 180);
        const sampleRate = params.sampleRate || 48000;

        if (!this.states.has(nodeId)) {
            this.states.set(nodeId, { currentPhase: 0 });
        }
        const state = this.states.get(nodeId);

        const phaseIncrement = (2 * Math.PI * frequency) / sampleRate;

        for (let i = 0; i < chunkSize; i++) {
            output[i] = amplitude * Math.cos(state.currentPhase + phaseOffset);
            state.currentPhase += phaseIncrement;
            if (state.currentPhase > 2 * Math.PI) {
                state.currentPhase -= 2 * Math.PI;
            }
        }

        return output;
    }
};

/**
 * Сумматор
 */
export const SummerBlock = {
    process(inputs, params, chunkSize) {
        // Ожидаем 2 входа
        const input1 = inputs[0] || new Float32Array(chunkSize);
        // inputs[1] might be undefined if not connected, treat as zeros
        const input2 = inputs[1] || new Float32Array(chunkSize);

        const output = new Float32Array(chunkSize);

        // (A + B) / 2
        for (let i = 0; i < chunkSize; i++) {
            // Handle potentially different lengths safely, though usually they match
            const v1 = i < input1.length ? input1[i] : 0;
            const v2 = i < input2.length ? input2[i] : 0;
            output[i] = (v1 + v2) / 2;
        }
        return output;
    }
};

/**
 * Перемножитель
 */
export const MultiplierBlock = {
    process(inputs, params, chunkSize) {
        // Ожидаем 2 входа
        const input1 = inputs[0] || new Float32Array(chunkSize);
        const input2 = inputs[1] || new Float32Array(chunkSize);

        const output = new Float32Array(chunkSize);

        // A * B
        for (let i = 0; i < chunkSize; i++) {
            const v1 = i < input1.length ? input1[i] : 0;
            const v2 = i < input2.length ? input2[i] : 0;
            output[i] = v1 * v2;
        }
        return output;
    }
};

/**
 * FIR фильтр (Фильтр с конечной импульсной характеристикой)
 * Оптимизирован с использованием кольцевого буфера и предварительного расчета
 */
export const FIRFilterBlock = {
    states: new Map(),

    // Helpers for generating coefficients (kept for legacy or specific uses if needed)
    generateLowpassCoefficients(cutoff, sampleRate, order) {
        return designWindowedSinc('lowpass', cutoff, sampleRate, order, 'hamming');
    },

    // Initialization: Calculate coefficients and setup buffer
    init(nodeId, params, sampleRate) {
        const order = params.order || 31;
        const cutoff = params.cutoffFrequency || params.frequency || 1000;
        const type = params.filterType || 'lowpass';
        const windowName = params.windowFunction || 'hamming';
        const designMethod = params.designMethod || 'window';

        let coeffs;

        // Handle Bandpass separately or inside design function
        if (type === 'bandpass') {
            const lowCutoff = params.lowCutoff || cutoff * 0.8;
            const highCutoff = params.highCutoff || cutoff * 1.2;

            // Generate lowpass and highpass then combine? 
            // Standard windowed sinc bandpass: 
            // h[n] = 2*f_high*sinc(2*f_high*(n-M/2)) - 2*f_low*sinc(2*f_low*(n-M/2))
            const M = order - 1;
            const fHigh = highCutoff / sampleRate;
            const fLow = lowCutoff / sampleRate;
            coeffs = new Float32Array(order);
            const window = WindowFunctions[windowName] || WindowFunctions.rectangular;

            for (let i = 0; i < order; i++) {
                if (i === M / 2) {
                    coeffs[i] = 2 * (fHigh - fLow);
                } else {
                    coeffs[i] = 2 * fHigh * sinc(2 * fHigh * (i - M / 2)) - 2 * fLow * sinc(2 * fLow * (i - M / 2));
                }
                coeffs[i] *= window(i, order);
            }
        } else {
            if (designMethod === 'remez') {
                coeffs = designRemez(type, cutoff, sampleRate, order);
            } else {
                coeffs = designWindowedSinc(type, cutoff, sampleRate, order, windowName);
            }
        }

        // Initialize Ring Buffer (Float32Array)
        const buffer = new Float32Array(order);

        this.states.set(nodeId, {
            coeffs,
            buffer,
            pointer: 0,
            order
        });
    },

    process(inputs, params, chunkSize, nodeId) {
        const input = inputs[0];
        if (!input) return new Float32Array(chunkSize);

        let state = this.states.get(nodeId);

        // Auto-init fallback
        if (!state) {
            const sampleRate = params.sampleRate || 48000;
            this.init(nodeId, params, sampleRate);
            state = this.states.get(nodeId);
        }

        const { coeffs, buffer, order } = state;
        const output = new Float32Array(input.length);
        let { pointer } = state;
        const bufferLen = buffer.length;

        for (let i = 0; i < input.length; i++) {
            // Write to circular buffer
            buffer[pointer] = input[i];

            // Convolution using circular buffer
            let acc = 0;
            let p = pointer;

            for (let j = 0; j < order; j++) {
                acc += coeffs[j] * buffer[p];
                p--;
                if (p < 0) p = bufferLen - 1;
            }

            output[i] = acc;

            // Advance pointer
            pointer++;
            if (pointer >= bufferLen) pointer = 0;
        }

        state.pointer = pointer;
        return output;
    }
};

/**
 * БПФ (Быстрое преобразование Фурье)
 */
export const FFTBlock = {
    fft(real, imag) {
        const n = real.length;
        if (n <= 1) return;

        for (let i = 1, j = 0; i < n; i++) {
            let bit = n >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }
        }

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

    computeMagnitudeDB(real, imag) {
        const n = real.length;
        const magnitude = new Float32Array(n / 2);
        for (let i = 0; i < n / 2; i++) {
            magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }

        // No auto-normalization to peak. Return absolute dB values.
        // Assuming input is within [-1, 1], magnitude is within [0, N/2].
        // To get dBFS (roughly), normalize by N/2 or keep as is?
        // Usually 20*log10(mag).
        // Let's just return 20*log10(mag + epsilon).
        // If we want consistent levels regardless of FFT size, we should normalize by fftSize.
        // But for "absolute" values relative to full scale sine wave:
        // A full scale sine wave (amp 1.0) has peak magnitude N/2.
        // So normalized mag = mag / (N/2).

        const N = n; // FFT size
        const scale = 2 / N; // To normalize so sine amplitude 1.0 -> 1.0

        for (let i = 0; i < magnitude.length; i++) {
            // Apply scaling to get 0dB for full scale sine
            const mag = magnitude[i] * scale;
            magnitude[i] = 20 * Math.log10(mag + 1e-10);
        }
        return magnitude;
    },

    process(inputs, params, chunkSize) {
        if (inputs.length === 0 || !inputs[0]) return new Float32Array(chunkSize / 2);
        const input = inputs[0];
        const fftSize = Math.pow(2, Math.ceil(Math.log2(input.length)));
        const real = new Float32Array(fftSize);
        const imag = new Float32Array(fftSize);
        for (let i = 0; i < input.length; i++) real[i] = input[i];
        this.fft(real, imag);
        return this.computeMagnitudeDB(real, imag);
    }
};

/**
 * Динамик (Audio Output)
 * Просто пропускает сигнал, используется как маркер для вывода звука
 */
export const SpeakerBlock = {
    process(inputs, params, chunkSize) {
        // Просто возвращаем входной сигнал (или тишину)
        // DSPProcessor сам заберет данные для воспроизведения
        return inputs[0] || new Float32Array(chunkSize);
    }
};

/**
 * Спектроанализатор / Водопад
 * Выполняет БПФ с применением оконной функции
 */
export const SpectrumAnalyzerBlock = {
    states: new Map(),

    process(inputs, params, chunkSize, nodeId) {
        const input = inputs[0];
        if (!input) return new Float32Array(chunkSize / 2);

        // Параметры
        const fftSize = params.fftSize || 2048; // Используем параметр fftSize
        const windowName = params.windowFunction || 'blackman-harris';

        // Получаем функцию окна
        const windowFunc = WindowFunctions[windowName] || WindowFunctions['blackman-harris'];

        // Подготовка данных
        // Если размер входных данных меньше fftSize, дополняем нулями
        // Если больше - берём последние (или первые?) fftSize. Обычно для анализатора - текущий чанк.
        // Но chunkSize может быть меньше fftSize. Требуется буферизация?
        // Пока предполагаем, что chunkSize достаточно велик или мы обрабатываем то, что есть.
        // Для корректного FFT размер должен быть степенью двойки.

        // В текущей архитектуре chunkSize фиксирован (например 1024 или 2048).
        // Если fftSize > chunkSize, нам нужен внутренний буфер (RingBuffer).

        if (!this.states.has(nodeId)) {
            this.states.set(nodeId, {
                buffer: new Float32Array(fftSize),
                pointer: 0
            });
        }

        const state = this.states.get(nodeId);
        const { buffer } = state;
        let { pointer } = state;

        // Записываем входные данные в кольцевой буфер
        for (let i = 0; i < input.length; i++) {
            buffer[pointer] = input[i];
            pointer = (pointer + 1) % fftSize;
        }
        state.pointer = pointer;

        // Для FFT нам нужно собрать упорядоченный буфер от старых к новым
        const processingBuffer = new Float32Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
            processingBuffer[i] = buffer[(pointer + i) % fftSize];
        }

        // Применяем окно
        for (let i = 0; i < fftSize; i++) {
            processingBuffer[i] *= windowFunc(i, fftSize);
        }

        // Выполняем FFT
        // Используем логику из FFTBlock (нужно вынести fft функцию или дублировать)
        // Чтобы не дублировать, вызовем метод FFTBlock
        const real = new Float32Array(fftSize);
        const imag = new Float32Array(fftSize);

        // Копируем (processingBuffer уже Float32)
        real.set(processingBuffer);

        FFTBlock.fft(real, imag);

        // Возвращаем магнитуду в дБ (половина спектра)
        return FFTBlock.computeMagnitudeDB(real, imag);
    }
};
