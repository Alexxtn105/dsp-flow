import { useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './GroupDelayView.css';

/**
 * График групповой задержки.
 * data = { frequencies: number[], delays: number[], maxDelay, minDelay }
 */
function GroupDelayView({ data, width = 380, height = 260 }) {
    const canvasRef = useRef(null);
    const { isDarkTheme } = useThemeContext();

    const gdData = useMemo(() => {
        if (!data || !data.frequencies || !data.delays) return null;
        if (data.frequencies.length === 0) return null;
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
        const lineColor = isDarkTheme ? '#64b5f6' : '#2196f3';
        const textColor = isDarkTheme ? '#aaa' : '#666';
        const gridColor = isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const axisColor = isDarkTheme ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        if (!gdData) {
            ctx.fillStyle = textColor;
            ctx.font = '12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Waiting for data...', width / 2, height / 2);
            return;
        }

        const margin = { top: 15, right: 15, bottom: 30, left: 50 };
        const plotW = width - margin.left - margin.right;
        const plotH = height - margin.top - margin.bottom;

        const { frequencies, delays, maxDelay, minDelay } = gdData;
        const delayRange = maxDelay - minDelay || 1;
        const freqMax = frequencies[frequencies.length - 1] || 1;

        // Grid
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = margin.top + (plotH * i) / 4;
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + plotW, y);
            ctx.stroke();

            const val = maxDelay - (delayRange * i) / 4;
            ctx.fillStyle = textColor;
            ctx.font = '9px system-ui';
            ctx.textAlign = 'right';
            ctx.fillText(val.toFixed(1), margin.left - 4, y + 3);
        }

        // Axes
        ctx.strokeStyle = axisColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + plotH);
        ctx.lineTo(margin.left + plotW, margin.top + plotH);
        ctx.stroke();

        // Plot line
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < frequencies.length; i++) {
            const x = margin.left + (frequencies[i] / freqMax) * plotW;
            const y = margin.top + plotH * (1 - (delays[i] - minDelay) / delayRange);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // X-axis labels
        ctx.fillStyle = textColor;
        ctx.font = '9px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('0', margin.left, margin.top + plotH + 15);
        ctx.fillText(`${(freqMax / 1000).toFixed(1)}k`, margin.left + plotW, margin.top + plotH + 15);
        ctx.fillText('Frequency (Hz)', margin.left + plotW / 2, margin.top + plotH + 25);

        // Y-axis label
        ctx.save();
        ctx.translate(12, margin.top + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Samples', 0, 0);
        ctx.restore();

    }, [gdData, width, height, isDarkTheme]);

    return (
        <div className={`group-delay-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
            />
        </div>
    );
}

GroupDelayView.propTypes = {
    data: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number
};

export default GroupDelayView;
