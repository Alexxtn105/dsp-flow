export default {
    type: 'Линия задержки',
    id: 'delay-line',
    icon: 'dsp-delay',
    description: 'Линия задержки на N отсчётов',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        delaySamples: 100,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const N = Math.max(0, Math.floor(params.delaySamples ?? 100));

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
                    let oldPos = state.pos;
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
