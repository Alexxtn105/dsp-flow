# План миграции математического кода на TypeScript

**Дата:** 2026-03-12
**Статус:** Планирование

## Scope (что мигрируем)

### Ядро (6 файлов)
| Файл | Строк | Сложность | Приоритет |
|------|-------|-----------|-----------|
| `src/engine/PluginRegistry.js` | ~150 | Высокая (singleton, generics) | 1 |
| `src/engine/GraphCompiler.js` | ~300 | Высокая (алгоритмы графов) | 2 |
| `src/engine/DSPProcessor.js` | ~518 | Высокая (state machine, Web Audio) | 3 |
| `src/engine/WavFileService.js` | ~100 | Средняя | 4 |
| `src/engine/initPlugins.js` | ~80 | Низкая | 5 |
| `src/engine/index.js` | ~20 | Низкая | 6 |

### Shared-утилиты (4 файла)
| Файл | Описание | Сложность |
|------|----------|-----------|
| `src/engine/plugins/_shared/FFTUtils.js` | Cooley-Tukey FFT | Средняя |
| `src/engine/plugins/_shared/FilterDesign.js` | Windowed Sinc, Remez | Высокая |
| `src/engine/plugins/_shared/SignalUtils.js` | Phase unwrapping | Низкая |
| `src/engine/plugins/_shared/WindowFunctions.js` | Оконные функции | Низкая |

### Math-плагины (23 файла)
| Группа | Плагины | Сложность |
|--------|---------|-----------|
| Элементарные | AbsoluteValue, Gain, RealSquare, RealSqrt, RealPower4, Threshold | Низкая |
| Комплексные операции | ComplexMultiplier, ComplexSummer, ComplexSquare, ComplexSqrt, ComplexPhase, ComplexMagnitude, ComplexConjugate, ComplexComposer | Средняя |
| Real/Complex мосты | RealPart, ImagPart | Низкая |
| Тригонометрия/Лог | Atan2, LogExp | Низкая |
| С состоянием | Integrator, AGC | Средняя |
| Мультивход | Summer, Multiplier, Mixer | Средняя |

### Тесты (3 файла)
| Файл | Тестов |
|------|--------|
| `tests/engine/PluginRegistry.test.js` | ~20 |
| `tests/engine/GraphCompiler.test.js` | ~30 |
| `tests/engine/DSPProcessor.test.js` | ~40 |
| `tests/plugins/math.test.js` | ~50 |
| `tests/plugins/shared.test.js` | ~15 |

**Итого: 33 файла исходного кода + 5 файлов тестов**

---

## Этап 0 — Настройка инфраструктуры

### 0.1 Установка зависимостей
```bash
npm install -D typescript @types/node
```

### 0.2 Создание tsconfig.json
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "allowJs": true,            // Поэтапная миграция
    "checkJs": false,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "paths": {
      "@engine/*": ["./src/engine/*"],
      "@plugins/*": ["./src/engine/plugins/*"]
    }
  },
  "include": ["src/engine/**/*.ts", "src/engine/**/*.js"],
  "exclude": ["node_modules", "dist"]
}
```

### 0.3 Настройка Vite
Vite поддерживает `.ts` из коробки — достаточно добавить `tsconfig.json`. Проверить, что `@vitejs/plugin-react` корректно обрабатывает `.tsx` (для будущей миграции UI).

### 0.4 Настройка ESLint
Добавить `typescript-eslint` в flat config:
```bash
npm install -D typescript-eslint @typescript-eslint/parser
```

### 0.5 Настройка Vitest
Vitest поддерживает `.ts` файлы без дополнительной настройки. Тесты могут оставаться `.js` и импортировать `.ts` модули.

### Критерий завершения этапа 0
- `npm run build` проходит без ошибок
- `npm run test` — все 213 тестов зелёные
- `npm run lint` — без новых ошибок
- Можно создать `.ts` файл в `src/engine/` и он корректно импортируется

---

## Этап 1 — Типы и интерфейсы (новые файлы)

Создать `src/engine/types/` с базовыми типами. Это фундамент для всей миграции.

### 1.1 `src/engine/types/signals.ts` — типы сигналов
```typescript
/** Реальный сигнал — Float32Array длиной chunkSize */
export type RealSignal = Float32Array;

/** Комплексный сигнал — Float32Array длиной chunkSize * 2 (interleaved: [Re0, Im0, Re1, Im1, ...]) */
export type ComplexSignal = Float32Array;

/** Любой сигнал */
export type Signal = RealSignal | ComplexSignal;

/** Тип сигнала */
export type SignalType = 'real' | 'complex';

/** Описание входов/выходов плагина */
export interface PluginSignals {
  input: SignalType | null;
  output: SignalType | null;
  inputsCount?: number;
}
```

### 1.2 `src/engine/types/plugin.ts` — типы плагинов
```typescript
import type { Signal, PluginSignals } from './signals';

/** Параметры плагина — словарь произвольных значений */
export type PluginParams = Record<string, unknown>;

