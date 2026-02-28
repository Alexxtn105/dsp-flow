export default {
    type: 'Audio File',
    id: 'audio-file',
    icon: 'dsp-audio-file',
    description: 'Источник аудиофайла',
    group: 'generators',
    signals: { input: null, output: 'real' },
    defaultParams: {
        wavFile: null,
        muted: false,
    },
    processor: {
        process(inputs, params, chunkSize) {
            // Этот блок обрабатывается в DSPProcessor (читает файл)
            // Если вызван process, возвращаем тишину
            return new Float32Array(chunkSize);
        }
    }
};
