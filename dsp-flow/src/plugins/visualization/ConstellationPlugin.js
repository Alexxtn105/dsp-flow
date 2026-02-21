export default {
    id: 'CONSTELLATION',
    name: 'Фазовое созвездие',
    description: 'Фазовое созвездие',
    icon: 'star',
    group: 'visualization',
    groupOrder: 1,
    signals: { input: 'complex', output: null },
    visualizationType: 'constellation',
    defaultParams: {},
    paramFields: [],
    validate() { return []; },
    process(ctx) {
        const { inputs } = ctx;
        return inputs[0];
    },
};
