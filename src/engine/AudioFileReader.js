/**
 * AudioFileReader - модуль для чтения аудио файлов (WAV)
 */

export class AudioFileReader {
    /**
     * Загрузка WAV файла
     */
    static async loadWavFile(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();

            // Создаем аудио контекст
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Декодируем аудио данные
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Извлекаем сэмплы из первого канала
            const samples = audioBuffer.getChannelData(0);

            return {
                samples: new Float32Array(samples),
                sampleRate: audioBuffer.sampleRate,
                duration: audioBuffer.duration,
                numberOfChannels: audioBuffer.numberOfChannels,
                length: audioBuffer.length
            };
        } catch (error) {
            console.error('Ошибка загрузки аудио файла:', error);
            throw error;
        }
    }

    /**
     * Генератор блоков данных из аудио файла
     */
    static *generateBlocks(audioData, blockSize) {
        const { samples } = audioData;
        let offset = 0;

        while (offset < samples.length) {
            const remainingSamples = samples.length - offset;
            const currentBlockSize = Math.min(blockSize, remainingSamples);

            const block = new Float32Array(blockSize);
            block.set(samples.subarray(offset, offset + currentBlockSize));

            // Если блок неполный - дополняем нулями
            if (currentBlockSize < blockSize) {
                block.fill(0, currentBlockSize);
            }

            yield block;
            offset += currentBlockSize;
        }
    }

    /**
     * Создание циклического генератора (для loop)
     */
    static *loopingGenerator(audioData, blockSize) {
        while (true) {
            yield* this.generateBlocks(audioData, blockSize);
        }
    }
}

export default AudioFileReader;