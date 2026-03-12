/**
 * Типы графа и компиляции.
 */

import type { PluginSignals } from './signals';

/** Узел графа DSP (React Flow node с DSP-метаданными) */
export interface DSPNode {
  id: string;
  type?: string;
  data: {
    blockType: string;
    label?: string;
    params: Record<string, unknown>;
    [key: string]: unknown;
  };
  position: { x: number; y: number };
}

/** Ребро графа DSP (React Flow edge) */
export interface DSPEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/** Входное соединение скомпилированного блока */
export interface InputConnection {
  sourceNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/** Блок в последовательности выполнения */
export interface ExecutionBlock {
  nodeId: string;
  blockType: string;
  params: Record<string, unknown>;
  inputs: InputConnection[];
  signalConfig: {
    input: PluginSignals['input'];
    output: PluginSignals['output'];
    inputsCount: number;
  };
}

/** Известные типы сообщений компиляции */
export type CompilationMessageType =
  | 'cycle'
  | 'disconnected_components'
  | 'invalid_connection'
  | 'type_mismatch'
  | 'disconnected_input'
  | 'init_error';

/** Ошибка/предупреждение компиляции */
export interface CompilationMessage {
  type: CompilationMessageType;
  message: string;
  edge?: string;
  node?: string;
  nodeId?: string;
  sourceNode?: string;
  targetNode?: string;
  nodes?: string[];
  components?: string[][];
}

/** Результат компиляции графа */
export interface CompilationResult {
  success: boolean;
  errors: CompilationMessage[];
  warnings: CompilationMessage[];
  executionOrder: ExecutionBlock[] | null;
}

/** Результат топологической сортировки */
export interface TopologicalSortResult {
  order: string[];
  hasCycle: boolean;
  cycleNodes: string[];
}
