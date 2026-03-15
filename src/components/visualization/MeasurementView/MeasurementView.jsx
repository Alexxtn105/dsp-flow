import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './MeasurementView.css';

/**
 * Универсальный компонент для отображения вычисленных метрик (SNR, BER, мощность).
 * Принимает объект data с произвольными полями и отображает их как пары ключ-значение.
 */
function MeasurementView({ data, width = 380, height = 260, metricType = 'power' }) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation();

    const metrics = useMemo(() => {
        if (!data || typeof data !== 'object') return [];

        if (metricType === 'power') {
            return [
                { label: t('viz.measurement.rms'), value: data.rms, unit: '' },
                { label: t('viz.measurement.peak'), value: data.peak, unit: '' },
                { label: t('viz.measurement.average'), value: data.average, unit: '' },
                { label: t('viz.measurement.dbfs'), value: data.dbfs, unit: t('viz.measurement.db') },
            ];
        } else if (metricType === 'snr') {
            return [
                { label: t('viz.measurement.snr'), value: data.snr, unit: t('viz.measurement.db') },
                { label: t('viz.measurement.signalPower'), value: data.signalPower, unit: '' },
                { label: t('viz.measurement.noisePower'), value: data.noisePower, unit: '' },
            ];
        } else if (metricType === 'ber') {
            return [
                { label: t('viz.measurement.ber'), value: data.ber, unit: '' },
                { label: t('viz.measurement.totalBits'), value: data.totalBits, unit: '' },
                { label: t('viz.measurement.errorBits'), value: data.errorBits, unit: '' },
            ];
        }

        return Object.entries(data).map(([key, value]) => ({
            label: key, value, unit: ''
        }));
    }, [data, metricType, t]);

    const fmt = (v) => {
        if (v === undefined || v === null) return '—';
        if (!isFinite(v)) return v > 0 ? '+∞' : '−∞';
        if (Number.isInteger(v) && Math.abs(v) < 1e9) return v.toString();
        if (Math.abs(v) >= 1000) return v.toFixed(1);
        if (Math.abs(v) >= 1) return v.toFixed(4);
        if (Math.abs(v) >= 0.001) return v.toFixed(6);
        if (v === 0) return '0';
        return v.toExponential(3);
    };

    const mainMetric = metrics[0];

    return (
        <div
            className={`measurement-view ${isDarkTheme ? 'dark-theme' : ''}`}
            style={{ width, height }}
        >
            {mainMetric && (
                <div className="mv-main-value">
                    <span className="mv-main-label">{mainMetric.label}</span>
                    <span className="mv-value">
                        {fmt(mainMetric.value)}
                        {mainMetric.unit && <span className="mv-unit"> {mainMetric.unit}</span>}
                    </span>
                </div>
            )}
            <div className="mv-stats-grid">
                {metrics.slice(1).map(({ label, value, unit }) => (
                    <div key={label} className="mv-stat">
                        <span className="mv-stat-label">{label}</span>
                        <span className="mv-stat-value">
                            {fmt(value)}
                            {unit && <span className="mv-unit"> {unit}</span>}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

MeasurementView.propTypes = {
    data: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number,
    metricType: PropTypes.oneOf(['power', 'snr', 'ber'])
};

export default MeasurementView;
