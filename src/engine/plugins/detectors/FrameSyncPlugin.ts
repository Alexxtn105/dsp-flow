/**
 * Плагин кадровой синхронизации (Frame Synchronization)
 *
 * Реализует обнаружение начала кадра методом скользящей корреляции
 * входного сигнала с известной преамбулой (последовательность Баркера):
 *
 *   Вход (real) ──► Скользящий коррелятор ──► Пороговый детектор ──► Выход (real)
 *                         ▲
 *                    Преамбула (Barker)
 *
 * Архитектура:
 *   1. Буфер истории — хранит последние N сэмплов (N = длина преамбулы)
 *      для вычисления скользящей корреляции
 *   2. Скользящая корреляция — для каждого входного сэмпла вычисляется
 *      скалярное произведение буфера истории с преамбулой:
 *        corr = ∑ history[k] · preamble[k],  k = 0..N-1
 *   3. Пороговый детектор — если |corr| > threshold × N, на выход
 *      подаётся значение корреляции, иначе 0
 *
 * Встроенные преамбулы:
 *   - Barker-13: [+1,+1,+1,+1,+1,−1,−1,+1,+1,−1,+1,−1,+1]
 *     Боковые лепестки автокорреляции ≤ 1 (оптимальная для обнаружения)
 *   - Barker-7:  [+1,+1,+1,−1,−1,+1,−1]
 *     Более короткая, подходит для низких задержек
 *
 * Параметры:
 *   - preambleType: тип преамбулы ('barker13' или 'barker7')
 *   - threshold: порог обнаружения (0..1), относительно длины преамбулы
 *
 * Вход:  real (Float32Array)
 * Выход: real — значение корреляции при превышении порога, иначе 0
 *
 * Примеры использования:
 *
 *   1. Обнаружение начала кадра в BPSK-потоке:
 *      PSKModulator(BPSK) → FrameSync(barker13, threshold=0.7)
 *      → Oscilloscope
 *      На осциллографе видны пики корреляции в моменты появления
 *      преамбулы Баркера-13 во входном потоке.
 *
 *   2. Синхронизация в зашумлённом канале:
 *      PSKModulator(BPSK) → AWGNChannel(SNR=5дБ) → FrameSync(barker13, threshold=0.5)
 *      → Oscilloscope
 *      Последовательности Баркера обладают хорошими корреляционными
 *      свойствами, что позволяет обнаруживать преамбулу даже при
 *      низком SNR. Снижение порога компенсирует потери от шума.
 *
 *   3. Кадровая синхронизация с короткой преамбулой:
 *      Генератор → FrameSync(barker7, threshold=0.8) → Oscilloscope
 *      Barker-7 обеспечивает меньшую задержку обнаружения
 *      ценой более узкого пика корреляции.
 */
import type { PluginDefinition } from '../../types';

interface FrameSyncState {
    history: Float32Array;
    historyIndex: number;
}

/** Последовательности Баркера */
const BARKER_SEQUENCES: Record<string, number[]> = {
    barker13: [+1, +1, +1, +1, +1, -1, -1, +1, +1, -1, +1, -1, +1],
    barker7:  [+1, +1, +1, -1, -1, +1, -1],
};

const FrameSyncPlugin = {
    type: 'Кадровая синхронизация',
    id: 'frame-sync',
    icon: 'dsp-frame-sync',
    description: 'Обнаружение начала кадра по корреляции с преамбулой Баркера',
    group: 'detectors',
    signals: {
        input: 'real' as const,
        output: 'real' as const,
    },
    defaultParams: {
        preambleType: 'barker13',
        threshold: 0.7,
    },
    processor: {
        states: new Map<string, FrameSyncState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): { outputs: Float32Array[] } {
            const output = new Float32Array(chunkSize);
            const input = inputs[0];

            if (!input) return { outputs: [output] };

            const preambleType = (params.preambleType ?? 'barker13') as string;
            const threshold = (params.threshold ?? 0.7) as number;

            // Выбор последовательности преамбулы
            const preamble = BARKER_SEQUENCES[preambleType] ?? BARKER_SEQUENCES['barker13'];
            const preambleLen = preamble.length;

            // Инициализация состояния
            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    history: new Float32Array(preambleLen),
                    historyIndex: 0,
                });
            }
            const state = this.states.get(nodeId)!;

            // Пересоздание буфера при смене типа преамбулы
            if (state.history.length !== preambleLen) {
                state.history = new Float32Array(preambleLen);
                state.historyIndex = 0;
            }

            const detectionThreshold = threshold * preambleLen;

            for (let i = 0; i < chunkSize; i++) {
                // Сдвиг нового сэмпла в кольцевой буфер
                state.history[state.historyIndex] = input[i];
                state.historyIndex = (state.historyIndex + 1) % preambleLen;

                // Скользящая корреляция с преамбулой
                let correlation = 0;
                for (let k = 0; k < preambleLen; k++) {
                    // Читаем из кольцевого буфера в правильном порядке:
                    // самый старый сэмпл — по текущему historyIndex
                    const bufIdx = (state.historyIndex + k) % preambleLen;
                    correlation += state.history[bufIdx] * preamble[k];
                }

                // Пороговое обнаружение
                if (Math.abs(correlation) > detectionThreshold) {
                    output[i] = correlation;
                } else {
                    output[i] = 0;
                }
            }

            return { outputs: [output] };
        }
    }
};

export default FrameSyncPlugin satisfies PluginDefinition;
