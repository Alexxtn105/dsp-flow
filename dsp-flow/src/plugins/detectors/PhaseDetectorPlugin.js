import DSPLib from '../../engine/DSPLib';

export default {
    id: 'PHASE_DETECTOR',
    name: 'Фазовый детектор',
    description: 'Фазовый детектор',
    icon: 'speed',
    group: 'detectors',
    groupOrder: 0,
    signals: { input: 'complex', output: 'real' },
    defaultParams: { referenceFrequency: 1000, sensitivity: 1.0, outputRange: '±180°' },
    process(ctx) {
        const { inputs, params, sampleRate, bufferSize } = ctx;
        if (!inputs[0] || !inputs[0].real) return new Float32Array(bufferSize);
        const { referenceFrequency = 1000 } = params;
        return DSPLib.phaseDetector(inputs[0], referenceFrequency, sampleRate);
    },
};
