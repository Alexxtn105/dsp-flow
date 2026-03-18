# Code Review: DSP Flow Editor

**Date:** 2026-03-08 (revision 3), updated 2026-03-18
**Branch:** `main`
**Tests:** 389/389 passed | **Linter:** 0 errors
**Version:** 1.0.0
**Plugins:** 107 | **Code language:** JavaScript + TypeScript (migration in progress)

[Русская версия](CODE_REVIEW.md)

---

## Overall Assessment

The project is **well-structured** — 107 plugins (17 generators, 3 channels, 22 filters, 16 detectors, 28 math, 2 analysis, 3 audio, 15 visualization, 1 output), clean architecture (PluginRegistry → GraphCompiler → DSPProcessor), 389 tests in 28 files, i18n in two languages, solid React layer. Issues found below, sorted by priority.

---

## Critical Issues

### 1. Signal Type Mismatch in FFT Plugins

FFTPlugin, SlidingFFTPlugin, SpectrumAnalyzerPlugin declare `output: 'complex'` but return **real-valued magnitude** (half-size Float32Array). Connecting their output to ComplexMultiplier silently breaks.

### 2. FIR Filter — Buffer Overflow on Order Change

`FIRFilterPlugin.ts:77-80` — when order changes, `oldPointer` from the old buffer is applied to the new buffer without bounds checking. May cause index out of bounds.

### 3. Integrator — defaultParams Mismatch with Code

`defaultParams: { resetOnOverflow: false }`, but in `process()`: `params.resetOnOverflow ?? true`. Default behavior contradicts the declared value.

---

## High Priority

### 4. Remez Algorithm — Division Without Zero Check

`FilterDesign.ts:178` — `const delta = num / den` without epsilon guard. May produce NaN on degenerate inputs.

### 5. Plugin State Not Cleared on Rewind

`DSPProcessor.rewind()` clears `blockStates` but does **not** call `clearStates()` on plugin processors. Filters and integrators retain old state after rewind.

### 6. Missing sampleRate Validation

Many plugins use `params.sampleRate ?? 48000` without checking for positivity. Zero/negative sampleRate → NaN.

### 7. Duplicated Phase Unwrapping

Identical phase unwrapping code in FrequencyDetector and PhaseDetector — should be extracted to a `_shared/` utility.

### 8. NotchFIR — Circular Buffer State Loss on Resize

`NotchFIRPlugin.ts:40` — when buffer size changes, `pos` resets to 0, causing clicks/artifacts.

---

## Medium Priority

### 9. No NaN/Infinity Check in Signal Path

A single "bad" value propagates through the entire graph without warning.

### 10. WAV File — Extension-Only Validation

`BlockParamsPopover.jsx` checks `.wav` by filename only, not MIME type.

### 11. VisualizationManager — Unnecessary Recomputations

`nodeIds = nodes.map(n => n.id).join(',')` recreates the string on every render — should be memoized.

### 12. Spread Params on Every Chunk (Hot Path)

`DSPProcessor.js:364` — `{ ...block.params, sampleRate }` creates a new object per block per chunk. Better to cache at `initialize()`.

### 13. Multiplier — Silent Zero on Division by Zero

`MultiplierPlugin.ts:36` — returns 0 on division by zero, hiding signal errors.

### 14. DSPProcessor — Ambiguous Mode Priority

`manualMode` overrides `fileMode`, but `step()` can be called in file mode context too. Unclear state model.

---

## Low Priority

### 15. Canvas `roundRect()` — No Fallback

Relatively new Canvas API, may not work in older browsers.

### 16. Dead CSS Code

Commented-out old dark theme in `variables.css` — can be removed.

### 17. Hardcoded Colors in Edge Components

`#3b82f6`, `#8b5cf6` don't use CSS variables.

### 18. Goertzel — Math.round Instead of Floor for Bin

`GoertzelFilterPlugin.ts` — `Math.round` may result in an out-of-range bin.

### 19. FFTUtils — No dB Underflow Protection

`computeMagnitudeDB()` can produce -Infinity for zero values.

---

## What's Done Well

- **ErrorBoundary** — properly placed around DSPEditor, dialogs, and visualization
- **Memory management** — correct cleanup in useEffect, AbortController in useAutoSave, RAF-batched progress
- **Canvas rendering** — DPR scaling, off-screen buffer in Waterfall, pan/zoom in Spectrum
- **Accessibility** — role/aria attributes, focus trap in dialogs, keyboard navigation
- **stableCallbacks pattern** in DSPEditor prevents unnecessary BlockNode re-renders
- **PluginRegistry.freeze()** — mutation protection after initialization
- **Topological sort** (Kahn's) and cycle detection in GraphCompiler
- **389 tests** covering engine, plugins, and integration
- **ProcessorState enum** instead of boolean flags
- **Refactored App.jsx** — business logic in custom hooks (useDialogManager, useDSPSimulation)
- **FFT (Cooley-Tukey)**, filters (windowed sinc + Remez), window functions — mathematically correct
- **IndexedDB** for audio file persistence across sessions
- **107 plugins** across 10 categories — a full-featured DSP toolkit
- **i18n** — full localization in English and Russian via i18next
- **TypeScript migration** of core engine and plugins in progress
- **Interactive help** for all 46+ plugins

---

## Recommendations

### Short-term (Critical + High Priority)

1. **Fix FFT plugin output type** — change `output` to `'real'` or return interleaved complex
2. **Add bounds check** on FIR filter order change
3. **Sync defaultParams** with runtime logic in Integrator
4. **Add `clearStates()`** on rewind in DSPProcessor
5. **Add epsilon guard** in Remez: `Math.abs(den) > 1e-12 ? num / den : prevDelta`
6. **Validate sampleRate** at DSPProcessor input (> 0)
7. **Extract phase unwrapping** to `_shared/` utility

### Medium-term

8. Cache `paramsWithSampleRate` at `initialize()` instead of spreading per chunk
9. Add NaN guard at least on generator and filter outputs
10. Add MIME-type validation for WAV files
11. Memoize `nodeIds` in VisualizationManager
12. Add tests for storageService, validationService, edge cases (NaN, Infinity)

### Long-term

13. Complete TypeScript migration
14. AudioWorklet / Web Worker to offload main thread
15. E2E tests (Playwright)
16. Pre-commit hooks (husky + lint-staged)
17. Coverage reporting in CI
