# Код-ревью: DSP Flow Editor

**Дата:** 2026-02-26
**Ветка:** `development`
**Тесты:** 177/177 passed
**Версия:** 1.0.0

> **Статус исправлений:** все CRITICAL (C1–C2), HIGH (H1–H9) и MEDIUM (M1–M12) замечания исправлены.

---

## Содержание

1. [Обзор проекта и стек технологий](#1-обзор-проекта-и-стек-технологий)
2. [Архитектура и структура](#2-архитектура-и-структура)
3. [DSP-движок: критические проблемы](#3-dsp-движок-критические-проблемы)
4. [DSP-движок: производительность](#4-dsp-движок-производительность)
5. [Плагины: анализ реализаций](#5-плагины-анализ-реализаций)
6. [React-компоненты и UI](#6-react-компоненты-и-ui)
7. [CSS и стилизация](#7-css-и-стилизация)
8. [Доступность (a11y)](#8-доступность-a11y)
9. [Тестирование](#9-тестирование)
10. [Конфигурация и зависимости](#10-конфигурация-и-зависимости)
11. [Сводная таблица замечаний](#11-сводная-таблица-замечаний)
12. [Рекомендации](#12-рекомендации)

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
- 11 тестовых файлов, 152 теста

---

## 2. Архитектура и структура

### 2.1. Структура проекта

```
src/
├── index.jsx                    # Точка входа (initPlugins → ThemeProvider → App)
├── App.jsx                      # Корневой компонент (~395 строк, 13+ useState)
├── components/
│   ├── common/                  # Dialog, ErrorBoundary, Icons
│   ├── dialogs/                 # BlockParamsDialog, Save/Load/Settings/Confirm
│   ├── dsp/                     # BlockNode, DSPEditor, Edges
│   ├── layout/                  # Header, Footer, ControlToolbar, Toolbar
│   └── visualization/           # Oscilloscope, Spectrum, Waterfall, Constellation
├── contexts/                    # ThemeContext, DSPEditorContext
├── hooks/                       # useAutoSave, useSchemeStorage, useTheme
├── services/                    # storageService, validationService
├── engine/
│   ├── PluginRegistry.js        # Синглтон-реестр плагинов
│   ├── GraphCompiler.js         # Валидация графа, топологическая сортировка
│   ├── DSPProcessor.js          # Поблочная обработка сигнала
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
├── engine/                      # DSPProcessor, GraphCompiler, PluginRegistry
├── plugins/                     # generators, filters, analysis, detectors, math, visualization, shared
└── integration/                 # helpers-compat
```

### 2.2. Архитектурная оценка

**Сильные стороны:**
- Чёткое разделение DSP-движка и UI
- Плагинная система с единым интерфейсом (легко добавлять блоки)
- Валидация совместимости сигналов (real/complex) на уровне компилятора графа
- Кастомные хуки для изоляции бизнес-логики (useAutoSave, useSchemeStorage)

**Проблемы:**
- `App.jsx` — God Object с 13+ useState и смешением управления состоянием, бизнес-логики и рендеринга
- Props drilling через DSPEditor (onOpenParams, onOpenVisualization, onParamUpdate)
- Неявная машина состояний в DSPProcessor (4 независимых boolean-флага вместо enum)

---

## 3. DSP-движок: критические проблемы

### 3.1. [CRITICAL] Race condition в DSPProcessor.start()

**Файл:** `DSPProcessor.js`, строки 130–150

```javascript
if (!this.audioContext || this.audioContext.state === 'closed') {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
}
```

При параллельных вызовах `start()` возможно создание нескольких AudioContext. Отсутствует мьютекс. `processingInterval` также может быть создан дважды.

**Влияние:** утечка ресурсов, неопределённое поведение.

### 3.2. [CRITICAL] Несоответствие размера буфера FFTPlugin

**Файл:** `FFTPlugin.js`, строки 17–23

```javascript
return new Float32Array(chunkSize / 2);  // Возвращает ПОЛОВИНУ chunkSize
```

Выходной буфер вдвое меньше входного. Нижестоящие блоки ожидают `output.length === chunkSize`.

**Влияние:** искажение данных в каскадных цепочках.

### 3.3. [HIGH] Утечка AudioContext при start/stop циклах

**Файл:** `DSPProcessor.js`, строки 195–204

- Множественные циклы start/stop создают новые AudioContext
- `reset()` закрывает контекст DSPProcessor, но не WavFileService
- Браузер ограничен ~6 одновременных AudioContext

**Влияние:** исчерпание ресурсов при активном использовании.

### 3.4. [HIGH] Утечка памяти в SlidingFFTPlugin

**Файл:** `SlidingFFTPlugin.js`, строки 42–68

```javascript
// На каждое окно FFT создаются НОВЫЕ Float32Array
const real = new Float32Array(fftSize);
const imag = new Float32Array(fftSize);
```

При 48 кГц и окне 1024 — ~46 аллокаций/секунду. С несколькими экземплярами SlidingFFT нагрузка на GC значительна.

**Решение:** преаллоцировать буферы и переиспользовать.

### 3.5. [HIGH] Аллокации на горячем пути processNextChunk()

**Файл:** `DSPProcessor.js`

```javascript
for (const block of this.compiledGraph) {
    const output = this.executeBlock(block);     // Аллокация Float32Array
    const outputCopy = new Float32Array(output);  // ВСЕГДА копия
    this.onBlockOutput(block.nodeId, outputCopy);
}
```

При 100 блоках — ~4800 аллокаций/секунду. Создаёт нагрузку на GC.

### 3.6. [HIGH] Сортировка строк на каждом чанке

**Файл:** `DSPProcessor.js`, строка 276

```javascript
const sortedInputs = [...block.inputs].sort((a, b) => {
    return aHandle.localeCompare(bHandle, undefined, { numeric: true });
});
```

`localeCompare` с numeric-парсингом вызывается на **каждом** чанке для **каждого** блока. Сортировку нужно делать один раз при компиляции графа.

### 3.7. [MEDIUM] Неполная очистка состояний при смене типа блока

**Файл:** `DSPProcessor.js`, строки 60–68

Очищаются только удалённые ноды. Если тип ноды изменился (например, Sine → Cosine), старое состояние с неправильной структурой сохраняется.

### 3.8. [MEDIUM] Неявная машина состояний

**Файл:** `DSPProcessor.js`

```javascript
this.isRunning = false;
this.isManualMode = false;
this.isFileMode = false;
this.audioContext = null;
```

Четыре независимых boolean-флага могут рассинхронизироваться. Следует использовать enum: `IDLE | RUNNING_REALTIME | RUNNING_MANUAL | PAUSED`.

### 3.9. [MEDIUM] Необработанный Promise в AudioContext.resume()

**Файл:** `DSPProcessor.js`, строки 136–138

```javascript
if (this.audioContext.state === 'suspended') {
    this.audioContext.resume();  // Promise не awaited
}
```

Race condition между проверкой и resume. Повторный вызов до разрешения промиса вызовет ошибку.

### 3.10. [LOW] Отсутствие валидации входов в executeBlock()

**Файл:** `DSPProcessor.js`, строки 271–305

- Нет проверки существования `sourceState`
- Нет проверки null/undefined в output предыдущих блоков
- Отсутствующие входы молча пропускаются

---

## 4. DSP-движок: производительность

| Проблема | Место | Серьёзность | Решение |
|---|---|---|---|
| Аллокация Float32Array на каждый чанк | DSPProcessor.processNextChunk | HIGH | Пул буферов |
| Аллокация real/imag на каждое FFT-окно | SlidingFFTPlugin | HIGH | Преаллокация |
| localeCompare на каждом чанке/блоке | DSPProcessor.executeBlock | HIGH | Сортировка при компиляции |
| Window function вычисляется per-sample | SlidingFFTPlugin, строки 52–54 | MEDIUM | Предвычислить таблицу |
| Двойной Map.get() при инициализации | FIRFilterPlugin, строки 65–75 | LOW | Вернуть state из init() |
| Три прохода по массиву в Summer | SummerPlugin | LOW | Объединить в один цикл |
| Goertzel вычисляет магнитуду на каждом сэмпле | GoertzelFilterPlugin | LOW | Выводить на границе блока |

---

## 5. Плагины: анализ реализаций

### 5.1. Сводная таблица

| Плагин | Категория | Реализация | Проблемы |
|---|---|---|---|
| SineGenerator | Генераторы | Полная | — |
| CosineGenerator | Генераторы | Полная | — |
| RefSineGenerator | Генераторы | Полная | Нестандартный I/Q (I=sin, Q=cos) |
| RefCosineGenerator | Генераторы | Полная | Нестандартный I/Q |
| AudioFile | Генераторы | Заглушка | Реальная загрузка в DSPProcessor |
| FIRFilter | Фильтры | Полная | createFIRProcessor() без fixedFilterType |
| LowpassFIR | Фильтры | Полная | — |
| HighpassFIR | Фильтры | Полная | — |
| BandpassFIR | Фильтры | Полная | — |
| HilbertTransformer | Фильтры | Полная | — |
| GoertzelFilter | Фильтры | Полная | Магнитуда вычисляется на каждом сэмпле |
| FFT | Анализ | Полная | normalize param не используется; выход = chunkSize/2 |
| SlidingFFT | Анализ | Полная | Утечка аллокаций |
| SpectrumAnalyzer | Анализ | Полная | — |
| FrequencyDetector | Детекторы | Полная | Нет обработки I=Q=0 |
| PhaseDetector | Детекторы | Полная | Нет обработки I=Q=0 |
| Summer | Математика | Полная | — |
| Multiplier | Математика | Полная | — |
| Integrator | Математика | Полная | **Reset-on-overflow: разрыв** |
| RealPart | Математика | Полная | — |
| ImagPart | Математика | Полная | — |
| Oscilloscope | Визуализация | Pass-through | По дизайну |
| Constellation | Визуализация | Pass-through | По дизайну |
| Waterfall | Визуализация | Полная | — |
| Speaker | Выход | Pass-through | muted не используется |

### 5.2. Математическая корректность

**Отлично реализовано:**
- FFT (Cooley-Tukey in-place) — правильный алгоритм, bit-reversal, O(N log N)
- Дизайн фильтров (windowed sinc + Parks-McClellan/Remez) — профессиональная реализация
- Оконные функции (8 штук) — все формулы корректны
- Преобразование Гильберта — правильная задержка и коэффициенты

**Проблемы:**

**5.2.1. [HIGH] Интегратор: разрыв при переполнении**

**Файл:** `IntegratorPlugin.js`

При `resetOnOverflow=true` (по умолчанию) аккумулятор сбрасывается в 0 при превышении maxValue. Это создаёт пилообразный разрыв (скачок на -maxValue), нарушающий непрерывность сигнала.

**Решение:** использовать сатурацию по умолчанию вместо сброса.

**5.2.2. [MEDIUM] Фазовое развёртывание в детекторах**

**Файл:** `FrequencyDetectorPlugin.js`, строки 42–44

```javascript
if (dPhase > Math.PI) dPhase -= 2 * Math.PI;
if (dPhase < -Math.PI) dPhase += 2 * Math.PI;
```

Обрабатывает скачки только ≤ 2π. При больших скачках фазы (высокие частоты, большой sample rate) требуется итеративное развёртывание.

**5.2.3. [MEDIUM] Нет обработки I=Q=0 в детекторах**

`atan2(0, 0)` возвращает 0 в JS (определённое поведение), но семантически фаза неопределена. Стоит явно проверять и выдавать 0 или последнее значение.

**5.2.4. [LOW] Нестандартный I/Q в RefSineGenerator**

I=sin, Q=cos вместо классического I=cos, Q=sin. Формирует e^j(θ+π/2) — повёрнуто на 90°. Математически корректно, но нестандартно.

### 5.3. Неиспользуемые параметры

| Параметр | Плагин | Статус |
|---|---|---|
| `normalize` | FFTPlugin | ~~Объявлен в defaultParams, в процессоре не читается~~ ✅ Удалён |
| `integrationTime` | IntegratorPlugin | ~~Объявлен, но нигде не используется~~ ✅ Удалён |
| `muted` | SpeakerPlugin | Используется в DSPProcessor.js (строка 312) — оставлен |

---

## 6. React-компоненты и UI

### 6.1. Хуки и паттерны

**Хорошо:**
- `useCallback` корректно в Dialog, DSPEditor, VisualizationWindow
- `useRef` для предотвращения обновлений unmounted-компонентов (BlockParamsDialog, LoadDialog)
- `useMemo` в контекст-провайдерах (DSPEditorContext)
- `useImperativeHandle` с forwardRef (VisualizationManager)
- Правильные cleanup-функции в useEffect

**Проблемы:**

**6.1.1. [HIGH] App.jsx — God Object**

~395 строк, 13+ useState, смешивает управление состоянием, бизнес-логику и рендеринг. Следует разбить на:
- `useDialogManager()` — управление диалогами
- `useDSPSimulation()` — управление симуляцией
- Отдельные компоненты для секций UI

**6.1.2. [MEDIUM] Отсутствует useCallback в Toolbar.jsx**

**Файл:** `Toolbar.jsx`, строка 110–123

onKeyDown-коллбэк пересоздаётся на каждый рендер. Нужно обернуть в useCallback.

**6.1.3. [MEDIUM] nodeTypes и edgeTypes пересоздаются на каждый рендер**

**Файл:** `DSPEditor.jsx`, строки 31–38

Объекты создаются в теле компонента без useMemo. Вызывают ненужные перерендеры React Flow.

**6.1.4. [MEDIUM] Множественные setState в useEffect VisualizationManager**

**Файл:** `VisualizationManager.jsx`, строки 74–106

`setWindowData` вызывается внутри updater-функции `setOpenWindows`, что может вызвать двойной рендер.

**6.1.5. [LOW] Отсутствует зависимость в useSchemeStorage**

`exportScheme` зависит от `loadScheme`, но его нет в массиве зависимостей useCallback.

### 6.2. Error Boundaries

- ErrorBoundary реализован и используется в VisualizationManager
- **Не обёрнуты:** DSPEditor, Header, Footer, все диалоги
- Асинхронные ошибки (Promise rejections в диалогах) не перехватываются ErrorBoundary
- Нет механизма восстановления (только кнопка перезагрузки без контекста)

### 6.3. PropTypes

- Все компоненты имеют PropTypes
- **Проблема:** Слишком свободные типы (`PropTypes.object` вместо `PropTypes.shape({...})`)
- Нет валидации элементов массивов (`PropTypes.array` вместо `PropTypes.arrayOf(...)`)

---

## 7. CSS и стилизация

### 7.1. Архитектура

- Component-scoped CSS (1 файл на компонент)
- CSS-переменные для тем (variables.css — 142 строки)
- Тёмная/светлая тема через data-theme + CSS custom properties

### 7.2. Проблемы

**7.2.1. [MEDIUM] Захардкоженные цвета в Canvas-компонентах**

| Файл | Примеры |
|---|---|
| SpectrumView.jsx | `isDarkTheme ? '#60a5fa' : '#3b82f6'` |
| OscilloscopeView.jsx | Множественные хардкоженные значения (строки 32, 36, 58, 68) |
| ConstellationView.jsx | RGBA-значения (строка 88) |
| WaterfallView.jsx | `'#000000'` / `'#ffffff'` (строка 33) |

Canvas-цвета не участвуют в дизайн-системе и не обновляются при смене темы через CSS-переменные.

**7.2.2. [LOW] Дублирование в BlockNode.css**

- `.block-header` определён дважды (строки 72–77 и 264–272)
- `.block-handle` переопределён с другими значениями (строки 161–168 vs 303–310)

**7.2.3. [LOW] VisualizationWindow.css не использует CSS-переменные**

Захардкоженные цвета `#f3f4f6`, `#e5e7eb`, `#111827` вместо `var(--bg-secondary)`, `var(--border-primary)`.

---

## 8. Доступность (a11y)

### 8.1. Хорошо реализовано

- Dialog.jsx: focus trap, auto-focus, ARIA labels
- Toolbar.jsx: `aria-expanded`, `aria-label`, семантический HTML
- BlockNode.jsx: `aria-label` на кнопках визуализации
- Canvas-элементы: `role="img"`, `aria-label`

### 8.2. Проблемы

| Проблема | Файл | Серьёзность |
|---|---|---|
| Нет aria-атрибутов у формы настроек | SettingsDialog.jsx | MEDIUM |
| Resize handle с tabIndex=0 без keyboard handler | VisualizationWindow.jsx (строка 129) | MEDIUM |
| Icon-only кнопки без текстового fallback | BlockNode.jsx (строка 116) | MEDIUM |
| Отсутствует aria-labelledby при пустом title | Dialog.jsx (строка 118) | LOW |
| Слабый контраст в тёмной теме (#6b7280) | VisualizationWindow.css (строка 51) | LOW |

---

## 9. Тестирование

### 9.1. Текущее состояние

| Категория | Файлов | Тестов | Покрытие |
|---|---|---|---|
| Engine (DSPProcessor, GraphCompiler, PluginRegistry, WavFileService) | 4 | ~100 | Отличное |
| Плагины (генераторы, фильтры, анализ, детекторы, мат.) | 7 | ~66 | Хорошее |
| Интеграционные | 2 | 10 | Хорошее |
| **Итого** | **13** | **177** | **~30% файлов** |

### 9.2. Покрытие по модулям

**Покрыто тестами:**
- DSPProcessor — отличное покрытие (включая ошибки, режимы, колбэки)
- GraphCompiler — хорошее покрытие (циклы, топология, валидация)
- PluginRegistry — хорошее покрытие (регистрация, freeze, очистка)
- Генераторы — все 4 протестированы (фаза, амплитуда, изоляция)
- FIR-фильтры — lowpass подробно, bandpass/highpass базово
- FFT, SlidingFFT, SpectrumAnalyzer — базовое покрытие
- Детекторы — фаза и частота покрыты
- Мат. блоки — Summer, Multiplier, Integrator
- Shared утилиты — окна, дизайн фильтров, FFT

**Не покрыто тестами:**

| Модуль | Тип | Строк кода | Критичность |
|---|---|---|---|
| ~~RealPartPlugin, ImagPartPlugin~~ | ~~Плагины~~ | ~~~40~~ | ✅ Покрыто |
| ~~WavFileService~~ | ~~Движок~~ | ~~~150~~ | ✅ Покрыто |
| storageService | Сервисы | ~217 | HIGH |
| validationService | Сервисы | ~178 | MEDIUM |
| useAutoSave | Хуки | ~173 | MEDIUM |
| useSchemeStorage | Хуки | ~268 | MEDIUM |
| OscilloscopePlugin, ConstellationPlugin | Плагины | ~40 | LOW |
| SpeakerPlugin, AudioFilePlugin | Плагины | ~20 | LOW |
| Все React-компоненты | UI | ~3000+ | LOW* |
| initPlugins | Движок | ~96 | LOW |

*\*UI-тесты менее критичны при наличии хорошего покрытия бизнес-логики.*

### 9.3. Проблемы качества тестов

**9.3.1. [HIGH] Слабые допуски в assertions**

```javascript
// detectors.test.js
expect(value).toBeCloseTo(50, -1);  // допуск ±0.5 — слишком грубо
```

**9.3.2. [MEDIUM] Нет тестов для граничных параметров**

- Нет тестов с order=0, order=1 для фильтров
- Нет тестов с frequency=0 или frequency=Nyquist
- Нет тестов с NaN/Infinity на входе
- Нет тестов с chunkSize=0

**9.3.3. [MEDIUM] Отсутствуют интеграционные тесты сигнального тракта**

Нет end-to-end тестов: Generator → Filter → Detector → Oscilloscope.

**9.3.4. [LOW] Нет верификации частотной характеристики фильтров**

Тесты проверяют только DC-компоненту. Нет проверки затухания в стоп-полосе и пульсаций в полосе пропускания.

---

## 10. Конфигурация и зависимости

### 10.1. Лишние зависимости (установлены, но не в package.json)

```
mobx@6.15.0              — не используется
mobx-react-lite@4.1.1    — не используется
@types/react@19.2.10     — TypeScript не используется
@types/react-dom@19.2.3  — TypeScript не используется
csstype@3.2.3            — TypeScript не используется
```

**Действие:** `npm prune` для удаления.

### 10.2. Уязвимости безопасности

| Пакет | Серьёзность | Описание |
|---|---|---|
| minimatch <3.1.3 | HIGH | ReDoS-уязвимость |
| ajv <6.14.0 | MODERATE | ReDoS с $data |

**Действие:** `npm audit fix`.

### 10.3. Отсутствующие конфигурации

| Конфигурация | Статус | Влияние |
|---|---|---|
| .prettierrc | Отсутствует | Нет стандартизации форматирования |
| vitest.config.js | Отсутствует | Используются дефолты Vite |
| .editorconfig | Отсутствует | Нет кросс-IDE консистентности |
| TypeScript (tsconfig) | Отсутствует | Нет статической типизации |
| Pre-commit hooks (husky) | Отсутствует | Lint/test не запускаются автоматически |

---

## 11. Сводная таблица замечаний

### CRITICAL (блокирующие / потеря данных)

| # | Проблема | Файл | Раздел | Статус |
|---|---|---|---|---|
| C1 | Race condition при параллельных start() | DSPProcessor.js | 3.1 | ✅ Исправлено |
| C2 | Размер выходного буфера FFT = chunkSize/2 | FFTPlugin.js | 3.2 | ✅ Исправлено |

### HIGH (серьёзные баги / утечки / производительность)

| # | Проблема | Файл | Раздел | Статус |
|---|---|---|---|---|
| H1 | Утечка AudioContext при start/stop | DSPProcessor.js | 3.3 | ✅ Исправлено |
| H2 | Аллокации Float32Array в SlidingFFT на каждое окно | SlidingFFTPlugin.js | 3.4 | ✅ Исправлено |
| H3 | Копирование буфера на каждый чанк/блок | DSPProcessor.js | 3.5 | ✅ Исправлено |
| H4 | localeCompare на каждом чанке | DSPProcessor.js | 3.6 | ✅ Исправлено |
| H5 | Integrator: разрыв при reset-on-overflow | IntegratorPlugin.js | 5.2.1 | ✅ Исправлено |
| H6 | App.jsx — God Object (395 строк, 13 useState) | App.jsx | 6.1.1 | ✅ Исправлено |
| H7 | Нет тестов для RealPart/ImagPart, WavFileService | tests/ | 9.2 | ✅ Исправлено |
| H8 | 5 лишних npm-зависимостей | package.json | 10.1 | ✅ Исправлено |
| H9 | 2 уязвимости безопасности (ReDoS) | node_modules | 10.2 | ✅ Исправлено |

### MEDIUM (улучшения / рефакторинг)

| # | Проблема | Файл | Раздел | Статус |
|---|---|---|---|---|
| M1 | Неполная очистка состояний при смене типа блока | DSPProcessor.js | 3.7 | ✅ Исправлено |
| M2 | Boolean-флаги вместо enum состояний | DSPProcessor.js | 3.8 | ✅ Исправлено |
| M3 | AudioContext.resume() — Promise не awaited | DSPProcessor.js | 3.9 | ✅ Исправлено |
| M4 | Фазовое развёртывание обрабатывает скачки только ≤2π | FrequencyDetectorPlugin.js | 5.2.2 | ✅ Исправлено |
| M5 | Нет обработки I=Q=0 в детекторах | FrequencyDetector, PhaseDetector | 5.2.3 | ✅ Исправлено |
| M6 | nodeTypes/edgeTypes без useMemo | DSPEditor.jsx | 6.1.3 | ✅ Исправлено (уже на уровне модуля) |
| M7 | Множественные setState в одном useEffect | VisualizationManager.jsx | 6.1.4 | ✅ Исправлено |
| M8 | ErrorBoundary не обёрнуты DSPEditor, диалоги | components/ | 6.2 | ✅ Исправлено |
| M9 | Захардкоженные цвета в Canvas | SpectrumView, OscilloscopeView | 7.2.1 | ✅ Исправлено |
| M10 | Отсутствуют интеграционные тесты тракта | tests/ | 9.3.3 | ✅ Исправлено |
| M11 | Нет .prettierrc | корень проекта | 10.3 | ✅ Исправлено |
| M12 | Неиспользуемые параметры (normalize, integrationTime, muted) | 3 плагина | 5.3 | ✅ Исправлено |

### LOW (мелочи / полировка)

| # | Проблема | Файл | Раздел |
|---|---|---|---|
| L1 | Отсутствие валидации входов в executeBlock | DSPProcessor.js | 3.10 |
| L2 | Нестандартный I/Q в RefSineGenerator | RefSineGeneratorPlugin.js | 5.2.4 |
| L3 | Дублирование CSS-правил в BlockNode.css | BlockNode.css | 7.2.2 |
| L4 | a11y: resize handle без keyboard handler | VisualizationWindow.jsx | 8.2 |
| L5 | Слабые допуски в тестовых assertions | detectors.test.js | 9.3.1 |
| L6 | Нет vitest.config.js | корень проекта | 10.3 |

---

## 12. Рекомендации

### Немедленные действия (1–2 дня) — ✅ Выполнено

1. ~~**Исправить размер буфера FFTPlugin** (C2) — выход фиксирован на chunkSize/2~~
2. ~~**Защитить start() от повторных вызовов** (C1) — guard `if (this.isRunning) return`~~
3. ~~**Удалить лишние зависимости** (H8) — `npm prune`~~
4. ~~**Исправить уязвимости** (H9) — `npm audit fix`~~
5. ~~**Исправить IntegratorPlugin** (H5) — сатурация по умолчанию~~

### Краткосрочные (1–2 недели) — ✅ Выполнено

6. ~~**Преаллокация буферов** (H2, H3) — буферы в state SlidingFFT, убрано лишнее копирование~~
7. ~~**Сортировка входов при компиляции** (H4) — перенесено в GraphCompiler~~
8. ~~**Добавить тесты** (H7) — RealPart, ImagPart, WavFileService (+21 тест)~~
9. ~~**Рефакторинг App.jsx** (H6) — выделены useDialogManager и useDSPSimulation~~
10. ~~**Добавить .prettierrc** (M11) — стандартизировать форматирование~~

### Среднесрочные — ✅ Выполнено

11. ~~**Enum состояний DSPProcessor** (M2) — ProcessorState enum, геттеры/сеттеры для обратной совместимости~~
12. ~~**ErrorBoundary на все секции** (M8) — обёрнуты DSPEditor и блок диалогов~~
13. ~~**Canvas-цвета через CSS-переменные** (M9) — getCanvasColors() + CSS custom properties~~
14. ~~**Удалить неиспользуемые параметры** (M12) — normalize из FFTPlugin, integrationTime из IntegratorPlugin~~
15. **Pre-commit hooks** — husky + lint-staged (не входило в текущий скоуп)

### Долгосрочные

16. Миграция на TypeScript для статической типизации
17. E2E-тесты (Playwright) для workflow редактора
18. Документация API для разработчиков плагинов
19. Web Worker для DSP-обработки (разгрузка main thread)
