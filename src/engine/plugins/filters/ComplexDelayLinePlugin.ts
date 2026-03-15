/**
 * Комплексная линия задержки — задержка комплексного сигнала на N отсчётов
 *
 * Назначение:
 *   Задерживает комплексный входной сигнал (Re + jIm) на заданное количество
 *   отсчётов. Аналог DelayLine для комплексных сигналов: используется
 *   в комплексных гребёнчатых фильтрах, компенсации задержки в IQ-трактах,
 *   корреляции комплексных сигналов и других задачах.
 *
 * Алгоритм:
 *   Два независимых кольцевых буфера для Re и Im компонент.
 *   На каждом отсчёте: считывается задержанное значение, записывается новое,
 *   указатель сдвигается. O(1) на отсчёт.
 *
 * Параметры:
 *   - delaySamples (int, по умолчанию 100) — количество отсчётов задержки.
 *
 * Вход:  complex (Float32Array — чередование Re/Im)
 * Выход: complex (Float32Array — чередование Re/Im)
 */
import type { PluginDefinition } from '../../types';

interface ComplexDelayLineState {
    bufRe: Float32Array;
    bufIm: Float32Array;
    pos: number;
}

export default {
    type: 'Комплексная линия задержки',
    id: 'complex-delay-line',
    icon: 'dsp-delay',
    description: 'Комплексная линия задержки на N отсчётов',
    group: 'filters',
    signals: { input: 'complex', output: 'complex' } as const,
    defaultParams: {
        delaySamples: 100,
    },
    processor: {
        states: new Map<string, ComplexDelayLineState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            const N = Math.max(0, Math.floor((params.delaySamples as number) ?? 100));

            if (N === 0) {
                return new Float32Array(input);
            }

            let state = this.states.get(nodeId);

            if (!state || state.bufRe.length !== N) {
                const bufRe = new Float32Array(N);
                const bufIm = new Float32Array(N);
                if (state) {
                    const oldRe = state.bufRe;
                    const oldIm = state.bufIm;
                    const oldLen = oldRe.length;
                    const oldPos = state.pos;
                    const copyLen = Math.min(oldLen, N);
                    for (let i = N - copyLen; i < N; i++) {
                        const srcIdx = (oldPos + oldLen - copyLen + (i - (N - copyLen))) % oldLen;
                        bufRe[i] = oldRe[srcIdx];
                        bufIm[i] = oldIm[srcIdx];
                    }
                    state = { bufRe, bufIm, pos: 0 };
                } else {
                    state = { bufRe, bufIm, pos: 0 };
                }
                this.states.set(nodeId, state);
            }

            const { bufRe, bufIm } = state;
            let pos = state.pos;
            const output = new Float32Array(chunkSize * 2);
            const inputSamples = input.length >> 1;

            for (let i = 0; i < chunkSize; i++) {
                const re = i < inputSamples ? input[i * 2] : 0;
                const im = i < inputSamples ? input[i * 2 + 1] : 0;

                output[i * 2] = bufRe[pos];
                output[i * 2 + 1] = bufIm[pos];

                bufRe[pos] = re;
                bufIm[pos] = im;

                pos = (pos + 1) % N;
            }

            state.pos = pos;
            return output;
        }
    }
} satisfies PluginDefinition;
