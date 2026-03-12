/**
 * Амплитудный детектор — Детектор огибающей с атакой и восстановлением
 *
 * Назначение:
 *   Выделяет огибающую (envelope) амплитуды входного сигнала. Огибающая — это
 *   плавная кривая, описывающая изменение амплитуды сигнала во времени.
 *   Например, для звука гитарной струны огибающая покажет быстрый удар (атаку)
 *   и медленное затухание. Этот блок работает аналогично детектору уровня
 *   в аналоговых компрессорах и лимитерах.
 *
 * Алгоритм:
 *   Используется экспоненциальное сглаживание с раздельными постоянными времени
 *   для нарастания (атаки) и спада (восстановления):
 *
 *     если |x[n]| > env[n-1]:
 *       env[n] = env[n-1] + αₐ · (|x[n]| − env[n-1])   // атака (быстро)
 *     иначе:
 *       env[n] = env[n-1] + αᵣ · (|x[n]| − env[n-1])   // восстановление (медленно)
 *
 *   где коэффициенты сглаживания:
 *     αₐ = 1 − exp(−1 / (sampleRate · attackTime_сек))
 *     αᵣ = 1 − exp(−1 / (sampleRate · releaseTime_сек))
 *
 *   Быстрая атака позволяет мгновенно отслеживать пики сигнала, а медленное
 *   восстановление обеспечивает плавный спад огибающей без «дребезга».
 *
 * Параметры:
 *   - attackTime (float, по умолчанию 1, мс) — время атаки (нарастания).
 *     Определяет, как быстро детектор реагирует на увеличение амплитуды.
 *     Малые значения (0.1–1 мс) → мгновенная реакция на пики.
 *     Большие значения (5–20 мс) → сглаженная реакция.
 *     Рекомендуемый диапазон: 0.01–50 мс.
 *   - releaseTime (float, по умолчанию 50, мс) — время восстановления (спада).
 *     Определяет, как быстро огибающая спадает после уменьшения амплитуды.
 *     Малые значения (10–30 мс) → огибающая быстро следует за сигналом.
 *     Большие значения (100–500 мс) → плавная, «ленивая» огибающая.
 *     Рекомендуемый диапазон: 1–1000 мс.
 *
 * Вход:  real (Float32Array) — любой действительный сигнал
 * Выход: real (Float32Array) — огибающая (неотрицательные значения)
 *
 * Примеры использования:
 *
 *   1. Визуализация огибающей аудиосигнала:
 *      AudioFile → AmplitudeDetector(attack=1, release=50) → Oscilloscope
 *      На осциллографе видна плавная огибающая поверх исходного сигнала,
 *      повторяющая форму громкости звука.
 *
 *   2. Детекция AM-модуляции:
 *      AMFMPMModulator(AM) → AmplitudeDetector(attack=0.1, release=10)
 *      → Oscilloscope
 *      Быстрый детектор огибающей восстанавливает модулирующий сигнал
 *      из AM-колебания (альтернатива AMFMPMDemodulator для простых случаев).
 *
 *   3. Измерение уровня сигнала:
 *      Sine(1000) → AmplitudeDetector(attack=5, release=200)
 *      → NumericIndicator
 *      Медленный детектор показывает средний уровень сигнала на индикаторе.
 */
import type { PluginDefinition } from '../../types';

interface AmplitudeDetectorState {
    envelope: number;
}

const AmplitudeDetectorPlugin = {
    type: 'Амплитудный детектор',
    id: 'amplitude-detector',
    icon: 'dsp-amp-detect',
    description: 'Детектор огибающей амплитуды',
    group: 'detectors',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {
        attackTime: 1,
        releaseTime: 50,
    },
    processor: {
        states: new Map<string, AmplitudeDetectorState>(),
        clearStates() { this.states.clear(); },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const input = inputs[0];
            if (!input) return new Float32Array(chunkSize);

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { envelope: 0 });
            }
            const state = this.states.get(nodeId)!;

            const sampleRate = (params.sampleRate ?? 48000) as number;
            const attackMs = (params.attackTime ?? 1) as number;
            const releaseMs = (params.releaseTime ?? 50) as number;

            // Коэффициенты экспоненциального сглаживания
            const attackCoeff = attackMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * attackMs * 0.001))
                : 1;
            const releaseCoeff = releaseMs > 0
                ? 1 - Math.exp(-1 / (sampleRate * releaseMs * 0.001))
                : 1;

            const output = new Float32Array(chunkSize);
            let env = state.envelope;

            for (let i = 0; i < chunkSize; i++) {
                const abs = Math.abs(i < input.length ? input[i] : 0);
                const coeff = abs > env ? attackCoeff : releaseCoeff;
                env += coeff * (abs - env);
                output[i] = env;
            }

            state.envelope = env;
            return output;
        }
    }
};

export default AmplitudeDetectorPlugin satisfies PluginDefinition;
