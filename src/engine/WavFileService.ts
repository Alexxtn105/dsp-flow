/**
 * WavFileService - сервис для работы с WAV файлами
 *
 * Использует Web Audio API для:
 * - Загрузки и декодирования WAV файлов
 * - Извлечения sample rate
 * - Чтения чанков аудио данных
 */

import type { WavFileMetadata } from './types';

class WavFileService {
    audioContext: AudioContext | null = null;
    audioBuffer: AudioBuffer | null = null;
    file: File | null = null;
    private _ownsContext = false;

    /**
     * Инициализирует AudioContext (или переиспользует внешний)
     */
    init(externalContext?: AudioContext): AudioContext {
        if (externalContext && externalContext.state !== 'closed') {
            this.audioContext = externalContext;
            this._ownsContext = false;
        } else if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            this._ownsContext = true;
        }
        return this.audioContext!;
    }

    /**
     * Загружает WAV файл
     */
    async loadFile(file: File): Promise<WavFileMetadata> {
        this.init();
        this.file = file;

        const arrayBuffer = await file.arrayBuffer();
        this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

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
    getSampleRate(): number {
        return this.audioBuffer?.sampleRate || 48000;
    }

    /**
     * Возвращает общее количество отсчётов
     */
    getTotalSamples(): number {
        return this.audioBuffer?.length || 0;
    }

    /**
     * Возвращает длительность в секундах
     */
    getDuration(): number {
        return this.audioBuffer?.duration || 0;
    }

    /**
     * Читает чанк аудио данных
     */
    readChunk(startSample: number, chunkSize: number, channel = 0): Float32Array {
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
     */
    readChunkAllChannels(startSample: number, chunkSize: number): Float32Array[] {
        if (!this.audioBuffer) {
            return [new Float32Array(chunkSize)];
        }

        const channels: Float32Array[] = [];
        for (let i = 0; i < this.audioBuffer.numberOfChannels; i++) {
            channels.push(this.readChunk(startSample, chunkSize, i));
        }
        return channels;
    }

    /**
     * Проверяет, достигнут ли конец файла
     */
    isEndOfFile(currentSample: number): boolean {
        return currentSample >= this.getTotalSamples();
    }

    /**
     * Сброс состояния
     */
    reset(): void {
        this.audioBuffer = null;
        this.file = null;
    }

    /**
     * Закрытие AudioContext (только если WavFileService его создал)
     */
    close(): void {
        if (this.audioContext && this._ownsContext) {
            this.audioContext.close();
        }
        this.audioContext = null;
        this._ownsContext = false;
        this.reset();
    }
}

export default new WavFileService();
