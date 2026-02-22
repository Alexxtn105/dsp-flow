import WindowFunctions from '../_shared/WindowFunctions.js';

export default {
    type: 'Преобразователь Гильберта',
    id: 'hilbert-transformer',
    icon: 'transform',
    description: 'Преобразователь Гильберта',
    group: 'filters',
    signals: { input: 'real', output: 'complex' },
    defaultParams: {
        order: 64,
        phaseShift: 90,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        init(nodeId, params) {
            const order = params.order ?? 64;
            // Порядок должен быть нечётным для симметричного FIR Гильберта
            const N = order % 2 === 0 ? order + 1 : order;
            const M = (N - 1) / 2;
            const windowFn = WindowFunctions.blackman;

            // Коэффициенты FIR-фильтра Гильберта
            const coeffs = new Float32Array(N);
            for (let i = 0; i < N; i++) {
                const n = i - M;
                if (n === 0) {
                    coeffs[i] = 0;
                } else if (n % 2 !== 0) {
                    // h[n] = 2/(pi*n) для нечётных n
                    coeffs[i] = (2 / (Math.PI * n)) * windowFn(i, N);
                } else {
                    coeffs[i] = 0;
                }
            }

            const buffer = new Float32Array(N);

            this.states.set(nodeId, {
                coeffs,
                buffer,
                pointer: 0,
                N,
                delay: M
            });
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            if (!this.states.has(nodeId)) {
                this.init(nodeId, params);
            }
            const state = this.states.get(nodeId);
            const { coeffs, buffer, N, delay } = state;
            let { pointer } = state;

            // Выход: interleaved [I0, Q0, I1, Q1, ...] размером chunkSize * 2
            const output = new Float32Array(input.length * 2);

            for (let i = 0; i < input.length; i++) {
                buffer[pointer] = input[i];

                // Q-компонента: выход FIR фильтра Гильберта
                let q = 0;
                let p = pointer;
                for (let j = 0; j < N; j++) {
                    q += coeffs[j] * buffer[p];
                    p--;
                    if (p < 0) p = N - 1;
                }

                // I-компонента: задержанный вход на delay = (N-1)/2 отсчётов
                let delayedIdx = pointer - delay;
                if (delayedIdx < 0) delayedIdx += N;
                const iComp = buffer[delayedIdx];

                output[i * 2] = iComp;
                output[i * 2 + 1] = q;

                pointer++;
                if (pointer >= N) pointer = 0;
            }

            state.pointer = pointer;
            return output;
        }
    }
};
