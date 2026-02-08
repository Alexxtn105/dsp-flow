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
    }

    /**
     * Инициализирует AudioContext
     */
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * Загружает WAV файл
     * @param {File} file - объект File
     * @returns {Promise<Object>} метаданные файла
     */
    async loadFile(file) {
        this.init();
        this.file = file;

        const arrayBuffer = await file.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        return {
            sampleRate: this.audioBuffer.sampleRate,
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
        return this.audioBuffer?.sampleRate || 48000;
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
            return null; // Достигнут конец файла
        }

        return channelData.slice(startSample, endSample);
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
    }

    /**
     * Закрытие AudioContext
     */
    close() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.reset();
    }
}

export default new WavFileService();
