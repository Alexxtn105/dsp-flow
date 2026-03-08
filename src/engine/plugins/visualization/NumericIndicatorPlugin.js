export default {
    type: 'Числовой индикатор',
    id: 'numeric-indicator',
    icon: 'dsp-numeric',
    description: 'Отображает мгновенное значение действительного сигнала',
    group: 'visualization',
    signals: { input: 'real', output: null },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize);
        }
    }
};
