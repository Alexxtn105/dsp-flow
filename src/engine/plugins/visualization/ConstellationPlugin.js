export default {
    type: 'Фазовое созвездие',
    id: 'constellation',
    icon: 'dsp-constellation',
    description: 'Фазовое созвездие',
    group: 'visualization',
    signals: { input: 'complex', output: null },
    defaultParams: {
        symbolRate: 1000,
        constellation: 'QPSK',
        eyeDiagram: true,
    },
    processor: {
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize * 2);
        }
    }
};
