import { describe, it, expect, beforeEach } from 'vitest';
import WavFileService from '../../src/engine/WavFileService.js';

// Mock AudioContext для Node.js
globalThis.window = globalThis.window || {};
window.AudioContext = class MockAudioContext {
    constructor() { this.state = 'running'; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    async decodeAudioData() {
        return {
            sampleRate: 44100,
            duration: 2.0,
            numberOfChannels: 2,
            length: 88200,
            getChannelData(ch) {
                const data = new Float32Array(88200);
                for (let i = 0; i < data.length; i++) {
                    data[i] = ch === 0 ? Math.sin(i * 0.1) : Math.cos(i * 0.1);
                }
                return data;
            }
        };
    }
    createBuffer() { return { getChannelData: () => new Float32Array(1024) }; }
    createBufferSource() { return { buffer: null, connect() {}, start() {} }; }
    get destination() { return {}; }
};

/**
 * Создаёт минимальный WAV-заголовок (44 байта) с указанной частотой дискретизации
 */
function buildWavHeader(sampleRate) {
    const buf = new ArrayBuffer(44);
    const view = new DataView(buf);
    view.setUint32(0, 0x52494646, false);  // "RIFF"
    view.setUint32(4, 36, true);            // file size - 8
    view.setUint32(8, 0x57415645, false);  // "WAVE"
    view.setUint32(12, 0x666D7420, false); // "fmt "
    view.setUint32(16, 16, true);           // fmt chunk size
    view.setUint16(20, 1, true);            // PCM
    view.setUint16(22, 1, true);            // mono
    view.setUint32(24, sampleRate, true);   // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true);            // block align
    view.setUint16(34, 16, true);           // bits per sample
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, 0, true);            // data size
    return buf;
}

