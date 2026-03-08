# Дефекты из Code Review (2026-03-08)

Источник: `CODE_REVIEW.md` в корне репозитория.

## Открытые дефекты (0)

Все дефекты из ревью исправлены.

## Исправленные дефекты (19)

| # | Дефект | Статус |
|---|--------|--------|
| 1 | FFT output type | Исправлено — SpectrumAnalyzer корректно возвращает `output: null` |
| 2 | FIR buffer overflow | Исправлено — убрано переиспользование старого буфера/указателя при смене order |
| 3 | Integrator defaultParams | Исправлено — `defaultParams.resetOnOverflow` синхронизирован с `?? true` в process() |
| 4 | Remez деление на ноль | Требует перепроверки |
| 5 | rewind не вызывает clearStates | Исправлено — `registry.clearAllStates()` вызывается |
| 6 | sampleRate без валидации | Исправлено — `setSampleRate()` проверяет `rate > 0`, `start()` валидирует sampleRate |
| 7 | Дублирование phase unwrapping | Исправлено — вынесено в `_shared/SignalUtils.js: unwrapPhaseDelta()` |
| 8 | NotchFIR buffer resize | Исправлено — проверка размеров при пересоздании |
| 9 | NaN/Infinity guard | Исправлено — `isFinite()` guard на выходе каждого блока в processNextChunk() |
| 10 | WAV MIME-type проверка | Исправлено — проверка и расширения, и MIME-типа (audio/wav, audio/mpeg) |
| 11 | VisualizationManager nodeIds | Исправлено — обёрнуто в `useMemo()` |
| 12 | Spread params на hot path | Исправлено — cachedParams при initialize(), переиспользуется в executeBlock() |
| 13 | Multiplier деление на ноль | По дизайну — возврат 0 |
| 15 | Canvas roundRect fallback | Исправлено — fallback на `ctx.rect()` в 5 файлах визуализации |
| 16 | Мёртвый CSS | Всё ещё присутствует (закомментирован) |
| 17 | Hardcoded цвета | Исправлено — `var(--signal-real)` / `var(--signal-complex)` в RealSignalEdge и Header |
| 18 | Goertzel Math.round | Исправлено — заменено на `Math.floor` для гарантии bin в [0, N-1] |
| 19 | FFTUtils dB underflow | Исправлено — проверка `mag > 0`, MIN_DB = -120 |
