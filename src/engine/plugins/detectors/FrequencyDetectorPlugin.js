export default {
    type: 'Частотный детектор',
    id: 'frequency-detector',
    icon: 'timeline',
    description: 'Частотный детектор',
    group: 'detectors',
    signals: { input: 'complex', output: 'real' },
    defaultParams: {
        centerFrequency: 1000,
        bandwidth: 100,
        sensitivity: 1.0,
    },
    processor: {
        process(inputs, params, chunkSize) {
            return inputs[0] || new Float32Array(chunkSize);
        }
    }
};
