/**
 * Типы DSP-процессора (state machine).
 */

export const ProcessorState = {
  IDLE: 'IDLE',
  RUNNING_REALTIME: 'RUNNING_REALTIME',
  RUNNING_MANUAL: 'RUNNING_MANUAL',
  RUNNING_FILE: 'RUNNING_FILE',
} as const;

export type ProcessorStateValue = typeof ProcessorState[keyof typeof ProcessorState];

/** Результат выполнения блока: одиночный, множественный или визуализация */
export type BlockOutput =
  | Float32Array
  | { outputs: Float32Array[] }
  | { channels: (Float32Array | null)[] };

/** Состояние выходного буфера блока */
export interface BlockState {
  output: BlockOutput | null;
  initialized: boolean;
  cachedParams?: Record<string, unknown>;
}

/** Информация о прогрессе обработки */
export interface ProcessingProgress {
  currentSample: number;
  totalSamples: number;
  progress: number;
}

/** Callbacks процессора */
export interface ProcessorCallbacks {
  onProgress: ((progress: ProcessingProgress) => void) | null;
  onBlockOutput: ((nodeId: string, output: BlockOutput) => void) | null;
  onComplete: (() => void) | null;
  onError: ((error: Error) => void) | null;
}

/** Метаданные загруженного WAV-файла */
export interface WavFileMetadata {
  sampleRate: number;
  duration: number;
  numberOfChannels: number;
  length: number;
  fileName: string;
}
