import DSPLib from '../../engine/DSPLib';

export default {
    id: 'FREQUENCY_DETECTOR',
    name: 'Частотный детектор',
    description: 'Частотный детектор',
    icon: 'timeline',
    group: 'detectors',
    groupOrder: 1,
    signals: { input: 'complex', output: 'real' },
    defaultParams: {},
    paramFields: [],
    validate() { return []; },
    process(ctx) {
        const { inputs, sampleRate, bufferSize } = ctx;
        if (!inputs[0] || !inputs[0].real) return new Float32Array(bufferSize);
        return DSPLib.frequencyDetector(inputs[0], sampleRate);
    },
};
