export default {
    id: 'SPECTRUM_ANALYZER',
    name: 'Спектроанализатор',
    description: 'Спектральный анализ',
    icon: 'analytics',
    group: 'fft-blocks',
    groupOrder: 2,
    signals: { input: 'real', output: 'real' },
    visualizationType: 'spectrum',
    defaultParams: { fftSize: 2048, frequencyRange: 'full', dBScale: true, averaging: 5 },
    process(ctx) {
        const { inputs } = ctx;
        return inputs[0];
    },
};
