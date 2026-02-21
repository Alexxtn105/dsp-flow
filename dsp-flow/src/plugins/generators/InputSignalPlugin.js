import DSPLib from '../../engine/DSPLib';

export default {
    id: 'INPUT_SIGNAL',
    name: 'Входной сигнал',
    description: 'Генератор входного сигнала',
    icon: 'network_ping',
    group: 'generators',
    groupOrder: 1,
    signals: { input: null, output: 'real' },
    defaultParams: { frequency: 1000, amplitude: 1.0, signalType: 'sine' },
    paramFields: [
        { name: 'frequency', label: 'Частота (Гц)', type: 'number', min: 1, max: 20000, step: 10, defaultValue: 1000 },
        { name: 'amplitude', label: 'Амплитуда', type: 'number', min: 0.1, max: 10, step: 0.1, defaultValue: 1.0 },
        {
            name: 'signalType', label: 'Тип сигнала', type: 'select',
            options: [{ value: 'sine', label: 'Синус' }, { value: 'cosine', label: 'Косинус' }],
            defaultValue: 'sine',
        },
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
        const { frequency = 1000, amplitude = 1.0, signalType = 'sine' } = params;
        const currentPhase = state.phase ?? 0;

        const output = signalType === 'sine'
            ? DSPLib.generateSine(frequency, amplitude, sampleRate, bufferSize, currentPhase)
            : DSPLib.generateCosine(frequency, amplitude, sampleRate, bufferSize, currentPhase);

        state.phase = currentPhase + 2 * Math.PI * frequency / sampleRate * bufferSize;
        return output;
    },
};
