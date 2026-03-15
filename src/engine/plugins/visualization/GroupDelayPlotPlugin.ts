/**
 * Group Delay Plot — Групповая задержка
 *
 * Назначение:
 *   Вычисляет и визуализирует групповую задержку входного сигнала.
 *   Групповая задержка определяется как отрицательная производная фазы
 *   по частоте: tau(f) = -d(phi)/d(omega).
 *
 * Алгоритм:
 *   1. Выполняет FFT входного сигнала
 *   2. Вычисляет фазу: phi[k] = atan2(imag[k], real[k])
 *   3. Разворачивает фазу (phase unwrapping): если разность между
 *      соседними бинами превышает PI, корректирует на ±2*PI
 *   4. Вычисляет групповую задержку конечной разностью:
 *      tau[k] = -(phi[k] - phi[k-1]) / (2*PI/N)
 *
 * Параметры:
 *   - fftSize (int, по умолчанию 1024) — размер FFT
 *
 * Вход:  real (Float32Array)
 * Выход: null (визуализация — график групповой задержки)
 *
 * Возвращает объект:
 *   - frequencies: массив частот в Гц для каждого бина
 *   - delays: массив значений групповой задержки в отсчётах
 *   - maxDelay: максимальное значение задержки
 *   - minDelay: минимальное значение задержки
 */

import { fft } from '../_shared/FFTUtils';
import type { PluginDefinition } from '../../types';

export default {
    type: 'Групповая задержка',
    id: 'group-delay-plot',
    icon: 'dsp-group-delay',
    description: 'Вычисление и визуализация групповой задержки',
    group: 'visualization',
    signals: { input: 'real', output: null } as const,
    defaultParams: { fftSize: 1024 },
    processor: {
        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number) {
            const input = inputs[0];
            if (!input) {
                return { frequencies: [], delays: [], maxDelay: 0, minDelay: 0 };
            }

            const fftSize = (params.fftSize as number) ?? 1024;
            const sampleRate = (params.sampleRate as number) ?? 48000;

            // Pad or truncate input to fftSize
            const real = new Float32Array(fftSize);
            const imag = new Float32Array(fftSize);
            const copyLen = Math.min(chunkSize, fftSize);
            for (let i = 0; i < copyLen; i++) {
                real[i] = input[i];
            }

            fft(real, imag);

            // Compute phase for each bin
            const halfN = fftSize >>> 1;
            const phase = new Float32Array(halfN);
            for (let k = 0; k < halfN; k++) {
                phase[k] = Math.atan2(imag[k], real[k]);
            }

            // Phase unwrapping
            for (let k = 1; k < halfN; k++) {
                let diff = phase[k] - phase[k - 1];
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                phase[k] = phase[k - 1] + diff;
            }

            // Group delay: tau[k] = -(phi[k] - phi[k-1]) / (2*PI/N)
            // The frequency step between bins is 2*PI/N in normalized angular frequency
            const omegaStep = (2 * Math.PI) / fftSize;
            const freqPerBin = sampleRate / fftSize;

            const frequencies: number[] = [];
            const delays: number[] = [];
            let maxDelay = -Infinity;
            let minDelay = Infinity;

            for (let k = 1; k < halfN; k++) {
                const tau = -(phase[k] - phase[k - 1]) / omegaStep;
                frequencies.push(k * freqPerBin);
                delays.push(tau);
                if (tau > maxDelay) maxDelay = tau;
                if (tau < minDelay) minDelay = tau;
            }

            // Handle edge case of empty results
            if (delays.length === 0) {
                return { frequencies: [], delays: [], maxDelay: 0, minDelay: 0 };
            }

            return { frequencies, delays, maxDelay, minDelay };
        }
    }
} satisfies PluginDefinition;
