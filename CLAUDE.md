# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DSP Flow Editor — визуальный node-based редактор для проектирования схем цифровой обработки сигналов (ЦОС/DSP). Весь код находится в `dsp-flow/`.

## Commands

```bash
cd dsp-flow
npm install          # установка зависимостей
npm run dev          # dev-сервер на http://localhost:5173
npm run build        # production-сборка в dist/
npm run lint         # ESLint
npm run preview      # предпросмотр production-сборки
```

Тесты не настроены. Проверяй изменения через `npm run build` (ошибки компиляции) и `npm run lint`.

## Tech Stack

React 19 + Vite 7, @xyflow/react (React Flow) для графового редактора, MobX + mobx-react-lite для состояния выполнения, d3 для визуализации, fft.js для БПФ. Язык — JavaScript/JSX (без TypeScript). CSS — покомпонентный (BEM), глобальные переменные темы в `src/styles/variables.css`.

## Architecture

### Система плагинов (`src/plugins/`)

Каждый DSP-блок — отдельный файл-плагин. Центральный `PluginRegistry` (singleton) управляет регистрацией, индексацией и поиском блоков. При старте приложения `src/plugins/index.js` регистрирует все плагины и вызывает `registry.freeze()` — после этого реестр неизменяем.

Плагины организованы по категориям: `filters/`, `generators/`, `fft/`, `detectors/`, `math/`, `visualization/`. Группы в UI используют ID: `'filters'`, `'generators'`, `'fft-blocks'`, `'math-blocks'`, `'detectors'`, `'visualization'`.

**Структура плагина** (на примере генератора):
```javascript
export default {
    id: 'REF_SINE_GEN',              // уникальный ключ (= ключ DSP_BLOCK_TYPES)
    name: 'Синусный генератор',       // русское отображаемое имя
    description: '...',
    icon: 'waves',                    // Google Material Icon
    group: 'generators',              // ID группы в UI
    groupOrder: 2,                    // порядок внутри группы
    signals: { input: null, output: 'real' },  // null = нет входа/выхода
    defaultParams: { frequency: 1000, amplitude: 1.0, phase: 0 },
    paramFields: [                    // описание UI для ParamsEditor
        { name: 'frequency', label: 'Частота (Гц)', type: 'number', min: 1, max: 20000, step: 10, defaultValue: 1000 },
    ],
    visualizationType: 'oscilloscope', // только для sink-блоков: 'oscilloscope' | 'spectrum' | 'constellation'
    validate(params) { return []; },  // массив строк-ошибок
    process(ctx) { ... return Float32Array | {real, imag} | null; },
};
```

**Контекст выполнения** (`ctx` в `process()`):
- `inputs` — массив входных сигналов (Float32Array или {real, imag})
- `params` — параметры блока из UI
- `state` — персистентное runtime-состояние (фазы, аккумуляторы, буферы)
- `sampleRate`, `bufferSize`, `nodeId`

**Legacy-совместимость**: `src/utils/constants.js` реэкспортирует `DSP_BLOCK_TYPES`, `BLOCK_SIGNAL_CONFIG`, `DSP_ICONS`, `DEFAULT_BLOCK_PARAMS`, `DSP_GROUPS`, `INPUT_NODE_TYPES`, `OUTPUT_NODE_TYPES` из `src/plugins/index.js`. Собственные константы в `constants.js` — только `SIGNAL_TYPES`, `STORAGE_CONFIG`, `VALIDATION_RULES`.

### Три слоя движка обработки (`src/engine/`)

