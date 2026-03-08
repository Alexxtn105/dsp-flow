/**
 * Логарифм / Экспонента
 *
 * Поддерживаемые функции:
 * - ln (натуральный логарифм)
 * - log10 (десятичный логарифм)
 * - dB (20·log10|x|)
 * - exp (экспонента)
 * - pow10 (10^x)
 */

const LogExpPlugin = {
    type: 'Логарифм/Экспонента',
    id: 'log-exp',
    icon: 'dsp-log',
    description: 'Логарифмические и экспоненциальные функции',
    group: 'math-blocks',

    signals: {
        input: 'real',
        output: 'real'
    },

    defaultParams: {
        function: 'ln',
        epsilon: 1e-10
    },

    processor: {
        states: new Map(),

        clearStates() {
            this.states.clear();
        },

        process(inputs, params, chunkSize) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const func = params.function ?? 'ln';
            const eps = params.epsilon ?? 1e-10;
            const output = new Float32Array(chunkSize);

            for (let i = 0; i < chunkSize; i++) {
                const x = input[i];

                switch (func) {
                    case 'ln':
                        output[i] = Math.log(Math.max(Math.abs(x), eps));
                        break;
                    case 'log10':
                        output[i] = Math.log10(Math.max(Math.abs(x), eps));
                        break;
                    case 'dB':
                        output[i] = 20 * Math.log10(Math.max(Math.abs(x), eps));
                        break;
                    case 'exp':
                        output[i] = Math.exp(Math.min(x, 88));
                        break;
                    case 'pow10':
                        output[i] = Math.pow(10, Math.min(x, 38));
                        break;
                    default:
                        output[i] = x;
                }
            }

            return output;
        }
    }
};

export default LogExpPlugin;
