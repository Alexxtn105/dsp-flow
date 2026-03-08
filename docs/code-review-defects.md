# Дефекты из Code Review (2026-03-08)

Источник: `CODE_REVIEW.md` в корне репозитория.

## Открытые дефекты (9)

### Критические / Высокий приоритет
| # | Дефект | Файл | Суть |
|---|--------|------|------|
| 2 | FIR buffer overflow | FIRFilterPlugin.js:77-80 | oldPointer от старого буфера без bounds check при смене order |
| 3 | Integrator defaultParams | IntegratorPlugin.js:9,27 | `resetOnOverflow: false` в defaults, но `?? true` в process() |
| 6 | sampleRate без валидации | Множество плагинов | `params.sampleRate ?? 48000` без проверки > 0 |
| 7 | Дублирование phase unwrapping | FrequencyDetectorPlugin, PhaseDetectorPlugin | Идентичный код, нужно вынести в `_shared/` |

### Средний приоритет
| # | Дефект | Файл | Суть |
|---|--------|------|------|
| 9 | Нет NaN/Infinity guard | Сигнальный тракт | Плохое значение распространяется по всему графу |
| 10 | WAV — только проверка расширения | BlockParamsPopover.jsx | Нет MIME-type проверки |
| 11 | VisualizationManager пересчёты | VisualizationManager | `nodeIds` не мемоизирован, пересоздаётся каждый рендер |
| 12 | Spread params на hot path | DSPProcessor.js:144,420 | `{ ...block.params, sampleRate }` на каждый чанк, нужно кешировать |

### Низкий приоритет
| # | Дефект | Файл | Суть |
|---|--------|------|------|
| 15 | Canvas roundRect без fallback | BlockNode | Может не работать в старых браузерах |
| 17 | Hardcoded цвета | RealSignalEdge, Header | `#3b82f6` вместо CSS-переменных |
| 18 | Goertzel Math.round | GoertzelFilterPlugin.js:29 | Math.round может дать bin за пределами спектра |

## Исправленные дефекты (8)

| # | Дефект | Статус |
|---|--------|--------|
| 1 | FFT output type | Исправлено — SpectrumAnalyzer корректно возвращает `output: null` |
| 4 | Remez деление на ноль | Требует перепроверки |
| 5 | rewind не вызывает clearStates | Исправлено — `registry.clearAllStates()` вызывается |
| 8 | NotchFIR buffer resize | Исправлено — проверка размеров при пересоздании |
| 13 | Multiplier деление на ноль | По дизайну — возврат 0 |
| 16 | Мёртвый CSS | Всё ещё присутствует (закомментирован) |
| 19 | FFTUtils dB underflow | Исправлено — проверка `mag > 0`, MIN_DB = -120 |
