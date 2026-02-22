# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Команды

```bash
npm run dev       # Запуск dev-сервера (http://localhost:5173)
npm run build     # Продакшн-сборка в /dist
npm run preview   # Предпросмотр продакшн-сборки
npm run lint      # ESLint (v9, flat config)
npm run test      # Vitest — все тесты
npx vitest run tests/plugins/generators.test.js  # Запуск одного тест-файла
```

## Архитектура

**DSP Flow Editor** — визуальный редактор графов цифровой обработки сигналов на React 19 + React Flow (`@xyflow/react`). Вся документация и UI на русском языке.

### Плагинная система (ядро)

Центральный паттерн — `PluginRegistry` (синглтон в `src/engine/PluginRegistry.js`). Каждый DSP-блок — плагин с метаданными и процессором. Реестр «замораживается» после инициализации (`initPlugins.js`), новые плагины в рантайме не добавляются.

Структура плагина:
- `type`, `id`, `group` — идентификация и категория
- `signals: { input, output }` — типы сигналов (`'real'`, `'complex'`, `null`)
- `defaultParams` — параметры по умолчанию
- `processor` — объект с методами `process()`, `init()`, `clearStates()` и `states: Map` для хранения состояния по nodeId

Плагины в `src/engine/plugins/` по категориям: generators, filters, analysis, detectors, math, visualization, output. Общие утилиты (FFT, FilterDesign, WindowFunctions) в `_shared/`.

### Компиляция графа

`GraphCompiler` (`src/engine/GraphCompiler.js`) выполняет:
1. Валидацию соединений (совместимость типов сигналов real/complex)
2. Обнаружение циклов (алгоритм Кана)
3. Топологическую сортировку для порядка выполнения

### Обработка сигналов

`DSPProcessor` (`src/engine/DSPProcessor.js`) — поблочная обработка (chunk 1024 сэмпла, Float32Array). Режимы: реальное время (Web Audio API), ручной (пошаговый), файловый (WAV через `WavFileService`).

### React Flow интеграция

`DSPEditor` (`src/components/dsp/DSPEditor/`) — основной компонент-канвас. Кастомные типы нод (`block` → `BlockNode`) и рёбер (`real`, `complex` с разной стилизацией). Drag-and-drop создание блоков из тулбара.

### Состояние и хранение

- React hooks + Context API (`DSPEditorContext`) — основной стейт
- localStorage через `storageService` — персистентность схем (JSON, лимит 4MB)
- Auto-save с debounce 5 сек (`useAutoSave`)
- MobX подключён, но используется минимально

## Соглашения

- Функциональные компоненты с хуками, PropTypes для валидации пропсов
- Компоненты: отдельная папка с `.jsx` + `.css`, реэкспорт через `index.js`
- CSS-переменные в `src/styles/variables.css`, Material Icons для иконок
- camelCase для переменных/функций, PascalCase для компонентов, UPPER_CASE для констант
- Тесты в `tests/` повторяют структуру `src/engine/` и `src/engine/plugins/`
