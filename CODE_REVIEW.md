# Code Review: dsp-flow (повторное)

**Дата:** 22 февраля 2026
**Ветка:** development (коммит cd5e0a3)
**Тесты:** 59/59, ESLint: OK

---

## Сводка

| Серьёзность | Кол-во |
|-------------|--------|
| Critical    | 2      |
| Major       | 20     |
| Minor       | 20     |
| **Итого**   | **42** |

Все 8 critical-проблем из предыдущего ревью исправлены. Оставшиеся critical относятся к отсутствию тестов.

---

## 1. CRITICAL

### 1.1 GraphCompiler — полное отсутствие тестов
**Файл:** `src/engine/GraphCompiler.js`
**Тип:** тестовое покрытие
Ядро системы (топологическая сортировка, обнаружение циклов, валидация типов сигналов) не имеет ни одного теста. Ошибки здесь приводят к молчаливым некорректным результатам.
**Требуемые тесты:** циклы, несовместимые типы, пустой граф, изолированные узлы, корректный топологический порядок.

### 1.2 DSPProcessor — полное отсутствие тестов
**Файл:** `src/engine/DSPProcessor.js`
**Тип:** тестовое покрытие
Нет тестов для `initialize()`, `start()`, `stop()`, `reset()`, `processNextChunk()`, `executeBlock()`. Нет тестов для режимов (manual, file, real-time) и callback-ов.

---

## 2. MAJOR

### DSP-движок

#### 2.1 DSPProcessor: нет валидации sampleRate
**Файл:** `src/engine/DSPProcessor.js:98, 316`
При `sampleRate === 0`: `intervalMs = Infinity` (зависание setInterval), `createBuffer()` бросит исключение.
**Исправление:** проверка `sampleRate > 0` в `start()` и `playAudioChunk()`.

#### 2.2 FilterDesign: нормализация highpass на DC вместо Nyquist
**Файл:** `src/engine/plugins/_shared/FilterDesign.js:34-38`
Unity gain нормализуется через сумму коэффициентов (DC). Для highpass нужна альтернирующая сумма (Nyquist).
**Исправление:** для highpass: `sum += (i % 2 === 0 ? coeffs[i] : -coeffs[i])`.

#### 2.3 FilterDesign: spectral inversion — неточный центральный индекс
**Файл:** `src/engine/plugins/_shared/FilterDesign.js:42-44`
`Math.floor(M / 2)` при чётном order. Правильно: `Math.floor(order / 2)`.

#### 2.4 designRemez — заглушка вводит в заблуждение
**Файл:** `src/engine/plugins/_shared/FilterDesign.js:53-56`
Пользователь выбирает Remez в UI, получает Windowed Sinc без ошибки.

#### 2.5 FFTPlugin игнорирует параметр fftSize
**Файл:** `src/engine/plugins/analysis/FFTPlugin.js:19-20`
`params.fftSize` не используется. Размер определяется автоматически из `input.length`.

#### 2.6 computeMagnitudeDB: DC-компонента масштабируется неправильно
**Файл:** `src/engine/plugins/_shared/FFTUtils.js:56-62`
`scale = 2/N` для всех компонент, включая DC (индекс 0). DC должен быть `1/N`.

#### 2.7 MultiplierPlugin: при одном входе результат всегда 0
**Файл:** `src/engine/plugins/math/MultiplierPlugin.js:15-16`
Второй вход = `Float32Array(chunkSize)` (нули). Корректнее: fallback на 1.0.

#### 2.8 IntegratorPlugin: сброс при overflow теряет данные без предупреждения
**Файл:** `src/engine/plugins/math/IntegratorPlugin.js:38-40`
`accumulator = 0` — резкий разрыв сигнала. Нет опции saturation (clamp).

#### 2.9 GoertzelFilterPlugin: первые N отсчётов выход = 0
**Файл:** `src/engine/plugins/filters/GoertzelFilterPlugin.js:52`
Магнитуда вычисляется каждые N отсчётов. До первого вычисления выход нулевой.

#### 2.10 FIRFilterPlugin: не пересчитывает коэффициенты при изменении параметров
**Файл:** `src/engine/plugins/filters/FIRFilterPlugin.js:57-67`
Если cutoff/order изменяются в рантайме, коэффициенты остаются старыми.

#### 2.11 GraphCompiler: несвязные компоненты графа не обнаруживаются
**Файл:** `src/engine/GraphCompiler.js:115-158`
Алгоритм Кана обнаруживает циклы, но не orphaned подграфы.

#### 2.12 areSignalsCompatible — неполная логика
**Файл:** `src/utils/helpers.js`
`sourceType === targetType` не учитывает `null` для генераторов/sink-блоков.

### Фронтенд

#### 2.13 App.jsx: debounce timer не очищается перед пересозданием
**Файл:** `src/App.jsx:203-212`
Старый таймер не отменяется при новом вызове onProgress.
**Исправление:** `clearTimeout(progressTimerRef.current)` перед `setTimeout()`.

#### 2.14 BlockParamsDialog: нет mountedRef-проверки в async handleFileSelect
**Файл:** `src/components/dialogs/BlockParamsDialog/BlockParamsDialog.jsx:60-83`
`decodeAudioData()` может завершиться после размонтирования — setState на размонтированный компонент.

#### 2.15 DSPEditor: hasLoadedExternalScheme никогда не сбрасывается
**Файл:** `src/components/dsp/DSPEditor/DSPEditor.jsx:70-71`
После загрузки схемы флаг = true навсегда. Автосохранение не включится после создания новой схемы.

