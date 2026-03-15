import { useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './HistogramView.css';

/**
 * Гистограмма распределения амплитуд.
 * Принимает data = { bins: Float32Array, min, max, numBins } от HistogramPlugin.
 */
function HistogramView({ data, width = 380, height = 260 }) {
    const canvasRef = useRef(null);
    const { isDarkTheme } = useThemeContext();

    const histData = useMemo(() => {
        if (!data || !data.bins) return null;
        return data;
    }, [data]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !histData) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const bgColor = isDarkTheme ? '#1a1a2e' : '#f8f9fa';
        const barColor = isDarkTheme ? '#64b5f6' : '#2196f3';
        const textColor = isDarkTheme ? '#aaa' : '#666';
        const gridColor = isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        const { bins, min, max, numBins } = histData;
        const margin = { top: 10, right: 10, bottom: 30, left: 45 };
        const plotW = width - margin.left - margin.right;
        const plotH = height - margin.top - margin.bottom;

        // Найти максимум для масштабирования
        let maxBin = 0;
        for (let i = 0; i < numBins; i++) {
            if (bins[i] > maxBin) maxBin = bins[i];
        }
        if (maxBin === 0) maxBin = 1;

        // Сетка
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = margin.top + (plotH * i) / 4;
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + plotW, y);
            ctx.stroke();
        }

        // Столбцы
        const barW = plotW / numBins;
        ctx.fillStyle = barColor;
        for (let i = 0; i < numBins; i++) {
            const barH = (bins[i] / maxBin) * plotH;
            const x = margin.left + i * barW;
            const y = margin.top + plotH - barH;
            ctx.fillRect(x + 0.5, y, Math.max(1, barW - 1), barH);
        }

        // Оси
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + plotH);
        ctx.lineTo(margin.left + plotW, margin.top + plotH);
        ctx.stroke();

        // Подписи X
        ctx.fillStyle = textColor;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(min.toFixed(2), margin.left, margin.top + plotH + 15);
        ctx.fillText(max.toFixed(2), margin.left + plotW, margin.top + plotH + 15);
        const mid = (min + max) / 2;
        ctx.fillText(mid.toFixed(2), margin.left + plotW / 2, margin.top + plotH + 15);

        // Подписи Y
        ctx.textAlign = 'right';
        ctx.fillText((maxBin * 100).toFixed(0) + '%', margin.left - 4, margin.top + 10);
        ctx.fillText('0%', margin.left - 4, margin.top + plotH + 4);
    }, [histData, width, height, isDarkTheme]);

    return (
        <div className={`histogram-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
            />
        </div>
    );
}

HistogramView.propTypes = {
    data: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number
};

export default HistogramView;
