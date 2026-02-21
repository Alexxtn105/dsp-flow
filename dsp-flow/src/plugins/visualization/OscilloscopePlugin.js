export default {
    id: 'OSCILLOSCOPE',
    name: 'Осциллограф',
    description: 'Визуализация сигнала',
    icon: 'show_chart',
    group: 'visualization',
    groupOrder: 0,
    signals: { input: 'real', output: null },
    visualizationType: 'oscilloscope',
    defaultParams: { timeWindow: 10, samplingRate: 48000, channels: 1 },
    process(ctx) {
        const { inputs } = ctx;
        return inputs[0];
    },
};