#### 2.16 DSPEditor: Strict Mode может вызвать дублирование загрузки
**Файл:** `src/components/dsp/DSPEditor/DSPEditor.jsx:161-168`
`setLoadedSchemeData(null)` при двойном запуске эффекта в Strict Mode — схема не загрузится.

### Тестовое покрытие

#### 2.17-2.22 Шесть новых плагинов без тестов
- IntegratorPlugin
- GoertzelFilterPlugin
- PhaseDetectorPlugin
- FrequencyDetectorPlugin
- HilbertTransformerPlugin
- SlidingFFTPlugin

#### 2.23-2.26 Другие непокрытые плагины
- RefSineGeneratorPlugin, RefCosineGeneratorPlugin
- SpectrumAnalyzerPlugin, WaterfallPlugin

---

## 3. MINOR

### DSP-движок

#### 3.1 WindowFunctions: деление на ноль при N=1
**Файл:** `src/engine/plugins/_shared/WindowFunctions.js:6-21`

#### 3.2 WindowFunctions.rectangular: несогласованная сигнатура
**Файл:** `src/engine/plugins/_shared/WindowFunctions.js:5`
`() => 1` вместо `(n, N) => 1`.

#### 3.3 GraphCompiler: нет проверки orphaned nodes
**Файл:** `src/engine/GraphCompiler.js:95-106`

#### 3.4 computeMagnitudeDB: нет защиты от нечётной длины и пустого входа
**Файл:** `src/engine/plugins/_shared/FFTUtils.js:49-63`

#### 3.5 SineGenerator/CosineGenerator: при высоких частотах фаза может прыгнуть > 2pi
**Файлы:** `src/engine/plugins/generators/SineGeneratorPlugin.js:34`, `CosineGeneratorPlugin.js:34`
Простое вычитание 2pi недостаточно. Нужен modulo.

#### 3.6 SpectrumAnalyzerPlugin и WaterfallPlugin: дублирование кода
**Файлы:** `src/engine/plugins/analysis/SpectrumAnalyzerPlugin.js`, `src/engine/plugins/visualization/WaterfallPlugin.js`

#### 3.7 RefSine/RefCosineGenerator: параметр controllable не используется
**Файлы:** `src/engine/plugins/generators/Ref*GeneratorPlugin.js:12`

#### 3.8 ConstellationPlugin/OscilloscopePlugin: параметры не используются в process()
**Файлы:** `src/engine/plugins/visualization/ConstellationPlugin.js`, `OscilloscopePlugin.js`

### Фронтенд

#### 3.9 Console.log в production-коде
**Файл:** `src/components/dialogs/SaveDialog/SaveDialog.jsx:39-52`

#### 3.10 ConfirmDialog: неполные PropTypes
**Файл:** `src/components/dialogs/ConfirmDialog/ConfirmDialog.jsx:34-41`

#### 3.11 validationService: имена не допускают точки
**Файл:** `src/services/validationService.js:18`

#### 3.12 App.jsx: нет проверки reactFlowInstance перед вызовом
**Файл:** `src/App.jsx:89-107`

#### 3.13 BlockNode: нет aria-label для кнопок-иконок
**Файл:** `src/components/dsp/BlockNode/BlockNode.jsx:82-106`

#### 3.14 BlockParamsDialog: зависимость useEffect не полная
**Файл:** `src/components/dialogs/BlockParamsDialog/BlockParamsDialog.jsx:20-31`
`[nodeId]` не учитывает изменения `node.data.params`.

#### 3.15 StorageService.getStorageSize: итерация по всем ключам
**Файл:** `src/services/storageService.js:164-168`

#### 3.16 ValidationService: не проверяется NaN/Infinity в position
**Файл:** `src/services/validationService.js:59-72`

### Тесты

#### 3.17 generators.test.js: допуски 0.501/0.701 слишком жёсткие
**Файл:** `tests/plugins/generators.test.js:19,65`

#### 3.18 filters.test.js: DC tolerance 1 знак слишком большой
**Файл:** `tests/plugins/filters.test.js:34`

#### 3.19 Vitest: нет конфигурации coverage в vite.config.js
**Файл:** `vite.config.js`

#### 3.20 Нет mock AudioContext для тестирования DSPProcessor
**Файл:** тесты отсутствуют

---

## 4. Покрытие тестами

### Текущее состояние: 59 тестов, 7 файлов

| Модуль | Покрытие |
|--------|----------|
| PluginRegistry | 20 тестов |
| SineGenerator, CosineGenerator | 8 тестов |
| FIRFilter | 5 тестов |
| FFTPlugin | 4 тестов |
| Summer, Multiplier | 5 тестов |
| WindowFunctions, FilterDesign, FFTUtils | 11 тестов |
| helpers (обратная совместимость) | 6 тестов |

### Без тестов

**Ядро:** GraphCompiler, DSPProcessor
**Новые плагины (6):** Integrator, Goertzel, PhaseDetector, FrequencyDetector, HilbertTransformer, SlidingFFT
**Другие плагины (12):** RefSine, RefCosine, AudioFile, LowpassFIR, HighpassFIR, BandpassFIR, SpectrumAnalyzer, Waterfall, Speaker, Oscilloscope, Constellation, SlidingFFT

**Покрытие плагинов:** 5 из 26 (19%)

---

## 5. Прогресс по сравнению с предыдущим ревью

| Метрика | Было | Стало |
|---------|------|-------|
| Critical | 8 | **2** (только тесты) |
| Major | 22 | 20 |
| Minor | 16 | 20 |
| Все баги в коде critical | 8 | **0** |
