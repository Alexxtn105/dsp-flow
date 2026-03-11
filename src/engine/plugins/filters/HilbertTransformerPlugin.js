/**
 * Преобразователь Гильберта — формирование аналитического сигнала
 *
 * Назначение:
 *   Преобразует вещественный (real) сигнал в комплексный (аналитический).
 *   Аналитический сигнал — это комплексный сигнал вида z(t) = x(t) + j*H{x(t)},
 *   где x(t) — исходный сигнал, а H{x(t)} — его преобразование Гильберта
 *   (сдвиг фазы всех частотных компонентов на 90°). У аналитического сигнала
 *   отсутствуют отрицательные частоты в спектре, что упрощает извлечение
 *   мгновенной амплитуды, частоты и фазы.
 *
 *   Простыми словами: если на входе синусоида cos(wt), то на выходе будет
 *   комплексная экспонента cos(wt) + j*sin(wt), из которой легко получить
 *   амплитуду (модуль) и фазу (аргумент).
 *
 * Алгоритм:
 *   Реализован как КИХ-фильтр (FIR) с коэффициентами преобразования Гильберта:
 *   h[n] = 2/(π*n) для нечётных n, h[n] = 0 для чётных n и n = 0.
 *   Коэффициенты умножаются на окно Блэкмана (Blackman) для подавления
 *   боковых лепестков. Порядок принудительно делается нечётным.
 *   - Q-компонента (мнимая часть): результат свёртки входа с коэффициентами
 *     Гильберта — сдвинутый на 90° сигнал.
 *   - I-компонента (вещественная часть): исходный вход, задержанный на
 *     (N-1)/2 отсчётов для компенсации групповой задержки фильтра.
 *
 * Параметры:
 *   - order (int, по умолчанию 64) — порядок фильтра Гильберта.
 *     Больший порядок → более точное преобразование на низких частотах,
 *     но увеличивает задержку. Автоматически округляется до нечётного.
 *     Рекомендуемый диапазон: 31–255.
 *   - phaseShift (float, по умолчанию 90) — сдвиг фазы в градусах.
 *     Стандартное значение 90° соответствует классическому преобразованию
 *     Гильберта. Зарезервирован для будущих расширений.
 *
 * Вход:  real (Float32Array)
 * Выход: complex (interleaved Float32Array [I0, Q0, I1, Q1, ...])
 *
 * Примеры использования:
 *
 *   1. Проверка аналитического сигнала:
 *      Sine(1000) → HilbertTransformer → ComplexMagnitude → Oscilloscope
 *      Магнитуда аналитического сигнала от чистой синусоиды — постоянная
 *      величина (огибающая = const), что подтверждает корректность
 *      преобразования.
 *
 *   2. Извлечение мгновенной фазы:
 *      Sine(1000) → HilbertTransformer → ComplexPhase → Oscilloscope
 *      На осциллографе видна линейно нарастающая (пилообразная) фаза,
 *      соответствующая частоте 1 кГц.
 *
 *   3. Огибающая AM-сигнала:
 *      AMFMPMModulator(AM, carrier=5000Hz) → HilbertTransformer →
 *      → ComplexMagnitude → LowpassFIR(100Hz) → Oscilloscope
 *      Модуль аналитического сигнала = мгновенная амплитуда (огибающая).
 */
import WindowFunctions from '../_shared/WindowFunctions.js';

export default {
    type: 'Преобразователь Гильберта',
    id: 'hilbert-transformer',
    icon: 'dsp-hilbert',
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
                delay: M,
                _order: params.order ?? 64
            });
        },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize * 2);

            const currentOrder = params.order ?? 64;
            let state = this.states.get(nodeId);
            if (!state || state._order !== currentOrder) {
                this.init(nodeId, params);
                state = this.states.get(nodeId);
            }
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
                const delayedIdx = ((pointer - delay) % N + N) % N;
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
