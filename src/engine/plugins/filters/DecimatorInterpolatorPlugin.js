/**
 * Децимация/Интерполяция — изменение частоты дискретизации
 *
 * Назначение:
 *   Изменяет частоту дискретизации (sample rate) сигнала: уменьшает
 *   (децимация) или увеличивает (интерполяция) количество отсчётов.
 *   Это необходимо, когда разные части системы работают на разных
 *   частотах дискретизации, или когда нужно снизить вычислительную
 *   нагрузку, обрабатывая меньше отсчётов в секунду.
 *
 *   Децимация: уменьшение частоты дискретизации в factor раз (например,
 *   48000 Гц → 12000 Гц при factor=4). Перед прореживанием применяется
 *   антиалиасинговый ФНЧ, чтобы предотвратить наложение спектров.
 *
 *   Интерполяция: увеличение частоты дискретизации в factor раз. Между
 *   существующими отсчётами вставляются нули (zero-stuffing), затем
 *   применяется антиимиджинговый ФНЧ для сглаживания.
 *
 * Алгоритм:
 *   Децимация:
 *     1. Если filterEnabled — входной сигнал фильтруется ФНЧ с частотой
 *        среза Fs/(2*factor) для предотвращения алиасинга.
 *     2. Из отфильтрованного сигнала берётся каждый factor-й отсчёт.
 *
 *   Интерполяция:
 *     1. Между отсчётами вставляются (factor-1) нулей, амплитуда
 *        умножается на factor для компенсации усиления.
 *     2. Если filterEnabled — применяется ФНЧ с частотой среза
 *        Fs/(2*factor) для подавления образов спектра (imaging).
 *
 *   Внутренний ФНЧ реализован как sinc-фильтр с окном Хэмминга,
 *   длина фильтра адаптируется к коэффициенту децимации/интерполяции.
 *
 * Параметры:
 *   - mode (string, по умолчанию 'decimate') — режим работы:
 *     'decimate' — прореживание (уменьшение частоты дискретизации),
 *     'interpolate' — интерполяция (увеличение частоты дискретизации).
 *   - factor (int, по умолчанию 2) — коэффициент изменения частоты.
 *     При децимации: выходная частота = входная / factor.
 *     При интерполяции: выходная частота = входная * factor.
 *     Допустимый диапазон: 1–16.
 *   - filterEnabled (bool, по умолчанию true) — включить/выключить
 *     встроенный антиалиасинговый/антиимиджинговый фильтр. Отключение
 *     полезно, если сигнал уже отфильтрован внешним фильтром (например,
 *     более качественным LowpassFIR).
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array, размер = chunkSize)
 *
 * Примеры использования:
 *
 *   1. Снижение частоты дискретизации для экономии ресурсов:
 *      AudioFile(48kHz) → DecimatorInterpolator(decimate, factor=4) → SpectrumAnalyzer
 *      Сигнал прорежен до 12 кГц — спектр ограничен 6 кГц.
 *
 *   2. Повышение частоты перед ЦАП:
 *      Signal(12kHz) → DecimatorInterpolator(interpolate, factor=4) → Speaker
 *      Частота повышена до 48 кГц для вывода через звуковую карту.
 *
 *   3. Многоступенчатая децимация:
 *      Signal → DecimatorInterpolator(decimate, 4) → DecimatorInterpolator(decimate, 4)
 *      Двухступенчатая децимация в 16 раз — эффективнее, чем одноступенчатая
 *      с factor=16, так как промежуточный ФНЧ работает на меньшей частоте.
 */
