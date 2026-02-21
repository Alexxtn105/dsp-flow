export default {
    id: 'SPECTRUM_ANALYZER',
    name: 'Спектроанализатор',
    description: 'Спектральный анализ',
    icon: 'analytics',
    group: 'fft-blocks',
    groupOrder: 2,
    signals: { input: 'real', output: 'real' },
    visualizationType: 'spectrum',
    defaultParams: {},
    paramFields: [],
    validate() { return []; },
    process(ctx) {
        const { inputs } = ctx;
        return inputs[0];
    },
};
