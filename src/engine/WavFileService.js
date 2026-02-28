/**
 * WavFileService - сервис для работы с WAV файлами
 *
 * Использует Web Audio API для:
 * - Загрузки и декодирования WAV файлов
 * - Извлечения sample rate
 * - Чтения чанков аудио данных
 */

class WavFileService {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.file = null;
        this.originalSampleRate = null;
    }

    /**
     * Парсит sample rate из WAV-заголовка (fmt-чанк, bytes 24-27)
     * @param {ArrayBuffer} arrayBuffer
     * @returns {number|null} оригинальная частота дискретизации или null
     */
    parseWavSampleRate(arrayBuffer) {
        try {
            const view = new DataView(arrayBuffer);
            if (view.byteLength < 44) return null;
            // "RIFF"
            if (view.getUint32(0, false) !== 0x52494646) return null;
            // "WAVE"
            if (view.getUint32(8, false) !== 0x57415645) return null;

            // Ищем fmt-чанк
            let offset = 12;
            while (offset + 8 <= view.byteLength) {
                const chunkId = view.getUint32(offset, false);
                const chunkSize = view.getUint32(offset + 4, true);
                // "fmt " = 0x666D7420
                if (chunkId === 0x666D7420) {
                    if (offset + 12 + 4 <= view.byteLength) {
                        return view.getUint32(offset + 12, true);
                    }
                    return null;
                }
                offset += 8 + chunkSize;
                if (chunkSize % 2 !== 0) offset++;
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Инициализирует AudioContext (или переиспользует внешний)
     * @param {AudioContext} [externalContext] - внешний AudioContext для переиспользования
     */
    init(externalContext) {
        if (externalContext && externalContext.state !== 'closed') {
            this.audioContext = externalContext;
            this._ownsContext = false;
        } else if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this._ownsContext = true;
        }
        return this.audioContext;
    }

    /**
     * Загружает WAV файл
     * @param {File} file - объект File
     * @returns {Promise<Object>} метаданные файла
     */
    async loadFile(file) {
        this.file = file;

        const arrayBuffer = await file.arrayBuffer();
        const headerSampleRate = this.parseWavSampleRate(arrayBuffer);
        this.originalSampleRate = headerSampleRate;

        // Закрываем старый контекст чтобы создать с правильной частотой
        if (this.audioContext && this._ownsContext) {
            try { this.audioContext.close(); } catch { /* ignore */ }
            this.audioContext = null;
        }

        // Создаём AudioContext с оригинальной частотой файла — без ресемплинга
        if (!this.audioContext || this.audioContext.state === 'closed') {
            const opts = headerSampleRate ? { sampleRate: headerSampleRate } : {};
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)(opts);
            this._ownsContext = true;
        }

        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        return {
            sampleRate: headerSampleRate || this.audioBuffer.sampleRate,
            duration: this.audioBuffer.duration,
            numberOfChannels: this.audioBuffer.numberOfChannels,
            length: this.audioBuffer.length,
            fileName: file.name
        };
    }

    /**
     * Возвращает sample rate текущего файла
     */
    getSampleRate() {
        return this.originalSampleRate || this.audioBuffer?.sampleRate || 48000;
    }

    /**
     * Возвращает общее количество отсчётов
     */
    getTotalSamples() {
        return this.audioBuffer?.length || 0;
    }

    /**
     * Возвращает длительность в секундах
     */
    getDuration() {
        return this.audioBuffer?.duration || 0;
    }

    /**
     * Читает чанк аудио данных
     * @param {number} startSample - начальный отсчёт
     * @param {number} chunkSize - размер чанка в отсчётах
     * @param {number} channel - номер канала (по умолчанию 0)
     * @returns {Float32Array} данные чанка
     */
    readChunk(startSample, chunkSize, channel = 0) {
        if (!this.audioBuffer) {
            return new Float32Array(chunkSize);
        }

        const channelData = this.audioBuffer.getChannelData(channel);
        const endSample = Math.min(startSample + chunkSize, channelData.length);
        const actualSize = endSample - startSample;

        if (actualSize <= 0) {
            return new Float32Array(chunkSize);
        }

        // Всегда возвращаем буфер размером chunkSize (zero-padding в конце)
        if (actualSize < chunkSize) {
            const result = new Float32Array(chunkSize);
            result.set(channelData.subarray(startSample, endSample));
            return result;
        }

        return channelData.subarray(startSample, endSample);
    }

    /**
     * Читает все каналы для чанка
     * @param {number} startSample - начальный отсчёт
     * @param {number} chunkSize - размер чанка
     * @returns {Array<Float32Array>} массив данных по каналам
     */
    readChunkAllChannels(startSample, chunkSize) {
        if (!this.audioBuffer) {
            return [new Float32Array(chunkSize)];
        }

        const channels = [];
        for (let i = 0; i < this.audioBuffer.numberOfChannels; i++) {
            channels.push(this.readChunk(startSample, chunkSize, i));
        }
        return channels;
    }

    /**
     * Проверяет, достигнут ли конец файла
     */
    isEndOfFile(currentSample) {
        return currentSample >= this.getTotalSamples();
    }

    /**
     * Сброс состояния
     */
    reset() {
        this.audioBuffer = null;
        this.file = null;
        this.originalSampleRate = null;
    }

    /**
     * Закрытие AudioContext (только если WavFileService его создал)
     */
    close() {
        if (this.audioContext && this._ownsContext) {
            this.audioContext.close();
        }
        this.audioContext = null;
        this._ownsContext = false;
        this.reset();
    }
}

export default new WavFileService();