describe('WavFileService', () => {
    beforeEach(() => {
        WavFileService.close();
    });

    describe('init()', () => {
        it('создаёт собственный AudioContext если не передан внешний', () => {
            const ctx = WavFileService.init();
            expect(ctx).toBeDefined();
            expect(WavFileService._ownsContext).toBe(true);
        });

        it('переиспользует внешний AudioContext', () => {
            const externalCtx = new window.AudioContext();
            const ctx = WavFileService.init(externalCtx);
            expect(ctx).toBe(externalCtx);
            expect(WavFileService._ownsContext).toBe(false);
        });

        it('не создаёт новый контекст если уже есть', () => {
            const ctx1 = WavFileService.init();
            const ctx2 = WavFileService.init();
            expect(ctx1).toBe(ctx2);
        });
    });

    describe('parseWavSampleRate()', () => {
        it('извлекает sample rate из валидного WAV-заголовка', () => {
            expect(WavFileService.parseWavSampleRate(buildWavHeader(44100))).toBe(44100);
            expect(WavFileService.parseWavSampleRate(buildWavHeader(8000))).toBe(8000);
            expect(WavFileService.parseWavSampleRate(buildWavHeader(48000))).toBe(48000);
            expect(WavFileService.parseWavSampleRate(buildWavHeader(96000))).toBe(96000);
        });

        it('возвращает null для невалидного буфера', () => {
            expect(WavFileService.parseWavSampleRate(new ArrayBuffer(10))).toBeNull();
            expect(WavFileService.parseWavSampleRate(new ArrayBuffer(100))).toBeNull();
        });

        it('возвращает null для буфера без RIFF-заголовка', () => {
            const buf = new ArrayBuffer(44);
            const view = new DataView(buf);
            view.setUint32(0, 0x00000000, false);
            expect(WavFileService.parseWavSampleRate(buf)).toBeNull();
        });
    });

    describe('loadFile()', () => {
        it('загружает файл и возвращает метаданные (fallback без WAV-заголовка)', async () => {
            const mockFile = {
                name: 'test.wav',
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
            };

            const info = await WavFileService.loadFile(mockFile);

            expect(info.sampleRate).toBe(44100);
            expect(info.duration).toBe(2.0);
            expect(info.numberOfChannels).toBe(2);
            expect(info.length).toBe(88200);
            expect(info.fileName).toBe('test.wav');
        });

        it('использует sample rate из WAV-заголовка', async () => {
            const mockFile = {
                name: 'test_8k.wav',
                arrayBuffer: () => Promise.resolve(buildWavHeader(8000))
            };

            const info = await WavFileService.loadFile(mockFile);

            expect(info.sampleRate).toBe(8000);
            expect(WavFileService.originalSampleRate).toBe(8000);
            expect(WavFileService.getSampleRate()).toBe(8000);
        });
    });

    describe('readChunk()', () => {
        it('возвращает пустой буфер если файл не загружен', () => {
            const chunk = WavFileService.readChunk(0, 1024);
            expect(chunk.length).toBe(1024);
            expect(chunk.every(v => v === 0)).toBe(true);
        });

        it('читает чанк после загрузки файла', async () => {
            const mockFile = {
                name: 'test.wav',
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
            };
            await WavFileService.loadFile(mockFile);

            const chunk = WavFileService.readChunk(0, 1024);
            expect(chunk.length).toBe(1024);
            // Данные должны содержать sin-значения (канал 0)
            expect(chunk[0]).toBeCloseTo(Math.sin(0));
            expect(chunk[1]).toBeCloseTo(Math.sin(0.1));
        });

        it('возвращает zero-padded буфер в конце файла', async () => {
            const mockFile = {
                name: 'test.wav',
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
            };
            await WavFileService.loadFile(mockFile);

            // Читаем чанк на границе файла (88200 - 512 = 87688)
            const chunk = WavFileService.readChunk(87688, 1024);
            expect(chunk.length).toBe(1024);
            // Первые 512 сэмплов — данные, остальные — нули
            expect(chunk[511]).not.toBe(0);
            expect(chunk[512]).toBe(0);
        });

        it('возвращает пустой буфер за пределами файла', async () => {
            const mockFile = {
                name: 'test.wav',
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
            };
            await WavFileService.loadFile(mockFile);

            const chunk = WavFileService.readChunk(100000, 1024);
            expect(chunk.length).toBe(1024);
            expect(chunk.every(v => v === 0)).toBe(true);
        });
    });

    describe('readChunkAllChannels()', () => {
        it('возвращает все каналы', async () => {
            const mockFile = {
                name: 'test.wav',
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
            };
            await WavFileService.loadFile(mockFile);

            const channels = WavFileService.readChunkAllChannels(0, 512);
            expect(channels.length).toBe(2);
            expect(channels[0].length).toBe(512);
            expect(channels[1].length).toBe(512);
        });
    });

    describe('getSampleRate()', () => {
        it('возвращает 48000 по умолчанию', () => {
            expect(WavFileService.getSampleRate()).toBe(48000);
        });

        it('возвращает sampleRate загруженного файла', async () => {
            const mockFile = {
                name: 'test.wav',
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
            };
            await WavFileService.loadFile(mockFile);
            expect(WavFileService.getSampleRate()).toBe(44100);
        });
    });

    describe('isEndOfFile()', () => {
        it('возвращает true при currentSample >= totalSamples', async () => {
            const mockFile = {
                name: 'test.wav',
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
            };
            await WavFileService.loadFile(mockFile);

            expect(WavFileService.isEndOfFile(88200)).toBe(true);
            expect(WavFileService.isEndOfFile(100000)).toBe(true);
            expect(WavFileService.isEndOfFile(0)).toBe(false);
        });
    });

    describe('reset()', () => {
        it('очищает audioBuffer, file и originalSampleRate', async () => {
            const mockFile = {
                name: 'test.wav',
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
            };
            await WavFileService.loadFile(mockFile);

            WavFileService.reset();

            expect(WavFileService.audioBuffer).toBeNull();
            expect(WavFileService.file).toBeNull();
            expect(WavFileService.originalSampleRate).toBeNull();
            expect(WavFileService.getTotalSamples()).toBe(0);
        });
    });

    describe('close()', () => {
        it('закрывает AudioContext если WavFileService его создал', () => {
            WavFileService.init();
            expect(WavFileService.audioContext).not.toBeNull();

            WavFileService.close();
            expect(WavFileService.audioContext).toBeNull();
        });

        it('не закрывает внешний AudioContext', () => {
            const externalCtx = new window.AudioContext();
            WavFileService.init(externalCtx);

            WavFileService.close();
            // Внешний контекст не закрыт
            expect(externalCtx.state).toBe('running');
        });
    });
});
