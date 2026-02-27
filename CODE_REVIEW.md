# Код-ревью: DSP Flow Editor

**Дата:** 2026-02-27 (ревизия 2)
**Ветка:** `main`
**Тесты:** 177/177 passed | **Линтер:** 0 ошибок
**Версия:** 1.0.0

> **Статус:** все CRITICAL, HIGH и MEDIUM замечания ревью v1 исправлены.
> Все CRITICAL и HIGH замечания ревью v2 исправлены.

---

## Содержание

1. [Обзор проекта и стек технологий](#1-обзор-проекта-и-стек-технологий)
2. [Архитектура и структура](#2-архитектура-и-структура)
3. [DSP-движок](#3-dsp-движок)
4. [Плагины](#4-плагины)
5. [React-компоненты и UI](#5-react-компоненты-и-ui)
6. [CSS и стилизация](#6-css-и-стилизация)
7. [Доступность (a11y)](#7-доступность-a11y)
8. [Тестирование](#8-тестирование)
9. [CI/CD и конфигурация](#9-cicd-и-конфигурация)
10. [Сводная таблица замечаний](#10-сводная-таблица-замечаний)
11. [Рекомендации](#11-рекомендации)
12. [Общая оценка](#12-общая-оценка)

---

## 1. Обзор проекта и стек технологий

**DSP Flow** — визуальный графовый редактор для цифровой обработки сигналов на базе React 19 и React Flow.

| Технология | Версия | Назначение |
|---|---|---|
| React | 19.2.0 | UI-фреймворк |
| React DOM | 19.2.0 | DOM-рендеринг |
| @xyflow/react | 12.10.0 | Графовый редактор (node-based UI) |
| Vite | 7.2.4+ | Сборка и dev-сервер |
| Vitest | 4.0.18 | Unit-тесты |
| ESLint | 9.39.1 | Линтинг (flat config v9) |
| prop-types | 15.8.1 | Рантайм-валидация пропсов |

**Статистика:**
- ~63 JS/JSX-файла исходного кода
- ~21 CSS-файл (~2900 строк)
- ~30 DSP-плагинов
- 13 тестовых файлов, 177 тестов

---

## 2. Архитектура и структура

### 2.1. Структура проекта

```
src/
├── index.jsx                    # Точка входа (initPlugins → ThemeProvider → App)
├── App.jsx                      # Корневой компонент (рефакторен: useDialogManager + useDSPSimulation)
├── components/
│   ├── common/                  # Dialog, ErrorBoundary, Icons
│   ├── dialogs/                 # BlockParamsDialog, Save/Load/Settings/Confirm
│   ├── dsp/                     # BlockNode, DSPEditor, Edges
│   ├── layout/                  # Header, Footer, ControlToolbar, Toolbar
│   └── visualization/           # Oscilloscope, Spectrum, Waterfall, Constellation
├── contexts/                    # ThemeContext, DSPEditorContext
├── hooks/                       # useAutoSave, useSchemeStorage, useTheme, useDialogManager, useDSPSimulation
├── services/                    # storageService, validationService
├── engine/
│   ├── PluginRegistry.js        # Синглтон-реестр плагинов
│   ├── GraphCompiler.js         # Валидация графа, топологическая сортировка
│   ├── DSPProcessor.js          # Поблочная обработка сигнала (ProcessorState enum)
│   ├── WavFileService.js        # Чтение WAV-файлов
│   ├── initPlugins.js           # Регистрация всех плагинов
│   └── plugins/
│       ├── _shared/             # FFTUtils, FilterDesign, WindowFunctions
│       ├── generators/          # Sine, Cosine, RefSine, RefCosine, AudioFile
│       ├── filters/             # FIR, Lowpass, Highpass, Bandpass, Hilbert, Goertzel
│       ├── analysis/            # FFT, SlidingFFT, SpectrumAnalyzer
│       ├── detectors/           # FrequencyDetector, PhaseDetector
│       ├── math/                # Summer, Multiplier, Integrator, RealPart, ImagPart
│       ├── visualization/       # Oscilloscope, Constellation, Waterfall
│       └── output/              # Speaker
tests/
├── engine/                      # DSPProcessor, GraphCompiler, PluginRegistry, WavFileService
├── plugins/                     # generators, filters, analysis, detectors, math, visualization, shared
└── integration/                 # signal-pipeline, helpers-compat
```

### 2.2. Архитектурная оценка

**Сильные стороны:**
- Чёткое разделение DSP-движка и UI
- Плагинная система с единым интерфейсом (легко добавлять блоки)
- Валидация совместимости сигналов (real/complex) на уровне компилятора графа
- Кастомные хуки для изоляции бизнес-логики (useAutoSave, useSchemeStorage, useDialogManager, useDSPSimulation)
- ProcessorState enum вместо boolean-флагов

**Открытые вопросы:**
- Props drilling через DSPEditor (частично снято хуками, но Context для симуляции не используется)
- Spread params `{ ...block.params, sampleRate }` на каждом чанке — аллокация на горячем пути

---

## 3. DSP-движок

### 3.1. Исправленные проблемы (v1)

| # | Проблема | Решение | Статус |
|---|---|---|---|
| C1 | Race condition в start() | Guard `if (this.isRunning) return` | ✅ |
| C2 | Размер буфера FFT = chunkSize/2 | Фиксирован | ✅ |
| H1 | Утечка AudioContext при start/stop | Переиспользование + close в reset() | ✅ |
| H2 | Аллокации в SlidingFFT | Преаллокация буферов | ✅ |
| H3 | Копирование буфера на каждый чанк | Убрано лишнее копирование | ✅ |
| H4 | localeCompare на каждом чанке | Сортировка при компиляции | ✅ |

### 3.2. Исправленные проблемы (v2)

| # | Проблема | Решение | Статус |
|---|---|---|---|
| N1 | WavFileService.readChunk() — slice() вместо subarray() | `slice()` → `subarray()` | ✅ |
| N2 | reset() закрывает AudioContext, разделяемый с WavFileService | reset() сбрасывает WavFileService до close(); init() проверяет state !== 'closed' | ✅ |
| N9 | SpeakerPlugin.muted — логика в движке | Логика muted перенесена в SpeakerPlugin.process() | ✅ |

### 3.3. Открытые проблемы

| # | Проблема | Файл | Серьёзность |
|---|---|---|---|
| N3 | Spread params `{ ...block.params, sampleRate }` на каждом чанке | DSPProcessor.js:364 | MEDIUM |
| N4 | playAudioChunk() — аллокации, поэлементное копирование | DSPProcessor.js:411-434 | MEDIUM |
| N5 | blockStates.clear() обнуляет состояния до проверки типов | DSPProcessor.js:99, 112-124 | MEDIUM |
| N6 | WavFileService — нет валидации параметров readChunk() | WavFileService.js:81 | LOW |
| N7 | WavFileService.loadFile() — нет try-catch для decodeAudioData() | WavFileService.js:42 | LOW |

---

## 4. Плагины

### 4.1. Исправленные проблемы

| # | Проблема | Решение | Статус |
|---|---|---|---|
| H5 | Integrator: разрыв при reset-on-overflow | Сатурация по умолчанию | ✅ |
| M4 | Фазовое развёртывание ≤2π | while циклы | ✅ |
| M5 | Нет обработки I=Q=0 в детекторах | Проверка mag < 1e-10 | ✅ |
| M12 | Неиспользуемые параметры (normalize, integrationTime) | Удалены | ✅ |
| N8 | FilterDesign — ошибка для чётного order | `i === Math.floor(M / 2)` | ✅ |

### 4.2. Математическая корректность

**Отлично реализовано:**
- FFT (Cooley-Tukey in-place) — правильный алгоритм
- Дизайн фильтров (windowed sinc + Parks-McClellan/Remez)
- Оконные функции (8 штук) — все формулы корректны
- Преобразование Гильберта

### 4.3. Открытые проблемы

| # | Проблема | Файл | Серьёзность |
|---|---|---|---|
| N10 | Неиспользуемые параметры в Oscilloscope/Constellation | visualization plugins | MEDIUM |
| N11 | Несогласованность I/Q между RefSine и RefCosine | generators | MEDIUM |
| N12 | Goertzel — Math.round вместо floor для bin | GoertzelFilterPlugin.js | MEDIUM |
| N13 | FFTUtils.computeMagnitudeDB — нет защиты от underflow | FFTUtils.js | LOW |
| N14 | AudioFilePlugin — заглушка | AudioFilePlugin.js | LOW |
| L2 | Нестандартный I/Q в RefSineGenerator | RefSineGeneratorPlugin.js | LOW |

### 4.4. Сводная таблица плагинов

| Плагин | Категория | Реализация | Проблемы |
|---|---|---|---|
| SineGenerator | Генераторы | Полная | — |
| CosineGenerator | Генераторы | Полная | — |
| RefSineGenerator | Генераторы | Полная | Нестандартный I/Q (L2) |
| RefCosineGenerator | Генераторы | Полная | Несогласованность с RefSine (N11) |
| AudioFile | Генераторы | Заглушка | Реальная загрузка в DSPProcessor (N14) |
| FIRFilter | Фильтры | Полная | — |
| LowpassFIR | Фильтры | Полная | — |
| HighpassFIR | Фильтры | Полная | — |
| BandpassFIR | Фильтры | Полная | — |
| HilbertTransformer | Фильтры | Полная | — |
| GoertzelFilter | Фильтры | Полная | Math.round для bin (N12) |
| FFT | Анализ | Полная | — |
| SlidingFFT | Анализ | Полная | — |
| SpectrumAnalyzer | Анализ | Полная | — |
| FrequencyDetector | Детекторы | Полная | — |
| PhaseDetector | Детекторы | Полная | — |
| Summer | Математика | Полная | — |
| Multiplier | Математика | Полная | — |
| Integrator | Математика | Полная | — |
| RealPart | Математика | Полная | — |
| ImagPart | Математика | Полная | — |
| Oscilloscope | Визуализация | Pass-through | Неиспользуемые params (N10) |
| Constellation | Визуализация | Pass-through | Неиспользуемые params (N10) |
| Waterfall | Визуализация | Полная | — |
| Speaker | Выход | Полная | muted теперь обрабатывается в process() |

---

## 5. React-компоненты и UI

### 5.1. Исправленные проблемы

| # | Проблема | Решение | Статус |
|---|---|---|---|
| H6 | App.jsx — God Object | Выделены useDialogManager, useDSPSimulation | ✅ |
| M6 | nodeTypes/edgeTypes без useMemo | Вынесены на уровень модуля | ✅ |
| M7 | Множественные setState в useEffect | Исправлено | ✅ |
| M8 | ErrorBoundary не обёрнуты DSPEditor, диалоги | Обёрнуты | ✅ |
| N15 | VisualizationManager — openWindows в deps useEffect | Убран из deps, functional update через prev | ✅ |
| N17 | openWindow зависит от openWindows.size | Вычисление через prev.size | ✅ |
| N22 | ESLint — 2 предупреждения | Исправлены (eslint-disable, удалён vi import) | ✅ |

### 5.2. Хорошие паттерны

- `useCallback` корректно в Dialog, DSPEditor, VisualizationWindow
- `useRef` для предотвращения обновлений unmounted-компонентов
- `useMemo` в контекст-провайдерах (DSPEditorContext)
- `useImperativeHandle` с forwardRef (VisualizationManager)
- Правильные cleanup-функции в useEffect

### 5.3. Открытые проблемы

| # | Проблема | Файл | Серьёзность |
|---|---|---|---|
| N16 | useDSPSimulation — нет mounted check после async | useDSPSimulation.js | MEDIUM |
| N18 | processedSchemeRef блокирует повторную загрузку | DSPEditor.jsx | MEDIUM |
| N19 | Hardcoded цвета в edges | edges/ | LOW |
| N20 | Footer — callbacks без default | Footer.jsx | LOW |
| L5 | useSchemeStorage — зависимость в useCallback | useSchemeStorage.js | LOW |

### 5.4. PropTypes

- Все компоненты имеют PropTypes
- Некоторые слишком свободные (`PropTypes.object` вместо `PropTypes.shape({...})`)

---

## 6. CSS и стилизация

### 6.1. Архитектура

- Component-scoped CSS (1 файл на компонент)
- CSS-переменные для тем (variables.css — 142 строки)
- Тёмная/светлая тема через data-theme + CSS custom properties
- Canvas-цвета через `getCanvasColors()` + CSS custom properties (M9 ✅)

### 6.2. Открытые проблемы

| # | Проблема | Серьёзность |
|---|---|---|
| N19 | Hardcoded цвета в edge-компонентах (#3b82f6, #8b5cf6) | LOW |
| L3 | Дублирование CSS-правил в BlockNode.css | LOW |

---

## 7. Доступность (a11y)

### 7.1. Хорошо реализовано

- Dialog.jsx: focus trap, auto-focus, ARIA labels
- Toolbar.jsx: `aria-expanded`, `aria-label`, семантический HTML
- BlockNode.jsx: `aria-label` на кнопках
- Canvas-элементы: `role="img"`, `aria-label`

### 7.2. Открытые проблемы

| Проблема | Файл | Серьёзность |
|---|---|---|
| Resize handle с tabIndex=0 без keyboard handler | VisualizationWindow.jsx | LOW |
| Слабый контраст в тёмной теме (#6b7280) | VisualizationWindow.css | LOW |

---

## 8. Тестирование

### 8.1. Текущее состояние

| Категория | Файлов | Тестов | Покрытие |
|---|---|---|---|
| Engine (DSPProcessor, GraphCompiler, PluginRegistry, WavFileService) | 4 | 77 | Отличное |
| Плагины (генераторы, фильтры, анализ, детекторы, мат.) | 7 | 81 | Хорошее |
| Shared утилиты (FFT, FilterDesign, WindowFunctions) | 1 | 15 | Хорошее |
| Интеграционные (signal-pipeline, helpers-compat) | 2 | 10 | Базовое |
| **Итого** | **13** | **177** | **~35% файлов** |

### 8.2. Исправления

| # | Проблема | Решение | Статус |
|---|---|---|---|
| H7 | Нет тестов для RealPart/ImagPart, WavFileService | Добавлены | ✅ |
| M10 | Нет интеграционных тестов тракта | Добавлены 4 теста | ✅ |
| N25 | Опасные допуски ±10 в assertions | Заменены на ±5 Гц range-проверки | ✅ |

### 8.3. Непокрытые модули

| Модуль | Строк кода | Критичность |
|---|---|---|
| storageService.js | ~217 | HIGH |
| validationService.js | ~178 | MEDIUM |
| useAutoSave.js | ~173 | MEDIUM |
| useSchemeStorage.js | ~268 | MEDIUM |
| useDSPSimulation.js | ~150 | MEDIUM |
| Все React-компоненты | ~3000+ | LOW* |

### 8.4. Пропущенные граничные случаи

- Нет тестов с NaN/Infinity на входе
- Нет тестов с отрицательными параметрами (frequency < 0)
- Нет тестов с cutoff > Nyquist
- Нет стресс-тестов производительности
- Нет глубоких интеграционных сценариев (diamond pattern, 5+ узлов)

---

## 9. CI/CD и конфигурация

### 9.1. GitHub Actions

| Аспект | Статус |
|---|---|
| Node 22, npm cache | ✅ |
| `npm run lint` перед сборкой | ✅ (N21 исправлено) |
| `npm run test` перед сборкой | ✅ (N21 исправлено) |
| GitHub Pages deploy | ✅ |
| Coverage reporting | ❌ Отсутствует |
| Кросс-платформенное тестирование | ❌ Только ubuntu |

### 9.2. Конфигурация

| Конфигурация | Статус |
|---|---|
| .prettierrc | ✅ singleQuote, semi, tabWidth=4 |
| eslint.config.js (v9 flat) | ✅ 0 ошибок |
| vitest.config.js | ❌ Отсутствует (используются дефолты Vite) |
| .editorconfig | ❌ Отсутствует |
| Pre-commit hooks (husky) | ❌ Отсутствует |

---

## 10. Сводная таблица замечаний

### CRITICAL — все исправлены ✅

| # | Проблема | Файл | Ревью | Статус |
|---|---|---|---|---|
| C1 | Race condition в start() | DSPProcessor.js | v1 | ✅ |
| C2 | Размер буфера FFT | FFTPlugin.js | v1 | ✅ |
| N21 | CI не запускает тесты перед деплоем | deploy.yml | v2 | ✅ |

### HIGH — все исправлены ✅

| # | Проблема | Файл | Ревью | Статус |
|---|---|---|---|---|
| H1 | Утечка AudioContext при start/stop | DSPProcessor.js | v1 | ✅ |
| H2 | Аллокации Float32Array в SlidingFFT | SlidingFFTPlugin.js | v1 | ✅ |
| H3 | Копирование буфера на каждый чанк | DSPProcessor.js | v1 | ✅ |
| H4 | localeCompare на каждом чанке | DSPProcessor.js | v1 | ✅ |
| H5 | Integrator: разрыв при reset-on-overflow | IntegratorPlugin.js | v1 | ✅ |
| H6 | App.jsx — God Object | App.jsx | v1 | ✅ |
| H7 | Нет тестов для RealPart/ImagPart, WavFileService | tests/ | v1 | ✅ |
| H8 | 5 лишних npm-зависимостей | package.json | v1 | ✅ |
| H9 | 2 уязвимости безопасности (ReDoS) | node_modules | v1 | ✅ |
| N1 | WavFileService.readChunk() — slice() вместо subarray() | WavFileService.js | v2 | ✅ |
| N2 | reset() закрывает AudioContext, разделяемый с WavFileService | DSPProcessor.js | v2 | ✅ |
| N8 | FilterDesign — ошибка для чётного order | FilterDesign.js | v2 | ✅ |
| N9 | SpeakerPlugin.muted — логика в движке | SpeakerPlugin.js | v2 | ✅ |
| N15 | VisualizationManager — openWindows в deps useEffect | VisualizationManager.jsx | v2 | ✅ |
| N25 | Опасные допуски ±10 в assertions | detectors.test.js | v2 | ✅ |

### MEDIUM — все v1 исправлены, v2 открыты

| # | Проблема | Файл | Ревью | Статус |
|---|---|---|---|---|
| M1 | Очистка состояний при смене типа блока | DSPProcessor.js | v1 | ✅ |
| M2 | Boolean-флаги → enum | DSPProcessor.js | v1 | ✅ |
| M3 | AudioContext.resume() не awaited | DSPProcessor.js | v1 | ✅ |
| M4 | Фазовое развёртывание ≤2π | FrequencyDetectorPlugin.js | v1 | ✅ |
| M5 | Нет обработки I=Q=0 | детекторы | v1 | ✅ |
| M6 | nodeTypes/edgeTypes без useMemo | DSPEditor.jsx | v1 | ✅ |
| M7 | Множественные setState в useEffect | VisualizationManager.jsx | v1 | ✅ |
| M8 | ErrorBoundary не обёрнуты | components/ | v1 | ✅ |
| M9 | Захардкоженные цвета в Canvas | visualization views | v1 | ✅ |
| M10 | Нет интеграционных тестов тракта | tests/ | v1 | ✅ |
| M11 | Нет .prettierrc | корень проекта | v1 | ✅ |
| M12 | Неиспользуемые параметры | плагины | v1 | ✅ |
| N3 | Spread params на каждый чанк | DSPProcessor.js | v2 | |
| N4 | playAudioChunk() — аллокации | DSPProcessor.js | v2 | |
| N5 | blockStates.clear() перед проверкой типов | DSPProcessor.js | v2 | |
| N10 | Неиспользуемые параметры в Oscilloscope/Constellation | visualization plugins | v2 | |
| N11 | Несогласованность I/Q | generators | v2 | |
| N12 | Goertzel — Math.round вместо floor | GoertzelFilterPlugin.js | v2 | |
| N16 | useDSPSimulation — нет mounted check | useDSPSimulation.js | v2 | |
| N17 | openWindow зависит от openWindows.size | VisualizationManager.jsx | v2 | ✅ |
| N18 | processedSchemeRef блокирует повторную загрузку | DSPEditor.jsx | v2 | |
| N22 | ESLint — 2 предупреждения | ThemeContext, test | v2 | ✅ |

### LOW — открыты

| # | Проблема | Файл | Ревью |
|---|---|---|---|
| L1 | Отсутствие валидации входов в executeBlock | DSPProcessor.js | v1 |
| L2 | Нестандартный I/Q в RefSineGenerator | RefSineGeneratorPlugin.js | v1 |
| L3 | Дублирование CSS-правил в BlockNode.css | BlockNode.css | v1 |
| L4 | Resize handle без keyboard handler | VisualizationWindow.jsx | v1 |
| L5 | Зависимость в useSchemeStorage useCallback | useSchemeStorage.js | v1 |
| L6 | Нет vitest.config.js | корень проекта | v1 |
| N6 | WavFileService — нет валидации параметров | WavFileService.js | v2 |
| N7 | WavFileService.loadFile() — нет try-catch | WavFileService.js | v2 |
| N13 | FFTUtils — нет защиты от underflow | FFTUtils.js | v2 |
| N14 | AudioFilePlugin — заглушка | AudioFilePlugin.js | v2 |
| N19 | Hardcoded цвета в edges | edges/ | v2 |
| N20 | Footer — callbacks без default | Footer.jsx | v2 |
| N23 | Отсутствует vitest.config.js | — | v2 |
| N24 | Отсутствует .editorconfig | — | v2 |

---

## 11. Рекомендации

### Выполнено ✅

1. ~~Race condition в start(), размер буфера FFT~~ (v1 C1, C2)
2. ~~Утечки AudioContext, аллокации SlidingFFT, localeCompare~~ (v1 H1–H4)
3. ~~Рефакторинг App.jsx, enum состояний, ErrorBoundary~~ (v1 H6, M2, M8)
4. ~~CI: lint + test перед build~~ (v2 N21)
5. ~~slice()→subarray(), AudioContext lifecycle, FilterDesign чётный order~~ (v2 N1, N2, N8)
6. ~~SpeakerPlugin muted, VisualizationManager useEffect deps~~ (v2 N9, N15)
7. ~~Допуски в тестах, ESLint ошибки~~ (v2 N25, N22)

### Среднесрочные (1–2 недели)

8. **N3** — Вынести `paramsWithSampleRate` из горячего пути в `initialize()`
9. **N4** — Оптимизировать `playAudioChunk()` — `channelData.set()` вместо цикла
10. **N10, N11** — Реализовать логику параметров в visualization-плагинах или убрать из UI
11. **N16** — Добавить `mountedRef` в useDSPSimulation
12. Добавить тесты для storageService и validationService
13. Добавить граничные тесты: NaN, Infinity, нулевые параметры

### Долгосрочные

14. TypeScript миграция
15. E2E-тесты (Playwright)
16. AudioWorklet для потоковой обработки
17. Web Worker для DSP-вычислений (разгрузка main thread)
18. Документация API для разработчиков плагинов
19. Pre-commit hooks (husky + lint-staged)

---

## 12. Общая оценка

| Аспект | Оценка | Комментарий |
|---|---|---|
| Архитектура | 8/10 | Чёткое разделение engine/UI, плагинная система, рефакторенный App.jsx |
| DSP-корректность | 8/10 | Алгоритмы верны, FilterDesign исправлен. Минус: I/Q конвенция |
| Производительность | 7/10 | Основные hot-path проблемы решены. Остались: spread params, playAudioChunk |
| React-качество | 8/10 | Хорошая декомпозиция, useEffect deps исправлены. Минус: mounted checks |
| Тестирование | 7/10 | 177 тестов, допуски ужесточены. Минус: нет edge case тестов |
| DevOps | 7/10 | CI запускает lint + test. Нет coverage, нет pre-commit hooks |
| **Итого** | **7.5/10** | Все CRITICAL и HIGH исправлены. Остались MEDIUM-оптимизации |
