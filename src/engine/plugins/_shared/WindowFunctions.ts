/**
 * Оконные функции для DSP
 */

export type WindowFunctionName =
  | 'rectangular'
  | 'hamming'
  | 'hanning'
  | 'blackman'
  | 'blackman-harris'
  | 'nuttall'
  | 'flattop';

type WindowFunction = (n: number, N: number) => number;

const WindowFunctions: Record<WindowFunctionName, WindowFunction> = {
    rectangular: () => 1,
    hamming: (n, N) => 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1)),
    hanning: (n, N) => 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1))),
    blackman: (n, N) => 0.42 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1)) + 0.08 * Math.cos((4 * Math.PI * n) / (N - 1)),
    'blackman-harris': (n, N) =>
        0.35875 - 0.48829 * Math.cos((2 * Math.PI * n) / (N - 1))
        + 0.14128 * Math.cos((4 * Math.PI * n) / (N - 1))
        - 0.01168 * Math.cos((6 * Math.PI * n) / (N - 1)),
    nuttall: (n, N) =>
        0.355768 - 0.487396 * Math.cos((2 * Math.PI * n) / (N - 1))
        + 0.144232 * Math.cos((4 * Math.PI * n) / (N - 1))
        - 0.012604 * Math.cos((6 * Math.PI * n) / (N - 1)),
    flattop: (n, N) =>
        1 - 1.93 * Math.cos((2 * Math.PI * n) / (N - 1))
        + 1.29 * Math.cos((4 * Math.PI * n) / (N - 1))
        - 0.388 * Math.cos((6 * Math.PI * n) / (N - 1))
        + 0.032 * Math.cos((8 * Math.PI * n) / (N - 1))
};

export default WindowFunctions;