/** Процессор без состояния */
export interface StatelessProcessor {
  process(inputs: Signal[], params: PluginParams, chunkSize: number): Signal;
}

/** Процессор с состоянием (per-node) */
export interface StatefulProcessor extends StatelessProcessor {
  states: Map<string, unknown>;
  init(nodeId: string, params: PluginParams, sampleRate: number): void;
  clearStates(): void;
  process(inputs: Signal[], params: PluginParams, chunkSize: number, nodeId?: string): Signal;
}

export type Processor = StatelessProcessor | StatefulProcessor;

/** Определение плагина */
export interface PluginDefinition<P extends PluginParams = PluginParams> {
  type: string;
  id: string;
  icon: string;
  description: string;
  group: string;
  signals: PluginSignals;
  defaultParams: P;
  processor: Processor;
}
```

### 1.3 `src/engine/types/graph.ts` — типы графа
```typescript
export interface DSPNode {
  id: string;
  type: string;
  data: {
    pluginId: string;
    params: Record<string, unknown>;
    [key: string]: unknown;
  };
  position: { x: number; y: number };
}

export interface DSPEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface CompiledGraph {
  executionOrder: ExecutionBlock[];
  valid: boolean;
  errors: string[];
}

export interface ExecutionBlock {
  nodeId: string;
  pluginId: string;
  processor: import('./plugin').Processor;
  inputs: InputConnection[];
  params: Record<string, unknown>;
}

export interface InputConnection {
  sourceNodeId: string;
  sourceHandle: string;
  targetHandle: string;
}
```

### 1.4 `src/engine/types/processor.ts` — типы процессора
```typescript
export const ProcessorState = {
  IDLE: 'IDLE',
  RUNNING_REALTIME: 'RUNNING_REALTIME',
  RUNNING_MANUAL: 'RUNNING_MANUAL',
  RUNNING_FILE: 'RUNNING_FILE',
} as const;

export type ProcessorStateType = typeof ProcessorState[keyof typeof ProcessorState];

export interface ProcessorCallbacks {
  onChunkProcessed?: (chunkIndex: number, totalChunks: number) => void;
  onVisualizationData?: (nodeId: string, data: unknown) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}
```

### 1.5 `src/engine/types/index.ts` — реэкспорт
```typescript
export * from './signals';
export * from './plugin';
export * from './graph';
export * from './processor';
```

### Критерий завершения этапа 1
- Все типы компилируются без ошибок
- Типы экспортируются из `src/engine/types/index.ts`
- Существующий JS-код не затронут

---

## Этап 2 — Shared-утилиты (.js → .ts)

Миграция `src/engine/plugins/_shared/` — чистые функции без зависимостей от React.

### Порядок миграции
1. **SignalUtils.js → SignalUtils.ts** (~20 строк, 1 функция)
2. **WindowFunctions.js → WindowFunctions.ts** (~80 строк, словарь функций)
3. **FFTUtils.js → FFTUtils.ts** (~100 строк, in-place алгоритм)
4. **FilterDesign.js → FilterDesign.ts** (~200 строк, зависит от WindowFunctions)

### Подход
- Переименовать файл `.js` → `.ts`
- Добавить типы параметров и возвращаемых значений
- Обновить импорты в потребителях (Vite резолвит `.ts` автоматически)
- Убедиться что тесты проходят после каждого файла

### Пример: FFTUtils
```typescript
// До (JS)
export function fft(real, imag) { ... }
export function computeMagnitudeDB(real, imag) { ... }

// После (TS)
export function fft(real: Float32Array, imag: Float32Array): void { ... }
export function computeMagnitudeDB(real: Float32Array, imag: Float32Array): Float32Array { ... }
```

### Критерий завершения этапа 2
- 4 файла мигрированы на `.ts`
- `tests/plugins/shared.test.js` — все тесты зелёные
- Плагины-потребители (filters, analysis) продолжают работать

---

## Этап 3 — Math-плагины (.js → .ts)

### 3.1 Простые плагины без состояния (16 файлов)
Миграция в любом порядке, они независимы друг от друга:

**Пакет A — элементарные (6):**
AbsoluteValue, Gain, RealSquare, RealSqrt, RealPower4, Threshold

**Пакет B — комплексные (8):**
ComplexMultiplier, ComplexSummer, ComplexSquare, ComplexSqrt, ComplexPhase, ComplexMagnitude, ComplexConjugate, ComplexComposer

**Пакет C — мосты и математика (4):**
RealPart, ImagPart, Atan2, LogExp

### 3.2 Плагины с множественными входами (3 файла)
Summer, Multiplier, Mixer — требуют правильной типизации переменного числа входов.

### 3.3 Stateful-плагины (2 файла)
Integrator, AGC — требуют типизации `states: Map<string, T>` с конкретным типом состояния.

### Подход для каждого плагина
1. Переименовать `.js` → `.ts`
2. Типизировать `PluginDefinition` с конкретным типом параметров
3. Типизировать `processor.process()` — входы, выходы, параметры
4. Для stateful: создать интерфейс состояния, типизировать `states: Map`
5. Запустить `tests/plugins/math.test.js`

### Пример: SummerPlugin
```typescript
import type { PluginDefinition, RealSignal } from '../types';

