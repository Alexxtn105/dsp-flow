/**
 * PID Controller — ПИД-регулятор
 *
 * Назначение:
 *   Пропорционально-интегрально-дифференциальный регулятор.
 *   Классический алгоритм управления с обратной связью.
 *   Используется в PLL, АРУ и других контурах управления в DSP.
 *
 * Алгоритм (дискретный Euler):
 *   P[n] = Kp · e[n]
 *   I[n] = I[n-1] + Ki · e[n] · Ts     (с anti-windup)
 *   D[n] = Kd · (e[n] - e[n-1]) / Ts
 *   u[n] = P[n] + I[n] + D[n]
 *
 *   Anti-windup: если |u| > outputLimit, интегратор замораживается
 *   (conditional integration).
 *
 * Параметры:
 *   - kp (float) — пропорциональный коэффициент
 *   - ki (float) — интегральный коэффициент
 *   - kd (float) — дифференциальный коэффициент
 *   - outputLimit (float) — ограничение выхода (anti-windup)
 *
 * Вход:  real (сигнал ошибки e[n])
 * Выход: real (управляющий сигнал u[n])
 */

import type { PluginDefinition } from '../../types';

interface PIDState {
    integral: number;
    prevError: number;
}

const PIDControllerPlugin = {
    type: 'ПИД-регулятор',
    id: 'pid-controller',
    icon: 'dsp-pid',
    description: 'ПИД-регулятор с anti-windup',
    group: 'filters',

    signals: {
        input: 'real',
        output: 'real'
    } as const,

    defaultParams: {
        kp: 1.0,
        ki: 0.1,
        kd: 0.01,
        outputLimit: 10.0,
    },

    processor: {
        states: new Map<string, PIDState>(),

        clearStates() {
            this.states.clear();
        },

        process(inputs: (Float32Array | null)[], params: Record<string, unknown>, chunkSize: number, nodeId: string): Float32Array {
            const output = new Float32Array(chunkSize);
            const input = inputs[0];
            if (!input) return output;

            const kp = (params.kp ?? 1.0) as number;
            const ki = (params.ki ?? 0.1) as number;
            const kd = (params.kd ?? 0.01) as number;
            const limit = (params.outputLimit ?? 10.0) as number;
            const sampleRate = (params.sampleRate ?? 48000) as number;
            const Ts = 1 / sampleRate;

            if (!this.states.has(nodeId)) {
                this.states.set(nodeId, { integral: 0, prevError: 0 });
            }
            const state = this.states.get(nodeId)!;

            for (let i = 0; i < chunkSize; i++) {
                const e = input[i];

                // Proportional
                const P = kp * e;

                // Derivative
                const D = kd * (e - state.prevError) / Ts;

                // Compute output before integration update
                const uBeforeI = P + state.integral + D;

                // Anti-windup: only integrate if output is within limits
                // or if integration would reduce the output
                if (Math.abs(uBeforeI) < limit || (e * state.integral < 0)) {
                    state.integral += ki * e * Ts;
                }

                const u = P + state.integral + D;

                // Clamp output
                output[i] = Math.max(-limit, Math.min(limit, u));

                state.prevError = e;
            }

            return output;
        }
    }
} satisfies PluginDefinition;

export default PIDControllerPlugin;
