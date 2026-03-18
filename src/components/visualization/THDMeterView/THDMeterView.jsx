import { useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './THDMeterView.css';

/**
 * Измеритель THD — гармонический спектр + числовое значение.
 * data = { fundamental, thd, thdDb, harmonics: [{freq, magnitude, db}] }
 */
function THDMeterView({ data, width = 380, height = 260 }) {
    const canvasRef = useRef(null);
    const { isDarkTheme } = useThemeContext();

    const thdData = useMemo(() => {
        if (!data || data.thd === undefined) return null;
        return data;
    }, [data]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const bgColor = isDarkTheme ? '#1a1a2e' : '#f8f9fa';
        const textColor = isDarkTheme ? '#aaa' : '#666';
        const barColor = isDarkTheme ? '#64b5f6' : '#2196f3';
        const fundamentalColor = isDarkTheme ? '#4caf50' : '#388e3c';
        const gridColor = isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        if (!thdData) {
            ctx.fillStyle = textColor;
            ctx.font = '12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Waiting for data...', width / 2, height / 2);
            return;
        }

        // THD value header
        ctx.fillStyle = textColor;
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`THD: ${(thdData.thd * 100).toFixed(2)}%  (${thdData.thdDb.toFixed(1)} dB)`, 10, 20);

        ctx.font = '11px system-ui';
        ctx.fillText(`Fundamental: ${thdData.fundamental.toFixed(1)} Hz`, 10, 36);

        // Harmonics bar chart
        const harmonics = thdData.harmonics || [];
        if (harmonics.length === 0) return;

        const margin = { top: 48, right: 10, bottom: 25, left: 45 };
        const plotW = width - margin.left - margin.right;
        const plotH = height - margin.top - margin.bottom;

        let maxDb = 0;
        let minDb = -80;
        harmonics.forEach(h => {
            if (h.db > maxDb) maxDb = h.db;
        });
        maxDb = Math.ceil(maxDb / 10) * 10;

        // Grid
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        const dbRange = maxDb - minDb;
        for (let db = minDb; db <= maxDb; db += 20) {
            const y = margin.top + plotH * (1 - (db - minDb) / dbRange);
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + plotW, y);
            ctx.stroke();
            ctx.fillStyle = textColor;
            ctx.font = '9px system-ui';
            ctx.textAlign = 'right';
            ctx.fillText(`${db}`, margin.left - 4, y + 3);
        }

        // Bars
        const barW = Math.max(8, plotW / harmonics.length - 4);
        const gap = (plotW - barW * harmonics.length) / (harmonics.length + 1);

        harmonics.forEach((h, i) => {
            const dbVal = Math.max(minDb, h.db);
            const barH = ((dbVal - minDb) / dbRange) * plotH;
            const x = margin.left + gap + i * (barW + gap);
            const y = margin.top + plotH - barH;

            ctx.fillStyle = i === 0 ? fundamentalColor : barColor;
            ctx.fillRect(x, y, barW, barH);

            ctx.fillStyle = textColor;
            ctx.font = '9px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(`H${i + 1}`, x + barW / 2, margin.top + plotH + 14);
        });

        // Y-axis label
        ctx.fillStyle = textColor;
        ctx.font = '9px system-ui';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(10, margin.top + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('dB', 0, 0);
        ctx.restore();

    }, [thdData, width, height, isDarkTheme]);

    return (
        <div className={`thd-meter-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
            />
        </div>
    );
}

THDMeterView.propTypes = {
    data: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number
};

export default THDMeterView;
