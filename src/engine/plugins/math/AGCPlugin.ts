/**
 * АРУ (AGC — Automatic Gain Control) — Автоматическая регулировка усиления
 *
 * Назначение:
 *   Поддерживает постоянный уровень выходного сигнала независимо от
 *   изменений входного уровня. АРУ широко применяется в радиоприёмниках,
 *   аудиосистемах и телекоммуникациях, где уровень входного сигнала может
 *   варьироваться на десятки децибел. Блок измеряет мгновенную огибающую
 *   сигнала и автоматически подстраивает коэффициент усиления, чтобы
 *   среднеквадратичный уровень выхода оставался близким к целевому.
 *
 * Алгоритм:
 *   1. Вычисляется огибающая входного сигнала методом экспоненциального
 *      сглаживания: env += coeff · (|x[n]| - env).
 *   2. Коэффициент сглаживания выбирается по принципу attack/release:
 *      если |x| > env → используется attackCoeff (быстрая реакция на возрастание),
 *      иначе → releaseCoeff (медленное затухание).
 *   3. Усиление: gain = min(targetLevel / env, maxGain).
 *   4. Выход: y[n] = x[n] · gain.
 *
 * Параметры:
 *   - targetLevel (float, по умолчанию 1.0) — целевой уровень выходного сигнала.
 *     Диапазон: 0.01–10. Обычно 1.0 (нормализованный уровень).
 *   - attackTime (float, мс, по умолчанию 5) — время атаки. Определяет скорость
 *     реакции на увеличение уровня сигнала. Меньшие значения → быстрее реагирует
 *     на всплески, но возможны искажения. Диапазон: 0.1–100 мс.
 *   - releaseTime (float, мс, по умолчанию 50) — время восстановления. Определяет,
 *     как быстро усиление возрастает при уменьшении уровня. Большие значения
 *     обеспечивают плавность, но медленнее адаптируются. Диапазон: 1–1000 мс.
 *   - maxGain (float, по умолчанию 100) — максимально допустимое усиление.
 *     Ограничивает усиление тихих участков (например, пауз/тишины),
 *     предотвращая усиление шума. Диапазон: 1–10000.
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array)
 *
 * Примеры использования:
 *
 *   1. Нормализация громкости аудио:
 *      AudioFile → AGC(target: 1.0, attack: 5мс, release: 50мс) → Oscilloscope
 *      Тихие участки усиливаются, громкие ослабляются — выход стабилен.
 *
 *   2. Стабилизация уровня в приёмнике:
 *      Антенна → Фильтр → AGC(target: 0.5, maxGain: 1000) → Демодулятор
 *      Компенсирует замирания (fading) сигнала в радиоканале.
 *
 *   3. Компрессор динамического диапазона:
 *      AudioFile → AGC(attack: 1мс, release: 100мс) → Speaker
 *      Быстрая атака ограничивает пики, медленный release сохраняет
 *      естественность звучания.
 */

interface AGCState {
    gain: number;
    envelope: number;
}

export default {
    type: 'АРУ',
    id: 'agc',
    icon: 'dsp-agc',
    description: 'Автоматическая регулировка усиления (АРУ)',
    group: 'math-blocks',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        targetLevel: 1.0,
        attackTime: 5,
        releaseTime: 50,
        maxGain: 100,
    },
    processor: {
        states: new Map<string, AGCState>(),
        clearStates() { this.states.clear(); },

        process(inputs: Float32Array[], params: Record<string, unknown>, chunkSize: number, nodeId?: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            const targetLevel = (params.targetLevel ?? 1.0) as number;
            const attackMs = (params.attackTime ?? 5) as number;
            const releaseMs = (params.releaseTime ?? 50) as number;
            const maxGain = (params.maxGain ?? 100) as number;
            const sampleRate = (params.sampleRate ?? 48000) as number;

            if (!this.states.has(nodeId!)) {
                this.states.set(nodeId!, { gain: 1.0, envelope: 0 });
            }
            const state = this.states.get(nodeId!)!;

            // Коэффициенты сглаживания огибающей
            const attackCoeff = attackMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * attackMs * 0.001))
                : 1;
            const releaseCoeff = releaseMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * releaseMs * 0.001))
                : 1;

            const output = new Float32Array(chunkSize);
            let env = state.envelope;
            let gain = state.gain;

            for (let i = 0; i < chunkSize; i++) {
                const sample = i < input.length ? input[i] : 0;
                const absSample = Math.abs(sample);

                // Оценка огибающей (attack/release)
                const coeff = absSample > env ? attackCoeff : releaseCoeff;
                env += coeff * (absSample - env);

                // Вычисление усиления
                if (env > 1e-10) {
                    const desiredGain = targetLevel / env;
                    gain = Math.min(desiredGain, maxGain);
                }

                output[i] = sample * gain;
            }

            state.envelope = env;
            state.gain = gain;
            return output;
        }
    }
};
