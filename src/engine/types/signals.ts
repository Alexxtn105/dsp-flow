/**
 * Типы сигналов DSP-системы.
 *
 * Реальный сигнал — Float32Array длиной chunkSize.
 * Комплексный сигнал — Float32Array длиной chunkSize * 2
 * (interleaved: [Re0, Im0, Re1, Im1, ...]).
 */

export type SignalType = 'real' | 'complex';

export interface PluginSignals {
  input: SignalType | null;
  output: SignalType | null;
  inputsCount?: number;
}