interface SummerParams {
  numInputs: number;
  weights: number[];
  normalization: 'none' | 'sum' | 'rms';
}

const SummerPlugin: PluginDefinition<SummerParams> = {
  id: 'summer',
  // ... metadata ...
  processor: {
    process(inputs: RealSignal[], params: SummerParams, chunkSize: number): RealSignal {
      const output = new Float32Array(chunkSize);
      // ...
      return output;
    }
  }
};

export default SummerPlugin;
```

### Критерий завершения этапа 3
- 23 math-плагина мигрированы
- `tests/plugins/math.test.js` — все тесты зелёные
- PluginRegistry корректно работает с `.ts` плагинами

---

## Этап 4 — Ядро engine (.js → .ts)

### 4.1 PluginRegistry.js → PluginRegistry.ts
- Типизировать `#plugins: Map<string, PluginDefinition>`
- Generic-методы: `getProcessor<T extends Processor>(type: string): T | null`
- Типизировать `#groups`, `#frozen`
- Singleton-экспорт с правильным типом

### 4.2 GraphCompiler.js → GraphCompiler.ts
- Типизировать входы `compile(nodes: DSPNode[], edges: DSPEdge[]): CompiledGraph`
- Типизировать внутренние структуры алгоритмов (adjacency list, in-degree map)
- Типизировать Union-Find

### 4.3 DSPProcessor.js → DSPProcessor.ts
- State machine с discriminated union или enum
- Типизировать Web Audio API взаимодействие (AudioContext, AudioWorklet)
- Типизировать callbacks и events
- Типизировать `blockStates: Map<string, Signal>`

### 4.4 WavFileService.js → WavFileService.ts
- Типизировать AudioBuffer взаимодействие
- Типизировать возвращаемые данные

### 4.5 initPlugins.js → initPlugins.ts
- Импорты плагинов, вызов `registry.registerAll()`

### 4.6 index.js → index.ts
- Реэкспорт типов и модулей

### Критерий завершения этапа 4
- 6 файлов ядра мигрированы
- `tests/engine/` — все тесты зелёные
- `npm run build` — сборка проходит
- Все 213 тестов зелёные

---

## Этап 5 — Миграция тестов (опционально)

### Файлы
- `tests/engine/PluginRegistry.test.js` → `.test.ts`
- `tests/engine/GraphCompiler.test.js` → `.test.ts`
- `tests/engine/DSPProcessor.test.js` → `.test.ts`
- `tests/plugins/math.test.js` → `.test.ts`
- `tests/plugins/shared.test.js` → `.test.ts`

### Подход
- Тесты могут оставаться `.js` — Vitest обрабатывает оба формата
- Миграция тестов даёт проверку типов в тестовых сценариях
- Низкий приоритет — делать если останется время

---

## Этап 6 — Strict-режим и финализация

### 6.1 Включить строгие проверки
```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "allowJs": false,        // Убрать после полной миграции engine/
    "noImplicitAny": true,   // Уже включено через strict
    "strictNullChecks": true  // Уже включено через strict
  }
}
```

### 6.2 Добавить проверку типов в CI
```yaml
# .github/workflows/deploy.yml
- name: Type check
  run: npx tsc --noEmit
```

### 6.3 Обновить npm-скрипты
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint . && tsc --noEmit"
  }
}
```

---

## Что НЕ входит в scope

- **React-компоненты** (`src/components/`) — отдельная миграция, значительно больше работы
- **Другие категории плагинов** (filters, generators, detectors, analysis, visualization, output) — могут мигрировать позже по аналогии с math
- **CSS/стили** — не затрагиваются
- **Конфигурация i18n** — не затрагивается

---

## Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Сломанные импорты при переименовании .js → .ts | Высокая | Vite резолвит оба формата; обновлять импорты по одному файлу |
| PluginRegistry singleton — сложная типизация | Средняя | Начать с `any`, постепенно уточнять типы |
| Interleaved complex format теряет типобезопасность | Средняя | Branded type `ComplexSignal` + runtime assertion в dev |
| Тесты падают из-за изменения модулей | Низкая | Мигрировать по одному файлу, гонять тесты после каждого |
| ESLint конфликты с TypeScript | Низкая | typescript-eslint хорошо интегрируется с flat config |

---

## Порядок выполнения (summary)

```
Этап 0: Инфраструктура (tsconfig, deps, ESLint)     ~1 сессия
Этап 1: Типы и интерфейсы (новые файлы)             ~1 сессия
Этап 2: Shared-утилиты (4 файла)                    ~1 сессия
Этап 3: Math-плагины (23 файла)                     ~2 сессии
Этап 4: Ядро engine (6 файлов)                      ~2 сессии
Этап 5: Тесты (опционально, 5 файлов)               ~1 сессия
Этап 6: Strict-режим и CI                            ~1 сессия
```

**Итого: 33 файлов исходного кода, ~7-9 рабочих сессий**
