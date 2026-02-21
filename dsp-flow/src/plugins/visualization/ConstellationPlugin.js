export default {
    id: 'CONSTELLATION',
    name: 'Фазовое созвездие',
    description: 'Фазовое созвездие',
    icon: 'star',
    group: 'visualization',
    groupOrder: 1,
    signals: { input: 'complex', output: null },
    visualizationType: 'constellation',
    defaultParams: { symbolRate: 1000, constellation: 'QPSK', eyeDiagram: true },
    process(ctx) {
        const { inputs } = ctx;
        return inputs[0];
    },
};
