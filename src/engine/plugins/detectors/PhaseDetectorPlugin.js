export default {
    type: 'Фазовый детектор',
    id: 'phase-detector',
    icon: 'speed',
    description: 'Фазовый детектор',
    group: 'detectors',
    signals: { input: 'complex', output: 'real' },
    defaultParams: {
        referenceFrequency: 1000,
        sensitivity: 1.0,
        outputRange: '±180°',
    },
    processor: {
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize);
        }
    }
};
