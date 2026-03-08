import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './NumericIndicatorView.css';

/**
 * Числовой индикатор — отображает мгновенное значение действительного сигнала.
 * Показывает последний сэмпл, среднее, мин, макс по текущему чанку.
 */
function NumericIndicatorView({ data, width = 380, height = 260, isComplex = false }) {
    const { isDarkTheme } = useThemeContext();

    const stats = useMemo(() => {
        if (!data || data.length === 0) {
            return isComplex
                ? { re: 0, im: 0, mag: 0, phase: 0, avgRe: 0, avgIm: 0, minRe: 0, maxRe: 0, minIm: 0, maxIm: 0 }
                : { value: 0, avg: 0, min: 0, max: 0, rms: 0 };
        }

        if (isComplex) {
            const numSamples = Math.floor(data.length / 2);
            const lastRe = data[(numSamples - 1) * 2];
            const lastIm = data[(numSamples - 1) * 2 + 1];

            let sumRe = 0, sumIm = 0;
            let minRe = Infinity, maxRe = -Infinity;
            let minIm = Infinity, maxIm = -Infinity;

            for (let i = 0; i < numSamples; i++) {
                const re = data[i * 2];
                const im = data[i * 2 + 1];
                sumRe += re;
                sumIm += im;
                if (re < minRe) minRe = re;
                if (re > maxRe) maxRe = re;
                if (im < minIm) minIm = im;
                if (im > maxIm) maxIm = im;
            }

            const mag = Math.sqrt(lastRe * lastRe + lastIm * lastIm);
            const phase = Math.atan2(lastIm, lastRe) * (180 / Math.PI);

            return {
                re: lastRe, im: lastIm, mag, phase,
                avgRe: sumRe / numSamples, avgIm: sumIm / numSamples,
                minRe, maxRe, minIm, maxIm
            };
        } else {
            const lastValue = data[data.length - 1];
            let sum = 0, sumSq = 0;
            let min = Infinity, max = -Infinity;

            for (let i = 0; i < data.length; i++) {
                const v = data[i];
                sum += v;
                sumSq += v * v;
                if (v < min) min = v;
                if (v > max) max = v;
            }

            return {
                value: lastValue,
                avg: sum / data.length,
                min,
                max,
                rms: Math.sqrt(sumSq / data.length)
            };
        }
    }, [data, isComplex]);

    const fmt = (v) => {
        if (!isFinite(v)) return '—';
        if (Math.abs(v) >= 1000) return v.toFixed(1);
        if (Math.abs(v) >= 1) return v.toFixed(4);
        if (Math.abs(v) >= 0.001) return v.toFixed(6);
        return v.toExponential(4);
    };

    return (
        <div
            className={`numeric-indicator-view ${isDarkTheme ? 'dark-theme' : ''}`}
            style={{ width, height }}
        >
            {isComplex ? (
                <>
                    <div className="ni-main-value">
                        <span className="ni-main-label">Мгновенное значение</span>
                        <span className="ni-value-complex">
                            <span className="ni-re">{fmt(stats.re)}</span>
                            <span className="ni-sign">{stats.im >= 0 ? ' + j' : ' − j'}</span>
                            <span className="ni-im">{fmt(Math.abs(stats.im))}</span>
                        </span>
                    </div>
                    <div className="ni-stats-grid">
                        <div className="ni-stat">
                            <span className="ni-stat-label">|Z|</span>
                            <span className="ni-stat-value">{fmt(stats.mag)}</span>
                        </div>
                        <div className="ni-stat">
                            <span className="ni-stat-label">∠ (°)</span>
                            <span className="ni-stat-value">{fmt(stats.phase)}</span>
                        </div>
                        <div className="ni-stat">
                            <span className="ni-stat-label">Re avg</span>
                            <span className="ni-stat-value">{fmt(stats.avgRe)}</span>
                        </div>
                        <div className="ni-stat">
                            <span className="ni-stat-label">Im avg</span>
                            <span className="ni-stat-value">{fmt(stats.avgIm)}</span>
                        </div>
                        <div className="ni-stat">
                            <span className="ni-stat-label">Re min</span>
                            <span className="ni-stat-value">{fmt(stats.minRe)}</span>
                        </div>
                        <div className="ni-stat">
                            <span className="ni-stat-label">Re max</span>
                            <span className="ni-stat-value">{fmt(stats.maxRe)}</span>
                        </div>
                        <div className="ni-stat">
                            <span className="ni-stat-label">Im min</span>
                            <span className="ni-stat-value">{fmt(stats.minIm)}</span>
                        </div>
                        <div className="ni-stat">
                            <span className="ni-stat-label">Im max</span>
                            <span className="ni-stat-value">{fmt(stats.maxIm)}</span>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="ni-main-value">
                        <span className="ni-main-label">Мгновенное значение</span>
                        <span className="ni-value-real">{fmt(stats.value)}</span>
                    </div>
                    <div className="ni-stats-grid">
                        <div className="ni-stat">
                            <span className="ni-stat-label">Среднее</span>
                            <span className="ni-stat-value">{fmt(stats.avg)}</span>
                        </div>
                        <div className="ni-stat">
                            <span className="ni-stat-label">СКЗ</span>
                            <span className="ni-stat-value">{fmt(stats.rms)}</span>
                        </div>
                        <div className="ni-stat">
                            <span className="ni-stat-label">Мин</span>
                            <span className="ni-stat-value">{fmt(stats.min)}</span>
                        </div>
                        <div className="ni-stat">
                            <span className="ni-stat-label">Макс</span>
                            <span className="ni-stat-value">{fmt(stats.max)}</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

NumericIndicatorView.propTypes = {
    data: PropTypes.instanceOf(Float32Array),
    width: PropTypes.number,
    height: PropTypes.number,
    isComplex: PropTypes.bool
};

export default NumericIndicatorView;
