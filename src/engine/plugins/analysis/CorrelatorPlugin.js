/**
 * Коррелятор
 *
 * Вычисляет взаимную корреляцию двух входных сигналов.
 * Выход — нормализованный коэффициент корреляции или raw-корреляция.
 */

const CorrelatorPlugin = {
    type: 'Коррелятор',
    id: 'correlator',
    icon: 'dsp-correlator',
    description: 'Взаимная корреляция двух сигналов',
    group: 'math-blocks',

    signals: {
        input: 'real',
        output: 'real',
        inputsCount: 2,
        inputLabels: ['Вход 1', 'Вход 2']
    },

    defaultParams: {
        normalize: true,
        maxLag: 0
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize) {
            const input1 = inputs[0];
            const input2 = inputs[1];

            if (!input1 || !input2) return new Float32Array(chunkSize);

            const normalize = params.normalize ?? true;
            const maxLag = params.maxLag ?? 0;
            const actualMaxLag = maxLag > 0 ? Math.min(maxLag, chunkSize - 1) : chunkSize - 1;
            const output = new Float32Array(chunkSize);

            // Средние значения для нормализации
            let mean1 = 0, mean2 = 0;
            if (normalize) {
                for (let i = 0; i < chunkSize; i++) {
                    mean1 += input1[i];
                    mean2 += input2[i];
                }
                mean1 /= chunkSize;
                mean2 /= chunkSize;
            }

            // Энергии для нормализации
            let energy1 = 0, energy2 = 0;
            if (normalize) {
                for (let i = 0; i < chunkSize; i++) {
                    energy1 += (input1[i] - mean1) * (input1[i] - mean1);
                    energy2 += (input2[i] - mean2) * (input2[i] - mean2);
                }
            }
            const normFactor = normalize ? Math.sqrt(energy1 * energy2) : 1;

            // Корреляция для каждого лага
            const halfChunk = Math.floor(chunkSize / 2);
            for (let lag = 0; lag <= actualMaxLag && lag < chunkSize; lag++) {
                let sum = 0;
                for (let i = 0; i < chunkSize - lag; i++) {
                    const v1 = normalize ? (input1[i] - mean1) : input1[i];
                    const v2 = normalize ? (input2[i + lag] - mean2) : input2[i + lag];
                    sum += v1 * v2;
                }

                // Размещаем результат: lag 0 в центре
                const idx = halfChunk + lag;
                if (idx < chunkSize) {
                    output[idx] = normFactor > 1e-10 ? sum / normFactor : 0;
                }

                // Отрицательный лаг (зеркально)
                if (lag > 0) {
                    const negIdx = halfChunk - lag;
                    if (negIdx >= 0) {
                        let negSum = 0;
                        for (let i = 0; i < chunkSize - lag; i++) {
                            const v1 = normalize ? (input1[i + lag] - mean1) : input1[i + lag];
                            const v2 = normalize ? (input2[i] - mean2) : input2[i];
                            negSum += v1 * v2;
                        }
                        output[negIdx] = normFactor > 1e-10 ? negSum / normFactor : 0;
                    }
                }
            }

            return output;
        }
    }
};

export default CorrelatorPlugin;
