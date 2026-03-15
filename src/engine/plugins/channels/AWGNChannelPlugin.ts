/**
 * AWGN Channel — Аддитивный белый гауссов шум
 *
 * Назначение:
 *   Моделирует канал связи с аддитивным белым гауссовым шумом (AWGN).
 *   Добавляет гауссов шум с заданным отношением сигнал/шум (SNR).
 *   Основной блок для моделирования каналов связи и оценки помехоустойчивости.
 *
 * Алгоритм:
 *   1. Вычисление мощности входного сигнала: P_signal = (1/N) Σ x²[n]
 *   2. Вычисление требуемой мощности шума: P_noise = P_signal / 10^(SNR/10)
 *   3. Генерация гауссова шума (Box-Muller): z = √(-2·ln(u₁)) · cos(2π·u₂)
 *   4. Масштабирование шума: noise = z · √P_noise
 *   5. Выход: y[n] = x[n] + noise[n]
 *
 * Параметры:
 *   - snr (float, по умолчанию 20) — отношение сигнал/шум в дБ.
 *     Типичные значения: 0 дБ (сильный шум), 10 дБ (умеренный), 20+ дБ (слабый шум).
 *
 * Вход:  real (Float32Array)
 * Выход: real (Float32Array)
 */

import type { PluginDefinition } from '../../types';

/** Генерация гауссовой случайной величины (Box-Muller) */
function gaussianRandom(): number {
    let u1 = Math.random();
    const u2 = Math.random();
    // Защита от log(0)
    while (u1 === 0) u1 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

export default {
    type: 'AWGN-канал',
    id: 'awgn-channel',
    icon: 'dsp-awgn',
    description: 'Аддитивный белый гауссов шум (AWGN)',
    group: 'channels',
    signals: { input: 'real', output: 'real' } as const,
    defaultParams: {
        snr: 20,
    },
    processor: {
        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number): Float32Array {
            const output = new Float32Array(chunkSize);
            const input = inputs[0];
            const snrDb = (params.snr ?? 20) as number;

            if (!input) return output;

            // Вычисление мощности сигнала
            let signalPower = 0;
            for (let i = 0; i < chunkSize; i++) {
                signalPower += input[i] * input[i];
            }
            signalPower /= chunkSize;

            // Защита от тишины
            if (signalPower < 1e-20) {
                for (let i = 0; i < chunkSize; i++) output[i] = input[i];
                return output;
            }

            // Мощность шума из SNR
            const noisePower = signalPower / Math.pow(10, snrDb / 10);
            const noiseStd = Math.sqrt(noisePower);

            // Добавление гауссова шума
            for (let i = 0; i < chunkSize; i++) {
                output[i] = input[i] + noiseStd * gaussianRandom();
            }

            return output;
        }
    }
} satisfies PluginDefinition;
