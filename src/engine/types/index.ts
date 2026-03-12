export type { SignalType, PluginSignals } from './signals';

export type {
  PluginParams,
  StatelessProcessor,
  StatefulProcessor,
  Processor,
  PluginDefinition,
} from './plugin';
export { isStatefulProcessor } from './plugin';

export type {
  DSPNode,
  DSPEdge,
  InputConnection,
  SignalConfig,
  ExecutionBlock,
  CompilationMessageType,
  CompilationMessage,
  CompilationResult,
  TopologicalSortResult,
} from './graph';

export {
  ProcessorState,
} from './processor';

export type {
  ProcessorStateValue,
  BlockOutput,
  BlockState,
  ProcessingProgress,
  ProcessorCallbacks,
  WavFileMetadata,
} from './processor';

export type {
  PluginGroup,
  PluginGroupBlock,
  PluginGroupWithBlocks,
  ParamOption,
} from './registry';
