import DSPLib from '../../engine/DSPLib';

export default {
    id: 'PHASE_DETECTOR',
    name: 'Фазовый детектор',
    description: 'Фазовый детектор',
    icon: 'speed',
    group: 'detectors',
    groupOrder: 0,
    signals: { input: 'complex', output: 'real' },
    defaultParams: { referenceFrequency: 1000 },
    paramFields: [
        { name: 'referenceFrequency', label: 'Опорная частота (Гц)', type: 'number', min: 1, max: 24000, step: 10, defaultValue: 1000 },
    ],
    validate(params) {
        const errors = [];
        if (!params.referenceFrequency || params.referenceFrequency <= 0) {
            errors.push('Опорная частота должна быть больше 0');
        }
        return errors;
    },
    process(ctx) {
        const { inputs, params, sampleRate, bufferSize } = ctx;
        if (!inputs[0] || !inputs[0].real) return new Float32Array(bufferSize);
        const { referenceFrequency = 1000 } = params;
        return DSPLib.phaseDetector(inputs[0], referenceFrequency, sampleRate);
    },
};
