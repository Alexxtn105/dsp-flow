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

React 19 + Vite 7, @xyflow/react (React Flow) для графового редактора, MobX для состояния выполнения, d3 для визуализации, fft.js для БПФ. Язык — JavaScript/JSX (без TypeScript). CSS — покомпонентный (BEM).

## Architecture

### Три слоя движка обработки (`src/engine/`)

1. **GraphCompiler** — валидация типов сигналов между блоками, обнаружение циклов (DFS), топологическая сортировка (Kahn's algorithm), генерация execution plan. Использует предвычисленные lookup Maps (`nodeMap`, `outEdges`, `inEdges`) для O(n+m) компиляции.
2. **DSPEngine** — исполнение графа: проход узлов в топологическом порядке, кеширование выходов (`nodeOutputs` Map), runtime-состояние узлов (`nodeState` Map — фазы, аккумуляторы), делегирование в DSPLib.
3. **DSPLib** — чистые статические функции обработки сигналов (FIR, FFT, Hilbert, детекторы, генераторы).
4. **AudioFileReader** — декодирование WAV-файлов для блока `Аудио-файл`.

### Поток данных

Пользователь собирает схему → изменение nodes/edges запускает `GraphCompiler.compile()` → при нажатии Run `DSPExecutionStore.start()` → `requestAnimationFrame` цикл на 30 FPS → `DSPEngine.executeOneCycle()` → sink-узлы обновляют `visualizationData` → `FloatingWindowsManager` рендерит результат в плавающих окнах (Oscilloscope/SpectrumAnalyzer/ConstellationDiagram через d3).

### Компонентное дерево (верхний уровень)

`App` → `DSPEditorProvider` (React Context) → `Header` (запуск/остановка) + `ControlToolbar` (тема, сохранение/загрузка) + `DSPEditor` (ReactFlow canvas с `BlockNode`, кастомные edges). Диалоги `SaveDialog`/`LoadDialog` монтируются условно из `App`.

### Управление состоянием

- **MobX singleton** (`src/stores/DSPExecutionStore.js`) — единственный store, содержит `isRunning`, `compiledGraph`, `compilationErrors`, `executionData`, `visualizationData`. Computed: `hasErrors`, `canStart`, `totalNodes`. Оркестрирует `GraphCompiler` и `DSPEngine` внутри себя.
- **React Context** (`src/contexts/DSPEditorContext.jsx`) — ReactFlow instance, данные текущей схемы, методы сохранения (через `useSchemeStorage` hook).
- Hooks (`src/hooks/`) — useAutoSave, useTheme, useSchemeStorage, useNodeParams.

### Система типов сигналов

Два основных типа: `REAL` (Float32Array) и `COMPLEX` ({real, imag}), плюс специальный `AUDIO_FILE`. Конфигурация в `BLOCK_SIGNAL_CONFIG` (`src/utils/constants.js`). Соединение complex→real запрещено на уровне компилятора. Преобразование real→complex — через Hilbert/FFT блоки. На холсте разные типы визуально различаются через кастомные edges (`RealSignalEdge`, `ComplexSignalEdge`).

### Визуализация (`src/components/visualization/`)

`FloatingWindowsManager` получает `visualizationData` из MobX store и рендерит плавающие окна для sink-узлов. Три типа: `Oscilloscope` (временная область), `SpectrumAnalyzer` (частотная область), `ConstellationDiagram` (фазовая плоскость). Все рисуют через d3/canvas.

## Key Files

- `src/utils/constants.js` — все типы блоков (`DSP_BLOCK_TYPES`), конфигурация сигналов (`BLOCK_SIGNAL_CONFIG`), параметры по умолчанию (`DEFAULT_BLOCK_PARAMS`), группы UI (`DSP_GROUPS`), иконки (`DSP_ICONS`), лимиты storage (`STORAGE_CONFIG`)
- `src/utils/helpers.js` — утилиты: `generateNodeId`, `debounce`, `getBlockSignalConfig`, `areSignalsCompatible`
- `src/components/dsp/DSPEditor/` — главный компонент-холст с React Flow
- `src/components/dsp/BlockNode/` — визуальное представление блока на холсте
- `src/components/layout/ControlToolbar/` — левая панель управления (тема, сохранение, загрузка)
- `src/components/layout/Toolbar/` — библиотека блоков (drag-and-drop)
- `src/services/storageService.js` — работа с localStorage (сохранение/загрузка схем, лимит 4 MB)

## Adding a New DSP Block

1. `src/utils/constants.js` — добавить в `DSP_BLOCK_TYPES`, `BLOCK_SIGNAL_CONFIG`, `DSP_ICONS`, `DEFAULT_BLOCK_PARAMS`, нужную группу в `DSP_GROUPS`
2. `src/engine/DSPEngine.js` — добавить case в `executeNode()`, реализовать `process*()` метод
3. `src/engine/DSPLib.js` — добавить статический метод алгоритма (если нужен новый)
4. `src/components/dsp/ParamsEditor/` — добавить рендеринг параметров нового типа

## Conventions

- Все названия блоков на русском языке (например, `'КИХ-Фильтр'`, `'Осциллограф'`). Ключи в `DSP_BLOCK_TYPES` — английские константы, значения — русские строки
- Иконки — Google Material Icons (через CSS-класс `material-symbols-outlined`)
- Персистентность — только localStorage (backend на Go планируется, но не реализован). Лимит: 4 MB, до 50 схем, автосохранение каждые 5 сек
- Функциональные компоненты с hooks, `memo()` для оптимизации рендера
- ESLint: `no-unused-vars` игнорирует переменные начинающиеся с заглавной буквы или `_` (паттерн `^[A-Z_]`)
- Дефолтная конфигурация движка: sampleRate=48000, bufferSize=1024, targetFPS=30
