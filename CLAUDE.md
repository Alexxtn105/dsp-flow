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

## Tech Stack

React 19 + Vite 7, @xyflow/react (React Flow) для графового редактора, MobX для состояния выполнения, d3 для визуализации, fft.js для БПФ. Язык — JavaScript/JSX (без TypeScript). CSS — покомпонентный (BEM).

## Architecture

### Три слоя движка обработки (`src/engine/`)

1. **GraphCompiler** — валидация типов сигналов между блоками, обнаружение циклов (DFS), топологическая сортировка (Kahn's algorithm), генерация execution plan.
2. **DSPEngine** — исполнение графа: проход узлов в топологическом порядке, кеширование выходов (`nodeOutputs` Map), делегирование в DSPLib.
3. **DSPLib** — чистые статические функции обработки сигналов (FIR, FFT, Hilbert, детекторы, генераторы).

### Поток данных

Пользователь собирает схему → изменение nodes/edges запускает `GraphCompiler.compile()` → при нажатии Run `DSPExecutionStore.start()` → `requestAnimationFrame` цикл на 30 FPS → `DSPEngine.executeOneCycle()` → sink-узлы обновляют `visualizationData` → floating-окна рендерят результат.

### Управление состоянием

- **MobX singleton** (`src/stores/DSPExecutionStore.js`) — единственный store, содержит `isRunning`, `compiledGraph`, `compilationErrors`, `executionData`, `visualizationData`. Computed: `hasErrors`, `canStart`, `totalNodes`.
- **React Context** (`src/contexts/DSPEditorContext.jsx`) — ReactFlow instance, данные текущей схемы, методы сохранения.
- Hooks (`src/hooks/`) — useAutoSave, useTheme, useSchemeStorage, useNodeParams.

### Система типов сигналов

Два типа: `REAL` (Float32Array) и `COMPLEX` ({real, imag}). Конфигурация в `BLOCK_SIGNAL_CONFIG` (`src/utils/constants.js`). Соединение complex→real запрещено на уровне компилятора. Преобразование real→complex — через Hilbert/FFT блоки.

## Key Files

- `src/utils/constants.js` — все типы блоков (`DSP_BLOCK_TYPES`), конфигурация сигналов, параметры по умолчанию, группы UI
- `src/components/dsp/DSPEditor/` — главный компонент-холст с React Flow
- `src/components/dsp/BlockNode/` — визуальное представление блока на холсте
- `src/components/layout/Toolbar/` — левая панель с библиотекой блоков (drag-and-drop)
- `src/services/storageService.js` — работа с localStorage (сохранение/загрузка схем)

## Adding a New DSP Block

1. `src/utils/constants.js` — добавить в `DSP_BLOCK_TYPES`, `BLOCK_SIGNAL_CONFIG`, `DSP_ICONS`, `DEFAULT_BLOCK_PARAMS`, нужную группу в `DSP_GROUPS`
2. `src/engine/DSPEngine.js` — добавить case в `executeNode()`, реализовать `process*()` метод
3. `src/engine/DSPLib.js` — добавить статический метод алгоритма (если нужен новый)
4. `src/components/dsp/ParamsEditor/` — добавить рендеринг параметров нового типа

## Conventions

- Все названия блоков на русском языке (например, `'КИХ-Фильтр'`, `'Осциллограф'`)
- Иконки — Google Material Icons (через CSS-класс `material-symbols-outlined`)
- Персистентность — только localStorage (backend на Go планируется, но не реализован)
- Функциональные компоненты с hooks, `memo()` для оптимизации рендера