export default {
    type: 'Децимация/Интерполяция',
    id: 'decimator-interpolator',
    icon: 'dsp-resample',
    description: 'Изменение частоты дискретизации (децимация и интерполяция)',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        mode: 'decimate',
        factor: 2,
        filterEnabled: true,
    },
    processor: {
        states: new Map(),
        clearStates() { this.states.clear(); },

        process(inputs, params, chunkSize, nodeId) {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const mode = params.mode ?? 'decimate';
            const factor = Math.max(1, Math.min(16, Math.round(params.factor ?? 2)));
            const filterEnabled = params.filterEnabled ?? true;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, {
                    filterState: new Float32Array(64),
                    remainder: new Float32Array(0),
                    phase: 0
                });
            }
            const state = this.states.get(nodeId);

            if (mode === 'decimate') {
                return this._decimate(input, factor, filterEnabled, state, chunkSize);
            } else {
                return this._interpolate(input, factor, filterEnabled, state, chunkSize);
            }
        },

        /**
         * Децимация: антиалиасинг фильтр + прореживание
         */
        _decimate(input, factor, filterEnabled, state, chunkSize) {
            let filtered = input;
            if (filterEnabled) {
                filtered = this._lowpassFilter(input, 1.0 / factor, state);
            }

            // Выбираем каждый factor-й сэмпл, результат дополняем до chunkSize
            const decimatedLen = Math.ceil(filtered.length / factor);
            const output = new Float32Array(chunkSize);

            for (let i = 0; i < decimatedLen && i < chunkSize; i++) {
                const srcIdx = i * factor;
                output[i] = srcIdx < filtered.length ? filtered[srcIdx] : 0;
            }

            return output;
        },

        /**
         * Интерполяция: вставка нулей + антиимиджинг фильтр
         */
        _interpolate(input, factor, filterEnabled, state, chunkSize) {
            // Вставка нулей
            const expandedLen = Math.min(input.length * factor, chunkSize * factor);
            const expanded = new Float32Array(expandedLen);

            for (let i = 0; i < input.length; i++) {
                const dstIdx = i * factor;
                if (dstIdx < expandedLen) {
                    expanded[dstIdx] = input[i] * factor; // компенсация усиления
                }
            }

            let filtered = expanded;
            if (filterEnabled) {
                filtered = this._lowpassFilter(expanded, 1.0 / factor, state);
            }

            // Обрезаем до chunkSize
            const output = new Float32Array(chunkSize);
            for (let i = 0; i < chunkSize && i < filtered.length; i++) {
                output[i] = filtered[i];
            }

            return output;
        },

        /**
         * Простой ФНЧ на основе скользящего среднего
         */
        _lowpassFilter(input, cutoffNorm, state) {
            // Длина фильтра пропорциональна 1/cutoff, но ограничена
            const filterLen = Math.min(63, Math.max(3, Math.round(1 / cutoffNorm) * 4)) | 1;
            const halfLen = (filterLen - 1) >> 1;

            // Генерация sinc-фильтра с окном Хэмминга
            const coeffs = new Float32Array(filterLen);
            let sum = 0;
            for (let n = 0; n < filterLen; n++) {
                const m = n - halfLen;
                if (m === 0) {
                    coeffs[n] = 2 * Math.PI * cutoffNorm;
                } else {
                    coeffs[n] = Math.sin(2 * Math.PI * cutoffNorm * m) / m;
                }
                // Окно Хэмминга
                coeffs[n] *= 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (filterLen - 1));
                sum += coeffs[n];
            }
            // Нормализация
            for (let n = 0; n < filterLen; n++) {
                coeffs[n] /= sum;
            }

            // Применение фильтра (прямая свёртка)
            const output = new Float32Array(input.length);
            for (let i = 0; i < input.length; i++) {
                let acc = 0;
                for (let j = 0; j < filterLen; j++) {
                    const idx = i - halfLen + j;
                    if (idx >= 0 && idx < input.length) {
                        acc += input[idx] * coeffs[j];
                    } else if (idx < 0 && idx + state.filterState.length >= 0) {
                        acc += state.filterState[state.filterState.length + idx] * coeffs[j];
                    }
                }
                output[i] = acc;
            }

            // Сохранение хвоста для следующего чанка
            const tailLen = Math.min(input.length, state.filterState.length);
            state.filterState.set(
                input.subarray(input.length - tailLen),
                state.filterState.length - tailLen
            );

            return output;
        }
    }
};
