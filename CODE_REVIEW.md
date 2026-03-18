# Code Review: DSP Flow Editor

**Дата:** 2026-03-08 (ревизия 3), обновлено 2026-03-18
**Ветка:** `main`
**Тесты:** 389/389 passed | **Линтер:** 0 ошибок
**Версия:** 1.0.0
**Плагины:** 107 | **Язык кода:** JavaScript + TypeScript (миграция в процессе)

[English version](CODE_REVIEW.en.md)

---

## Общая оценка

Проект **хорошо структурирован** — 107 плагинов (17 генераторов, 3 канала, 22 фильтра, 16 детекторов, 28 math, 2 analysis, 3 audio, 15 visualization, 1 output), чистая архитектура (PluginRegistry → GraphCompiler → DSPProcessor), 389 тестов в 28 файлах, i18n на двух языках, грамотная React-обвязка. Ниже — найденные проблемы по приоритету.

---

## Критические проблемы

### 1. Несоответствие типов сигналов FFT-плагинов

FFTPlugin, SlidingFFTPlugin, SpectrumAnalyzerPlugin декларируют `output: 'complex'`, но возвращают **real-valued magnitude** (Float32Array половинного размера). Если подключить их выход к ComplexMultiplier — будет молча ломаться.

### 2. FIR Filter — buffer overflow при смене порядка фильтра

`FIRFilterPlugin.ts:77-80` — при изменении order, `oldPointer` от старого буфера применяется к новому без проверки границ. Может вызвать index out of bounds.

### 3. Integrator — defaultParams не совпадают с кодом

`defaultParams: { resetOnOverflow: false }`, но в `process()`: `params.resetOnOverflow ?? true`. Поведение по умолчанию противоречит заявленному.

---

## Высокий приоритет

### 4. Remez алгоритм — деление без проверки нуля

`FilterDesign.ts:178` — `const delta = num / den` без epsilon guard. Может дать NaN при вырожденных входах.

### 5. Состояние плагинов не очищается при rewind

`DSPProcessor.rewind()` очищает `blockStates`, но **не** вызывает `clearStates()` на процессорах плагинов. Фильтры и интеграторы сохраняют старое состояние после перемотки.

### 6. Отсутствует валидация sampleRate

Множество плагинов используют `params.sampleRate ?? 48000` без проверки на положительность. Zero/negative sampleRate → NaN.

### 7. Дублирование phase unwrapping

Идентичный код phase unwrapping в FrequencyDetector и PhaseDetector — нужно вынести в `_shared/` утилиту.

### 8. NotchFIR — потеря состояния circular buffer при resize

`NotchFIRPlugin.ts:40` — при изменении размера буфера `pos` сбрасывается в 0, что вызывает щелчки/артефакты.

---

## Средний приоритет

### 9. Нет проверки NaN/Infinity в сигнальном тракте

Одно «плохое» значение распространяется по всему графу без предупреждения.

### 10. WAV-файл — проверка только расширения

`BlockParamsPopover.jsx` проверяет `.wav` по имени файла, но не MIME-тип.

### 11. VisualizationManager — лишние пересчёты

Зависимость `nodeIds = nodes.map(n => n.id).join(',')` пересоздаёт строку при каждом рендере — лучше мемоизировать.

### 12. Spread params на каждый чанк (hot path)

`DSPProcessor.js:364` — `{ ...block.params, sampleRate }` создаёт новый объект на каждый блок каждого чанка. Лучше кешировать при `initialize()`.

### 13. Multiplier — молчаливый ноль при делении на ноль

`MultiplierPlugin.ts:36` — возвращает 0 при делении на ноль, скрывая ошибки в сигнале.

### 14. DSPProcessor — неоднозначный приоритет режимов

`manualMode` перекрывает `fileMode`, но `step()` может вызываться и в контексте файлового режима. Нечёткая модель состояний.

---

## Низкий приоритет

### 15. Canvas `roundRect()` — нет fallback

Относительно новый Canvas API, может не работать в старых браузерах.

### 16. Мёртвый CSS-код

Закомментированная старая тёмная тема в `variables.css` — можно удалить.

### 17. Hardcoded цвета в edge-компонентах

`#3b82f6`, `#8b5cf6` не используют CSS-переменные.

### 18. Goertzel — Math.round вместо floor для bin

`GoertzelFilterPlugin.ts` — `Math.round` может привести к bin за пределами спектра.

### 19. FFTUtils — нет защиты от underflow в dB

`computeMagnitudeDB()` может давать -Infinity при нулевых значениях.

---

## Что сделано хорошо

- **ErrorBoundary** — грамотно размещён вокруг DSPEditor, диалогов и визуализации
- **Управление памятью** — корректные cleanup в useEffect, AbortController в useAutoSave, RAF-батчинг progress
- **Canvas рендеринг** — DPR-масштабирование, off-screen buffer в Waterfall, pan/zoom в Spectrum
- **Accessibility** — role/aria атрибуты, фокус-трап в диалогах, keyboard навигация
- **Паттерн stableCallbacks** в DSPEditor предотвращает лишние ре-рендеры BlockNode
- **PluginRegistry.freeze()** — защита от мутации после инициализации
- **Топологическая сортировка** (Кан) и детекция циклов в GraphCompiler
- **389 тестов** покрывают engine, плагины и интеграцию
- **ProcessorState enum** вместо boolean-флагов
- **Рефакторенный App.jsx** — бизнес-логика в кастомных хуках (useDialogManager, useDSPSimulation)
- **FFT (Cooley-Tukey)**, фильтры (windowed sinc + Remez), оконные функции — математически корректны
- **IndexedDB** для персистентности аудиофайлов между сессиями
- **107 плагинов** по 10 категориям — полноценный DSP-тулкит
- **i18n** — полная локализация на English и Русский через i18next
- **TypeScript-миграция** ядра и плагинов в процессе
- **Интерактивная справка** для всех 46+ плагинов

---

## Рекомендации

### Краткосрочные (критические + высокий приоритет)

1. **Исправить тип выхода FFT-плагинов** — сменить `output` на `'real'` либо возвращать interleaved complex
2. **Добавить bounds check** при смене порядка FIR-фильтра
3. **Синхронизировать defaultParams** с runtime-логикой в Integrator
4. **Добавить `clearStates()`** при rewind в DSPProcessor
5. **Добавить epsilon guard** в Remez: `Math.abs(den) > 1e-12 ? num / den : prevDelta`
6. **Валидировать sampleRate** на входе DSPProcessor (> 0)
7. **Вынести phase unwrapping** в `_shared/` утилиту

### Среднесрочные

8. Кешировать `paramsWithSampleRate` при `initialize()` вместо spread на каждый чанк
9. Добавить NaN-guard хотя бы на выходе генераторов и фильтров
10. Добавить MIME-type проверку WAV-файлов
11. Мемоизировать `nodeIds` в VisualizationManager
12. Добавить тесты для storageService, validationService, граничных случаев (NaN, Infinity)

### Долгосрочные

13. Завершить TypeScript-миграцию
14. AudioWorklet / Web Worker для разгрузки main thread
15. E2E-тесты (Playwright)
16. Pre-commit hooks (husky + lint-staged)
17. Coverage reporting в CI
