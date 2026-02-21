export default {
    id: 'AUDIO_FILE',
    name: 'Аудио-файл',
    description: 'Загрузка WAV файла',
    icon: 'audio_file',
    group: 'generators',
    groupOrder: 0,
    signals: { input: null, output: 'real' },
    defaultParams: { fileName: '', sampleRate: 48000, channels: 1, loop: false, audioData: null },
    paramFields: [
        { name: 'loop', label: 'Зациклить воспроизведение', type: 'checkbox', defaultValue: false },
    ],
    validate(params) {
        const errors = [];
        if (params.loop && typeof params.loop !== 'boolean') {
            errors.push('Параметр loop должен быть boolean');
        }
        return errors;
    },
    process(ctx) {
        const { params, state, bufferSize } = ctx;
        if (!params.audioData || !params.audioData.samples) {
            return new Float32Array(bufferSize);
        }

        if (state.offset == null) state.offset = 0;

        const samples = params.audioData.samples;
        const output = new Float32Array(bufferSize);
        let written = 0;

        while (written < bufferSize) {
            const remaining = samples.length - state.offset;
            if (remaining <= 0) {
                if (params.loop) { state.offset = 0; continue; }
                break;
            }
            const toCopy = Math.min(bufferSize - written, remaining);
            output.set(samples.subarray(state.offset, state.offset + toCopy), written);
            state.offset += toCopy;
            written += toCopy;
        }

        return output;
    },
};