1. **GraphCompiler** — валидация типов сигналов между блоками, обнаружение циклов (DFS), топологическая сортировка (Kahn's algorithm), генерация execution plan. Использует предвычисленные lookup Maps (`nodeMap`, `outEdges`, `inEdges`) для O(n+m) компиляции.
2. **DSPEngine** — исполнение графа: проход узлов в топологическом порядке, получение процессоров через `registry.getProcessor(blockType)`, кеширование выходов (`nodeOutputs` Map), runtime-состояние узлов (`nodeState` Map).
3. **DSPLib** — чистые статические функции обработки сигналов (FIR, FFT, Hilbert, детекторы, генераторы). Плагины импортируют DSPLib напрямую.
4. **AudioFileReader** — декодирование аудиофайлов (WAV, MP3, OGG и др. через Web Audio API `AudioContext`) для блока `Аудио-файл`. Лимит: 100 MB.

### Поток данных

Пользователь собирает схему → изменение nodes/edges запускает `GraphCompiler.compile()` → при нажатии Run `DSPExecutionStore.start()` → `requestAnimationFrame` цикл на 30 FPS → `DSPEngine.executeOneCycle()` → для каждого узла вызывается `plugin.process(ctx)` → sink-узлы обновляют `visualizationData` → `FloatingWindowsManager` рендерит результат в плавающих окнах (Oscilloscope/SpectrumAnalyzer/ConstellationDiagram через d3).

### Компонентное дерево (верхний уровень)

`App` (observer) → `DSPEditorProvider` → `ErrorBoundary` → `Header` (запуск/остановка, диалог настроек sampleRate/bufferSize/FPS) + `ControlToolbar` (тема, сохранение/загрузка) + `DSPEditor` (ReactFlow canvas с двумя типами узлов: `BlockNode` и `AudioFileNode`, кастомные edges). Диалоги `SaveDialog`/`LoadDialog` монтируются условно из `App`. Переиспользуемые примитивы (`Dialog`, `FloatingWindow`, `Icon`, `CompactFileUploader`) — в `src/components/common/`.

### Управление состоянием

- **MobX singleton** (`src/stores/DSPExecutionStore.js`) — единственный store, содержит `isRunning`, `compiledGraph`, `compilationErrors`, `executionData`, `visualizationData`. Computed: `hasErrors`, `canStart`, `totalNodes`. Оркестрирует `GraphCompiler` и `DSPEngine` внутри себя.
- **React Context** (`src/contexts/DSPEditorContext.jsx` + `dspEditorContextDef.js`) — данные текущей схемы, методы сохранения/экспорта/импорта (через `useSchemeStorage` hook). Контекст читается через хук `useDSPEditor`.
- Hooks (`src/hooks/`) — useDSPEditor, useAutoSave, useTheme, useSchemeStorage, useNodeParams.

### Система типов сигналов

Два основных типа: `REAL` (Float32Array) и `COMPLEX` ({real, imag}), плюс специальный `AUDIO_FILE`. Определены в `SIGNAL_TYPES` (`src/utils/constants.js`), конфигурация блоков — в `signals` поле каждого плагина. Соединение complex→real запрещено на уровне компилятора. Преобразование real→complex — через Hilbert/FFT блоки. На холсте разные типы визуально различаются через кастомные edges (`RealSignalEdge`, `ComplexSignalEdge`).

### Визуализация (`src/components/visualization/`)

`FloatingWindowsManager` получает `visualizationData` из MobX store и рендерит плавающие окна для sink-узлов. Три типа: `Oscilloscope` (временная область), `SpectrumAnalyzer` (частотная область), `ConstellationDiagram` (фазовая плоскость). Все рисуют через d3/canvas. Плагины визуализации объявляют `visualizationType: 'oscilloscope' | 'spectrum' | 'constellation'`.

### Сервисы (`src/services/`)

- **storageService.js** — статический класс для работы с localStorage (сохранение/загрузка схем, тема, автосохранение). Лимит: 4 MB, до 50 схем. Обрабатывает `QuotaExceededError` с автоочисткой
- **validationService.js** — валидация имён схем, описаний, структуры данных, параметров блоков (делегирует в `plugin.validate()`)

## Key Files

- `src/plugins/PluginRegistry.js` — центральный реестр блоков (регистрация, индексация, lookup-методы)
- `src/plugins/index.js` — инициализация реестра, регистрация всех плагинов, legacy-экспорты
- `src/utils/constants.js` — `SIGNAL_TYPES`, `STORAGE_CONFIG`, `VALIDATION_RULES` + реэкспорт блочных констант из плагинов
- `src/utils/helpers.js` — утилиты: `generateNodeId`, `debounce`, `getBlockSignalConfig`, `areSignalsCompatible`
- `src/components/dsp/DSPEditor/` — главный компонент-холст с React Flow
- `src/components/dsp/BlockNode/` — визуальное представление блока на холсте
- `src/components/dsp/ParamsEditor/` — редактор параметров блока (рендерит по `paramFields` плагина)
- `src/components/layout/ControlToolbar/` — левая панель управления (тема, сохранение, загрузка)
- `src/components/layout/Toolbar/` — библиотека блоков (drag-and-drop)

## Adding a New DSP Block

Создать один файл плагина в соответствующей категории `src/plugins/<category>/`:

1. Экспортировать default-объект со всеми обязательными полями (`id`, `name`, `icon`, `group`, `groupOrder`, `signals`, `defaultParams`, `paramFields`, `validate`, `process`)
2. Зарегистрировать в `src/plugins/index.js` — импорт + `registry.register(Plugin)`
3. Если нужен новый алгоритм — добавить статический метод в `src/engine/DSPLib.js`

Всё остальное (константы, UI, компиляция, исполнение) подхватится автоматически через реестр.

## Conventions

- Все названия блоков на русском языке (например, `'КИХ-Фильтр'`, `'Осциллограф'`). Ключи `id` в плагинах — английские константы, `name` — русские строки
- Иконки — Google Material Icons (через CSS-класс `material-symbols-outlined`)
- Персистентность — только localStorage (backend на Go планируется, но не реализован). Лимит: 4 MB, до 50 схем, автосохранение каждые 5 сек
- Функциональные компоненты с hooks, `memo()` для оптимизации рендера
- ESLint: flat config (ESLint 9, `eslint.config.js`). `no-unused-vars` — `varsIgnorePattern: ^[A-Z_]`, `argsIgnorePattern: ^_`, `caughtErrorsIgnorePattern: ^_`
- Дефолтная конфигурация движка: sampleRate=48000, bufferSize=1024, targetFPS=30
