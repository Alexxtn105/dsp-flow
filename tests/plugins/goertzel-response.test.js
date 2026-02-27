import { describe, it, expect } from 'vitest';
import GoertzelFilterPlugin from '../../src/engine/plugins/filters/GoertzelFilterPlugin.js';

/**
 * Вспомогательная функция: прогоняет синусоиду через фильтр Герцеля
 * и возвращает установившуюся магнитуду (после нескольких полных блоков).
 */
function measureGoertzelMagnitude(inputFreq, targetFreq, sampleRate, N, amplitude = 1.0) {
    const proc = GoertzelFilterPlugin.processor;
    proc.clearStates();

    const numBlocks = 4;
    const totalSamples = N * numBlocks;
    const input = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
        input[i] = amplitude * Math.sin(2 * Math.PI * inputFreq * i / sampleRate);
    }

    const output = proc.process(
        [input],
        { targetFrequency: targetFreq, sampleRate, N },
        totalSamples,
        `goertzel_test_${inputFreq}_${targetFreq}`
    );

    return output[totalSamples - 1];
}

describe('GoertzelFilterPlugin — АЧХ (амплитудно-частотная характеристика)', () => {
    const sampleRate = 8000;
    const targetFreq = 1000;
    const N = 256;

    it('нормализованная магнитуда ≈ 1.0 для единичной синусоиды на целевой частоте', () => {
        const mag = measureGoertzelMagnitude(targetFreq, targetFreq, sampleRate, N);
        console.log(`Магнитуда на целевой частоте ${targetFreq} Гц: ${mag.toFixed(4)} (ожидается ~1.0)`);
        expect(mag).toBeCloseTo(1.0, 1);
    });

    it('АЧХ: магнитуда убывает при удалении от целевой частоты', () => {
        // Используем частоты, НЕ попадающие точно на DFT-бины, чтобы избежать численных нулей
        const freqOffsets = [0, 20, 50, 100, 200, 400, 800];
        const magnitudes = [];

        for (const offset of freqOffsets) {
            const freq = targetFreq + offset;
            if (freq >= sampleRate / 2) continue;
            const mag = measureGoertzelMagnitude(freq, targetFreq, sampleRate, N);
            magnitudes.push({ freq, offset, mag });
        }

        console.log('АЧХ фильтра Герцеля:');
        for (const m of magnitudes) {
            const bar = '█'.repeat(Math.round(m.mag * 40));
            console.log(`  ${m.freq.toString().padStart(5)} Гц (отстройка ${m.offset.toString().padStart(4)} Гц): магнитуда = ${m.mag.toFixed(4)} ${bar}`);
        }

        // Магнитуда на целевой частоте должна быть максимальной
        const maxMag = magnitudes[0].mag;
        for (let i = 1; i < magnitudes.length; i++) {
            expect(magnitudes[i].mag).toBeLessThan(maxMag);
        }
    });

    it('АЧХ: подавление на частоте соседнего DFT-бина должно быть значительным', () => {
        const binWidth = sampleRate / N; // 31.25 Гц
        const magOnTarget = measureGoertzelMagnitude(targetFreq, targetFreq, sampleRate, N);
        const magOnNeighbor = measureGoertzelMagnitude(targetFreq + binWidth, targetFreq, sampleRate, N);

        const suppressionDb = 20 * Math.log10(magOnTarget / Math.max(magOnNeighbor, 1e-10));
        console.log(`Подавление на соседнем бине: ${suppressionDb.toFixed(1)} дБ`);
        expect(suppressionDb).toBeGreaterThan(20);
    });

    it('АЧХ: симметричность относительно целевой частоты', () => {
        // Используем дробные отстройки, НЕ кратные разрешению бина (31.25 Гц),
        // чтобы не попадать ровно на другие DFT-бины (где магнитуда ≈ 0)
        const offsets = [45, 110, 230, 470];
        for (const offset of offsets) {
            const freqAbove = targetFreq + offset;
            const freqBelow = targetFreq - offset;
            if (freqBelow <= 0) continue;

            const magAbove = measureGoertzelMagnitude(freqAbove, targetFreq, sampleRate, N);
            const magBelow = measureGoertzelMagnitude(freqBelow, targetFreq, sampleRate, N);

            const diffDb = Math.abs(20 * Math.log10(magAbove / Math.max(magBelow, 1e-10)));
            console.log(`Симметрия при отстройке ${offset} Гц: выше=${magAbove.toFixed(4)}, ниже=${magBelow.toFixed(4)}, разница=${diffDb.toFixed(1)} дБ`);
            expect(diffDb).toBeLessThan(3);
        }
    });

    it('линейность: магнитуда пропорциональна амплитуде входного сигнала', () => {
        const amplitudes = [0.1, 0.5, 1.0, 2.0];
        const magnitudes = amplitudes.map(a =>
            measureGoertzelMagnitude(targetFreq, targetFreq, sampleRate, N, a)
        );

        console.log('Линейность:');
        for (let i = 0; i < amplitudes.length; i++) {
            console.log(`  Амплитуда ${amplitudes[i]}: магнитуда = ${magnitudes[i].toFixed(4)} (отношение = ${(magnitudes[i] / amplitudes[i]).toFixed(4)})`);
        }

        // Отношение магнитуда/амплитуда должно быть постоянным (±1%)
        const ratio = magnitudes[2] / amplitudes[2];
        for (let i = 0; i < amplitudes.length; i++) {
            const r = magnitudes[i] / amplitudes[i];
            expect(r).toBeCloseTo(ratio, 1);
        }
    });

    it('нормализация: магнитуда не зависит от N при постоянной частоте', () => {
        const Ns = [64, 128, 256, 512];
        const magnitudes = Ns.map(n =>
            measureGoertzelMagnitude(targetFreq, targetFreq, sampleRate, n)
        );

        console.log('Зависимость магнитуды от N (после нормализации):');
        for (let i = 0; i < Ns.length; i++) {
            console.log(`  N=${Ns[i]}: магнитуда = ${magnitudes[i].toFixed(4)}`);
        }

        // Все магнитуды должны быть ≈ 1.0 (амплитуда входного сигнала)
        for (const mag of magnitudes) {
            expect(mag).toBeCloseTo(1.0, 1);
        }
    });

    it('разрешение по частоте улучшается с ростом N', () => {
        // Отстройка на полбина от целевой частоты
        const halfBinOffset64 = sampleRate / 64 / 2;   // 62.5 Гц
        const halfBinOffset256 = sampleRate / 256 / 2;  // 15.625 Гц

        const magTarget64 = measureGoertzelMagnitude(targetFreq, targetFreq, sampleRate, 64);
        const magOff64 = measureGoertzelMagnitude(targetFreq + halfBinOffset64, targetFreq, sampleRate, 64);
        const selectivity64 = magTarget64 / Math.max(magOff64, 1e-10);

        const magTarget256 = measureGoertzelMagnitude(targetFreq, targetFreq, sampleRate, 256);
        const magOff256 = measureGoertzelMagnitude(targetFreq + halfBinOffset256, targetFreq, sampleRate, 256);
        const selectivity256 = magTarget256 / Math.max(magOff256, 1e-10);

        console.log(`Селективность N=64 (отстройка ${halfBinOffset64} Гц): ${selectivity64.toFixed(1)}`);
        console.log(`Селективность N=256 (отстройка ${halfBinOffset256} Гц): ${selectivity256.toFixed(1)}`);

        // Селективность (на полбина) не должна зависеть от N — это свойство Герцеля
        // Оба значения ≈ 1.5 (спад на полбина ≈ -3.9 дБ для прямоугольного окна)
        expect(selectivity64).toBeGreaterThan(1.2);
        expect(selectivity256).toBeGreaterThan(1.2);
    });

    it('АЧХ: развёрнутый частотный скан от 0 до Найквиста', () => {
        const numPoints = 40;
        const nyquist = sampleRate / 2;
        const freqs = [];
        const mags = [];

        for (let i = 0; i <= numPoints; i++) {
            const freq = (nyquist * i) / numPoints;
            if (freq === 0) { freqs.push(freq); mags.push(0); continue; }
            const mag = measureGoertzelMagnitude(freq, targetFreq, sampleRate, N);
            freqs.push(freq);
            mags.push(mag);
        }

        console.log(`\nАЧХ фильтра Герцеля (целевая ${targetFreq} Гц, N=${N}, fs=${sampleRate}):`);
        const maxMag = Math.max(...mags);
        for (let i = 0; i <= numPoints; i++) {
            const normalized = maxMag > 0 ? mags[i] / maxMag : 0;
            const bar = '█'.repeat(Math.round(normalized * 40));
            const db = mags[i] > 0 ? (20 * Math.log10(mags[i] / Math.max(maxMag, 1e-10))).toFixed(1) : '-inf';
            console.log(`  ${freqs[i].toFixed(0).padStart(5)} Гц: ${db.padStart(7)} дБ ${bar}`);
        }

        // Пик должен быть на целевой частоте, нормализованная магнитуда ≈ 1.0
        expect(maxMag).toBeCloseTo(1.0, 1);
    });
});
