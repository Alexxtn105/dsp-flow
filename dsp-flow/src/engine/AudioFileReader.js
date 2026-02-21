/**
 * AudioFileReader - модуль для чтения аудио файлов
 */

export class AudioFileReader {
    static MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

    /**
     * Загрузка WAV файла
     */
    static async loadWavFile(file) {
        if (file.size > this.MAX_FILE_SIZE) {
            throw new Error(`Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум: ${this.MAX_FILE_SIZE / 1024 / 1024} МБ`);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                let audioContext = null;
                try {
                    const arrayBuffer = e.target.result;
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                    // Извлекаем сэмплы из первого канала
                    const samples = audioBuffer.getChannelData(0);

                    resolve({
                        fileName: file.name,
                        samples: new Float32Array(samples),
                        sampleRate: audioBuffer.sampleRate,
                        duration: audioBuffer.duration,
                        numberOfChannels: audioBuffer.numberOfChannels,
                        length: audioBuffer.length,
                        fileSize: file.size
                    });
                } catch (_error) {
                    reject(new Error('Ошибка декодирования аудио файла'));
                } finally {
                    if (audioContext) {
                        audioContext.close();
                    }
                }
            };

            reader.onerror = () => {
                reject(new Error('Ошибка чтения файла'));
            };

            reader.readAsArrayBuffer(file);
        });
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
     * Проверка формата файла
     */
    static isValidWavFile(file) {
        const validExtensions = ['.wav', '.wave'];
        const fileName = file.name.toLowerCase();

        return validExtensions.some(ext => fileName.endsWith(ext));
    }
}

export default AudioFileReader;