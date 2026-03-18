/**
 * MicrophoneService — сервис захвата аудио с микрофона / линейного входа
 *
 * Использует navigator.mediaDevices.getUserMedia() для получения аудиопотока,
 * ScriptProcessorNode для чтения PCM-данных в кольцевой буфер.
 * DSPProcessor вызывает readChunk() для получения очередного фрагмента данных.
 *
 * Примечание: ScriptProcessorNode deprecated, но AudioWorkletNode требует
 * отдельного файла-воркера и SharedArrayBuffer. При миграции на AudioWorklet
 * потребуется SharedArrayBuffer + Atomics для потокобезопасного кольцевого буфера.
 */

class MicrophoneServiceSingleton {
    private stream: MediaStream | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private processorNode: ScriptProcessorNode | null = null;
    private silentGain: GainNode | null = null;
    private ringBuffer: Float32Array = new Float32Array(0);
    private writePos = 0;
    private readPos = 0;
    private _isActive = false;
    private readonly bufferSize = 65536; // кольцевой буфер ~1.4 сек при 48 кГц

    get isActive(): boolean {
        return this._isActive;
    }

    /**
     * Запускает захват аудио с микрофона.
     * Требует активный (не закрытый) AudioContext.
     */
    async start(audioContext: AudioContext): Promise<void> {
        if (this._isActive) return;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
        } catch (err) {
            throw new Error(
                `Microphone access denied: ${err instanceof Error ? err.message : String(err)}`
            );
        }

        this.ringBuffer = new Float32Array(this.bufferSize);
        this.writePos = 0;
        this.readPos = 0;

        this.sourceNode = audioContext.createMediaStreamAudioSource(this.stream);

        // ScriptProcessorNode для захвата PCM-данных в кольцевой буфер
        this.processorNode = audioContext.createScriptProcessor(4096, 1, 1);
        this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
            const input = event.inputBuffer.getChannelData(0);
            for (let i = 0; i < input.length; i++) {
                // Проверяем, не догнал ли writePos readPos (переполнение буфера).
                // При переполнении отбрасываем старейший отсчёт, сдвигая readPos.
                const nextWrite = (this.writePos + 1) % this.bufferSize;
                if (nextWrite === this.readPos) {
                    this.readPos = (this.readPos + 1) % this.bufferSize;
                }
                this.ringBuffer[this.writePos] = input[i];
                this.writePos = nextWrite;
            }
        };

        this.sourceNode.connect(this.processorNode);

        // ScriptProcessorNode требует подключения к destination для работы.
        // Используем GainNode с gain=0, чтобы микрофон НЕ воспроизводился
        // в колонках (предотвращаем аудио-фидбек).
        this.silentGain = audioContext.createGain();
        this.silentGain.gain.value = 0;
        this.processorNode.connect(this.silentGain);
        this.silentGain.connect(audioContext.destination);

        this._isActive = true;
    }

    /**
     * Читает chunkSize сэмплов из кольцевого буфера.
     * Если данных недостаточно — возвращает то, что есть, остальное заполняет нулями.
     */
    readChunk(chunkSize: number, gain: number = 1.0): Float32Array {
        const output = new Float32Array(chunkSize);

        if (!this._isActive) return output;

        const clampedGain = Math.max(0, Math.min(gain, 10));

        for (let i = 0; i < chunkSize; i++) {
            if (this.readPos !== this.writePos) {
                output[i] = this.ringBuffer[this.readPos] * clampedGain;
                this.readPos = (this.readPos + 1) % this.bufferSize;
            }
            // Если readPos === writePos — данных нет, output[i] остаётся 0
        }

        return output;
    }

    /**
     * Останавливает захват и освобождает ресурсы.
     * Безопасен для повторного вызова (идемпотентный).
     */
    stop(): void {
        if (this.processorNode) {
            this.processorNode.onaudioprocess = null;
            this.processorNode.disconnect();
            this.processorNode = null;
        }

        if (this.silentGain) {
            this.silentGain.disconnect();
            this.silentGain = null;
        }

        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.ringBuffer = new Float32Array(0);
        this.writePos = 0;
        this.readPos = 0;
        this._isActive = false;
    }
}

const MicrophoneService = new MicrophoneServiceSingleton();
export default MicrophoneService;
