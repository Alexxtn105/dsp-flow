/**
 * Pole-Zero Diagram — Диаграмма полюсов и нулей
 *
 * Назначение:
 *   Параметрический блок визуализации (без входного сигнала).
 *   Вычисляет полюса и нули передаточной функции H(z) = B(z)/A(z)
 *   по заданным коэффициентам числителя и знаменателя.
 *
 * Параметры:
 *   - numerator (string, по умолчанию '1,0,-1') — коэффициенты числителя B(z),
 *     через запятую
 *   - denominator (string, по умолчанию '1,-1.5,0.7') — коэффициенты
 *     знаменателя A(z), через запятую
 *
 * Вход:  null (параметрический блок)
 * Выход: null (визуализация — диаграмма полюсов и нулей)
 *
 * Возвращает объект:
 *   - poles: массив {re, im} — полюса передаточной функции
 *   - zeros: массив {re, im} — нули передаточной функции
 *   - stable: boolean — true если все полюса внутри единичной окружности
 *
 * Алгоритм нахождения корней:
 *   - Степень <= 2: квадратичная формула
 *   - Степень >= 3: метод Дюрана-Кернера (итеративный)
 */

import type { PluginDefinition } from '../../types';

interface ComplexRoot {
    re: number;
    im: number;
}

/**
 * Парсит строку коэффициентов, разделённых запятыми, в массив чисел.
 */
function parseCoeffs(str: string): number[] {
    return str.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
}

/**
 * Находит корни полинома степени 1 (линейное уравнение ax + b = 0).
 */
function solveLinear(coeffs: number[]): ComplexRoot[] {
    // coeffs[0]*z + coeffs[1] = 0
    if (coeffs[0] === 0) return [];
    return [{ re: -coeffs[1] / coeffs[0], im: 0 }];
}

/**
 * Находит корни полинома степени 2 (квадратное уравнение) через дискриминант.
 */
function solveQuadratic(coeffs: number[]): ComplexRoot[] {
    const a = coeffs[0];
    const b = coeffs[1];
    const c = coeffs[2];
    if (a === 0) return solveLinear([b, c]);

    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
        const sqrtDisc = Math.sqrt(disc);
        return [
            { re: (-b + sqrtDisc) / (2 * a), im: 0 },
            { re: (-b - sqrtDisc) / (2 * a), im: 0 },
        ];
    } else {
        const sqrtDisc = Math.sqrt(-disc);
        return [
            { re: -b / (2 * a), im: sqrtDisc / (2 * a) },
            { re: -b / (2 * a), im: -sqrtDisc / (2 * a) },
        ];
    }
}

/**
 * Метод Дюрана-Кернера для нахождения всех корней полинома произвольной степени.
 *
 * Инициализирует корни на единичной окружности с малым смещением,
 * затем итеративно уточняет до сходимости.
 *
 * @param coeffs - коэффициенты полинома [a_n, a_{n-1}, ..., a_1, a_0]
 * @returns массив комплексных корней
 */
function durandKerner(coeffs: number[]): ComplexRoot[] {
    const n = coeffs.length - 1; // degree
    if (n <= 0) return [];

    // Normalize so leading coefficient is 1
    const lead = coeffs[0];
    const norm = coeffs.map(c => c / lead);

    // Initialize roots on unit circle with slight offset
    const roots: Array<{ re: number; im: number }> = [];
    for (let k = 0; k < n; k++) {
        const angle = (2 * Math.PI * k) / n + 0.4;
        roots.push({
            re: 0.9 * Math.cos(angle),
            im: 0.9 * Math.sin(angle),
        });
    }

    const maxIter = 1000;
    const tol = 1e-12;

    for (let iter = 0; iter < maxIter; iter++) {
        let maxDelta = 0;

        for (let i = 0; i < n; i++) {
            // Evaluate polynomial at roots[i]
            let pRe = 1;
            let pIm = 0;
            // Horner's method: p(z) = ((z*a_0 + a_1)*z + a_2)*z + ...
            // With normalized coefficients (leading = 1)
            pRe = norm[0];
            pIm = 0;
            for (let j = 1; j <= n; j++) {
                // (pRe + i*pIm) * (zRe + i*zIm) + norm[j]
                const newRe = pRe * roots[i].re - pIm * roots[i].im + norm[j];
                const newIm = pRe * roots[i].im + pIm * roots[i].re;
                pRe = newRe;
                pIm = newIm;
            }

            // Compute denominator: product of (roots[i] - roots[j]) for j != i
            let dRe = 1;
            let dIm = 0;
            for (let j = 0; j < n; j++) {
                if (j === i) continue;
                const diffRe = roots[i].re - roots[j].re;
                const diffIm = roots[i].im - roots[j].im;
                const newDRe = dRe * diffRe - dIm * diffIm;
                const newDIm = dRe * diffIm + dIm * diffRe;
                dRe = newDRe;
                dIm = newDIm;
            }

            // delta = p(z_i) / product
            const denom = dRe * dRe + dIm * dIm;
            if (denom < 1e-30) continue;

            const deltaRe = (pRe * dRe + pIm * dIm) / denom;
            const deltaIm = (pIm * dRe - pRe * dIm) / denom;

            roots[i].re -= deltaRe;
            roots[i].im -= deltaIm;

            const delta = Math.sqrt(deltaRe * deltaRe + deltaIm * deltaIm);
            if (delta > maxDelta) maxDelta = delta;
        }

        if (maxDelta < tol) break;
    }

    return roots.map(r => ({
        re: Math.abs(r.re) < 1e-10 ? 0 : r.re,
        im: Math.abs(r.im) < 1e-10 ? 0 : r.im,
    }));
}

/**
 * Находит корни полинома заданного коэффициентами.
 * Для степени <= 2 использует аналитические формулы,
 * для степени >= 3 — метод Дюрана-Кернера.
 */
function findRoots(coeffs: number[]): ComplexRoot[] {
    if (coeffs.length <= 1) return [];
    const degree = coeffs.length - 1;

    if (degree === 1) return solveLinear(coeffs);
    if (degree === 2) return solveQuadratic(coeffs);
    return durandKerner(coeffs);
}

export default {
    type: 'Полюса и нули',
    id: 'pole-zero-diagram',
    icon: 'dsp-pole-zero',
    description: 'Диаграмма полюсов и нулей передаточной функции',
    group: 'visualization',
    signals: { input: null, output: null } as const,
    defaultParams: {
        numerator: '1,0,-1',
        denominator: '1,-1.5,0.7',
    },
    processor: {
        process(_inputs: (Float32Array | null)[], params: Record<string, unknown>) {
            const numStr = (params.numerator as string) ?? '1,0,-1';
            const denStr = (params.denominator as string) ?? '1,-1.5,0.7';

            const numCoeffs = parseCoeffs(numStr);
            const denCoeffs = parseCoeffs(denStr);

            const zeros = findRoots(numCoeffs);
            const poles = findRoots(denCoeffs);

            // Stable if all poles are inside the unit circle
            const stable = poles.every(p => Math.sqrt(p.re * p.re + p.im * p.im) < 1.0);

            return { poles, zeros, stable };
        }
    }
} satisfies PluginDefinition;
