export default {
    id: 'OSCILLOSCOPE',
    name: 'Осциллограф',
    description: 'Визуализация сигнала',
    icon: 'show_chart',
    group: 'visualization',
    groupOrder: 0,
    signals: { input: 'real', output: null },
    visualizationType: 'oscilloscope',
    defaultParams: {},
    paramFields: [],
    validate() { return []; },
    process(ctx) {
        const { inputs } = ctx;
        return inputs[0];
    },
};
