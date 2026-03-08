# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Команды

```bash
npm run dev       # Запуск dev-сервера (http://localhost:5173)
npm run build     # Продакшн-сборка в /dist
npm run preview   # Предпросмотр продакшн-сборки
npm run lint      # ESLint (v9, flat config)
npm run test      # Vitest — все тесты (14 файлов)
npx vitest run tests/plugins/generators.test.js  # Запуск одного тест-файла
```

## Архитектура

**DSP Flow Editor** — визуальный редактор графов цифровой обработки сигналов на React 19 + React Flow (`@xyflow/react`). Вся документация и UI на русском языке. Деплой на GitHub Pages через GitHub Actions.

### Плагинная система (ядро)

Центральный паттерн — `PluginRegistry` (синглтон в `src/engine/PluginRegistry.js`). Каждый DSP-блок — плагин с метаданными и процессором. Реестр «замораживается» после инициализации (`initPlugins.js`), новые плагины в рантайме не добавляются.

**59 плагинов** в `src/engine/plugins/` по категориям:
- **generators/** (9) — Sine, Cosine, RefSine, RefCosine, AudioFile, Constant, NoiseGenerator, AMFMPMModulator, PSKModulator
- **filters/** (12) — NotchFIR, BandpassFIR, HighpassFIR, LowpassFIR, HilbertTransformer, Goertzel, Remez, DelayLine, DecimatorInterpolator, CICFilter, FIRFilter, IIRFilter
- **analysis/** (2) — SpectrumAnalyzer, Correlator
- **detectors/** (7) — PhaseDetector, FrequencyDetector, AmplitudeDetector, PLL, AMFMPMDemodulator, FrequencyDiscriminator, TimingRecovery
- **math/** (22) — Summer, Multiplier, Integrator, RealPart, ImagPart, ComplexMultiplier, ComplexSummer, ComplexSquare, ComplexSqrt, ComplexPhase, ComplexMagnitude, ComplexComposer, ComplexConjugate, RealSquare, RealPower4, Atan2, AGC, AbsoluteValue, Gain, LogExp, Mixer, Threshold
- **visualization/** (6) — Oscilloscope, Constellation, Waterfall, NumericIndicator, ComplexNumericIndicator, MultiChannelSpectrumAnalyzer
- **output/** (1) — Speaker

Общие утилиты в `_shared/`: FFTUtils, FilterDesign, WindowFunctions.

Структура плагина:
- `type`, `id`, `group` — идентификация и категория
- `signals: { input, output }` — типы сигналов (`'real'`, `'complex'`, `null`)
- `defaultParams` — параметры по умолчанию
- `processor` — объект с методами `process()`, `init()`, `clearStates()` и `states: Map` для хранения состояния по nodeId

### Компиляция графа

`GraphCompiler` (`src/engine/GraphCompiler.js`) выполняет:
1. Валидацию соединений (совместимость типов сигналов real/complex)
2. Обнаружение циклов (алгоритм Кана)
3. Топологическую сортировку для порядка выполнения

### Обработка сигналов

`DSPProcessor` (`src/engine/DSPProcessor.js`) — поблочная обработка (chunk 1024 сэмпла, Float32Array). Три режима: реальное время (Web Audio API), ручной (пошаговый), файловый (WAV через `WavFileService`). Состояния: `IDLE | RUNNING_REALTIME | RUNNING_MANUAL | RUNNING_FILE`.

### React-слой

- `DSPEditor` (`src/components/dsp/DSPEditor/`) — основной канвас. Кастомные ноды (`block` → `BlockNode`) и рёбра (`RealSignalEdge`, `ComplexSignalEdge`). Drag-and-drop из тулбара.
- **Визуализация** (`src/components/visualization/`) — 4 вида: OscilloscopeView, SpectrumView, WaterfallView, ConstellationView. Управление через `VisualizationManager` (forwardRef + useImperativeHandle).
- **Диалоги** (`src/components/dialogs/`) — BlockParamsDialog, SaveDialog, LoadDialog, SettingsDialog, ConfirmDialog.
- **Layout** — Header, Footer, Toolbar (палитра блоков), ControlToolbar (play/stop/manual).

### Хуки

- `useDSPSimulation` — жизненный цикл симуляции (start/stop, manual mode, progress)
- `useSchemeStorage` — CRUD операции со схемами в localStorage
- `useAutoSave` — автосохранение с debounce 5 сек
- `useDialogManager` — состояние диалоговых окон
- `useTheme` — переключение светлой/тёмной темы

### Состояние и хранение

- React hooks + Context API (`DSPEditorContext`, `ThemeContext`) — основной стейт
- localStorage через `StorageService` — персистентность схем (JSON, лимит 4MB, до 50 схем)
- `ValidationService` — валидация типов сигналов и плагинов

## CI/CD

GitHub Actions (`.github/workflows/deploy.yml`):
- Триггер: push в main
- Node.js 22, npm cache
- Шаги: install → lint → test → build → deploy (GitHub Pages)

## Тесты

213 тестов в 14 файлах (Vitest):
- `tests/engine/` — PluginRegistry, GraphCompiler, DSPProcessor, WavFileService
- `tests/plugins/` — generators, filters, analysis, detectors, math, visualization, shared
- `tests/integration/` — signal-pipeline, helpers-compat

## Соглашения

- Функциональные компоненты с хуками, PropTypes для валидации пропсов
- Компоненты: отдельная папка с `.jsx` + `.css`, реэкспорт через `index.js`
- CSS-переменные в `src/styles/variables.css`, Material Icons для иконок
- camelCase для переменных/функций, PascalCase для компонентов, UPPER_CASE для констант
- Тесты в `tests/` повторяют структуру `src/engine/` и `src/engine/plugins/`
- Все блоки DSP именуются на русском (см. `src/utils/constants.js` → `DSP_BLOCK_TYPES`)
