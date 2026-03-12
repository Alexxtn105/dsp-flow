/**
 * Типы плагинов DSP-системы.
 */

import type { PluginSignals } from './signals';
import type { BlockOutput } from './processor';

/** Параметры плагина — произвольный словарь с sampleRate, добавляемым в рантайме */
export type PluginParams = Record<string, unknown>;

/** Процессор без состояния */
export interface StatelessProcessor<P extends PluginParams = PluginParams> {
  process(inputs: (Float32Array | null)[], params: P, chunkSize: number, nodeId?: string): BlockOutput;
}

/** Процессор с состоянием (per-node через Map) */
export interface StatefulProcessor<
  P extends PluginParams = PluginParams,
  S = unknown,
> extends StatelessProcessor<P> {
  states: Map<string, S>;
  init?(nodeId: string, params: P, sampleRate: number): void;
  clearStates(): void;
  process(inputs: (Float32Array | null)[], params: P, chunkSize: number, nodeId?: string): BlockOutput;
}

export type Processor<P extends PluginParams = PluginParams> =
  | StatelessProcessor<P>
  | StatefulProcessor<P>;

/** Type guard: процессор с состоянием (имеет states: Map) */
export function isStatefulProcessor(p: Processor): p is StatefulProcessor {
  return 'states' in p && p.states instanceof Map;
}

/** Определение плагина */
export interface PluginDefinition<P extends PluginParams = PluginParams> {
  type: string;
  id: string;
  icon: string;
  description: string;
  group: string;
  signals: PluginSignals;
  defaultParams: P;
  processor: Processor<P>;
}
