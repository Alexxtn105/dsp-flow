/**
 * Линия задержки — задержка сигнала на N отсчётов
 *
 * Назначение:
 *   Задерживает входной сигнал на заданное количество отсчётов (сэмплов).
 *   Линия задержки — фундаментальный строительный блок в ЦОС: используется
 *   в гребёнчатых фильтрах, эхо-эффектах, компенсации групповой задержки
 *   других фильтров, корреляционном анализе и многих других задачах.
 *   До заполнения буфера (первые N отсчётов) на выходе — нули.
 *
 * Алгоритм:
 *   Реализована через кольцевой буфер (circular buffer) размером N.
 *   На каждом отсчёте: считывается значение из текущей позиции буфера
 *   (это задержанный сигнал), затем в ту же позицию записывается новый
 *   входной отсчёт, и указатель сдвигается по кольцу. Это обеспечивает
 *   задержку ровно на N отсчётов с O(1) на отсчёт.
 *
 *   При изменении длины задержки в процессе работы буфер пересоздаётся
 *   с копированием хвоста старого буфера — это предотвращает щелчки
 *   и разрывы в сигнале.
 *
 * Параметры:
 *   - delaySamples (int, по умолчанию 100) — количество отсчётов задержки.
 *     Задержка в секундах = delaySamples / sampleRate. Например, при
 *     sampleRate=48000: 100 отсчётов ≈ 2.08 мс, 48000 отсчётов = 1 секунда.
 *     Допустимый диапазон: 0 .. ∞ (при 0 сигнал проходит без изменений).
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array) — задержанная копия входного сигнала
 *
 * Примеры использования:
 *
 *   1. Простое эхо:
 *      Sine(1000) → DelayLine(4800) → Summer(с оригиналом) → Oscilloscope
 *      Сумма оригинала и задержанной на 100 мс копии создаёт эхо-эффект.
 *
 *   2. Компенсация задержки фильтра:
 *      Signal ─┬─→ LowpassFIR(order=64) → Summer → Oscilloscope
 *              └─→ DelayLine(32)        ──↗
 *      Задержка 32 отсчёта компенсирует групповую задержку ФНЧ 64-го порядка
 *      (order/2), позволяя корректно вычесть отфильтрованный сигнал.
 *
 *   3. Корреляционный анализ:
 *      Signal → DelayLine(N) → Correlator(с оригиналом)
 *      Автокорреляция с задержкой N позволяет обнаруживать периодичности.
 */
import type { PluginDefinition } from '../../types';

interface DelayLineState {
    buf: Float32Array;
    pos: number;
}

export default {
    type: 'Линия задержки',
    id: 'delay-line',
    icon: 'dsp-delay',
    description: 'Линия задержки на N отсчётов',
    group: 'filters',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {
        delaySamples: 100,
    },
    processor: {
        states: new Map<string, DelayLineState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const N = Math.max(0, Math.floor((params.delaySamples as number) ?? 100));

            if (N === 0) {
                return new Float32Array(input);
            }

            let state = this.states.get(nodeId);

            // Пересоздаём буфер при смене длины задержки
            if (!state || state.buf.length !== N) {
                const buf = new Float32Array(N);
                // Если буфер уже был — копируем хвост старого
                if (state) {
                    const old = state.buf;
                    const oldLen = old.length;
                    const oldPos = state.pos;
                    const copyLen = Math.min(oldLen, N);
                    // Читаем последние copyLen отсчётов из старого буфера
                    for (let i = N - copyLen; i < N; i++) {
                        buf[i] = old[(oldPos + oldLen - copyLen + (i - (N - copyLen))) % oldLen];
                    }
                    state = { buf, pos: 0 };
                } else {
                    state = { buf, pos: 0 };
                }
                this.states.set(nodeId, state);
            }

            const buf = state.buf;
            let pos = state.pos;
            const output = new Float32Array(chunkSize);

            for (let i = 0; i < chunkSize; i++) {
                output[i] = buf[pos];
                buf[pos] = i < input.length ? input[i] : 0;
                pos = (pos + 1) % N;
            }

            state.pos = pos;
            return output;
        }
    }
};
