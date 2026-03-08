export default {
    type: 'Осциллограф',
    id: 'oscilloscope',
    icon: 'dsp-oscilloscope',
    description: 'Визуализация сигнала (4 канала)',
    group: 'visualization',
    signals: {
        input: 'real',
        output: null,
        inputsCount: 4,
        inputLabels: ['Канал 1', 'Канал 2', 'Канал 3', 'Канал 4']
    },
    defaultParams: {
        timeWindow: 10,
    },
    processor: {
        process(inputs) {
            const channels = [];
            for (let i = 0; i < 4; i++) {
                channels.push(inputs[i] || null);
            }
            return { channels };
        }
    }
};
