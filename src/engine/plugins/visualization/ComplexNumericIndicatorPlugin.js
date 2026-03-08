export default {
    type: 'Комплексный числовой индикатор',
    id: 'complex-numeric-indicator',
    icon: 'dsp-complex-numeric',
    description: 'Отображает мгновенное значение комплексного сигнала (Re + jIm)',
    group: 'visualization',
    signals: { input: 'complex', output: null },
    defaultParams: {},
    processor: {
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize * 2);
        }
    }
};
