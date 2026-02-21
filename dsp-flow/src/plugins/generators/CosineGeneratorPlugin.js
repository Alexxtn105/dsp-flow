import DSPLib from '../../engine/DSPLib';

export default {
    id: 'REF_COSINE_GEN',
    name: 'Косинусный генератор',
    description: 'Управляемый референсный косинусный генератор',
    icon: 'graphic_eq',
    group: 'generators',
    groupOrder: 3,
    signals: { input: null, output: 'real' },
    defaultParams: { frequency: 1000, amplitude: 1.0, phase: 0, controllable: true },
    paramFields: [
        { name: 'frequency', label: 'Частота (Гц)', type: 'number', min: 1, max: 20000, step: 10, defaultValue: 1000 },
        { name: 'amplitude', label: 'Амплитуда', type: 'number', min: 0.1, max: 10, step: 0.1, defaultValue: 1.0 },
        { name: 'phase', label: 'Фаза (рад)', type: 'number', min: 0, max: 6.28, step: 0.01, defaultValue: 0 },
    ],
    validate(params) {
        const errors = [];
        if (!params.frequency || params.frequency <= 0) {
            errors.push('Частота должна быть положительной');
        }
        if (params.amplitude === undefined || params.amplitude <= 0) {
            errors.push('Амплитуда должна быть положительной');
        }
        return errors;
    },
    process(ctx) {
        const { params, state, sampleRate, bufferSize } = ctx;
        const { frequency = 1000, amplitude = 1.0, phase = 0 } = params;
        const currentPhase = state.phase ?? phase;
        const output = DSPLib.generateCosine(frequency, amplitude, sampleRate, bufferSize, currentPhase);
        state.phase = currentPhase + 2 * Math.PI * frequency / sampleRate * bufferSize;
        return output;
    },
};
