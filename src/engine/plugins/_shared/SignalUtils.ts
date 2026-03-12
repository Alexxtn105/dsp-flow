/**
 * Утилиты обработки сигналов общего назначения.
 */

/**
 * Phase unwrapping — нормализация разности фаз в диапазон [-π, π].
 * @param {number} delta - разность фаз (радианы)
 * @returns {number} нормализованная разность фаз
 */
export function unwrapPhaseDelta(delta: number): number {
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    return delta;
}
