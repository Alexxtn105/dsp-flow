import { useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './PoleZeroView.css';

/**
 * Диаграмма полюсов и нулей на z-плоскости.
 * data = { poles: [{re, im}], zeros: [{re, im}], stable: boolean }
 */
function PoleZeroView({ data, width = 380, height = 260 }) {
    const canvasRef = useRef(null);
    const { isDarkTheme } = useThemeContext();

    const pzData = useMemo(() => {
        if (!data || !data.poles || !data.zeros) return null;
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
        const axisColor = isDarkTheme ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
        const circleColor = isDarkTheme ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
        const textColor = isDarkTheme ? '#aaa' : '#666';
        const poleColor = '#f44336';
        const zeroColor = '#4caf50';
        const stableColor = '#4caf50';
        const unstableColor = '#f44336';

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        const margin = 30;
        const plotSize = Math.min(width - margin * 2, height - margin * 2);
        const cx = width / 2;
        const cy = height / 2;
        const radius = plotSize / 2;

        // Unit circle
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.stroke();

        // Axes
        ctx.strokeStyle = axisColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - radius - 10, cy);
        ctx.lineTo(cx + radius + 10, cy);
        ctx.moveTo(cx, cy - radius - 10);
        ctx.lineTo(cx, cy + radius + 10);
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = textColor;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Re', cx + radius + 15, cy + 4);
        ctx.fillText('Im', cx, cy - radius - 12);
        ctx.fillText('1', cx + radius, cy + 14);
        ctx.fillText('-1', cx - radius, cy + 14);

        if (!pzData) return;

        const scale = radius;

        // Draw zeros (circles)
        ctx.strokeStyle = zeroColor;
        ctx.lineWidth = 2;
        pzData.zeros.forEach(z => {
            const x = cx + z.re * scale;
            const y = cy - z.im * scale;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.stroke();
        });

        // Draw poles (crosses)
        ctx.strokeStyle = poleColor;
        ctx.lineWidth = 2;
        pzData.poles.forEach(p => {
            const x = cx + p.re * scale;
            const y = cy - p.im * scale;
            const s = 6;
            ctx.beginPath();
            ctx.moveTo(x - s, y - s);
            ctx.lineTo(x + s, y + s);
            ctx.moveTo(x + s, y - s);
            ctx.lineTo(x - s, y + s);
            ctx.stroke();
        });

        // Stability indicator
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'left';
        ctx.fillStyle = pzData.stable ? stableColor : unstableColor;
        ctx.fillText(pzData.stable ? 'Stable' : 'Unstable', 8, 16);

        // Legend
        ctx.font = '10px system-ui';
        ctx.textAlign = 'right';
        ctx.strokeStyle = poleColor;
        ctx.lineWidth = 2;
        const ly = 14;
        ctx.beginPath();
        ctx.moveTo(width - 55, ly - 4);
        ctx.lineTo(width - 45, ly + 4);
        ctx.moveTo(width - 45, ly - 4);
        ctx.lineTo(width - 55, ly + 4);
        ctx.stroke();
        ctx.fillStyle = textColor;
        ctx.fillText('Poles', width - 58, ly + 4);

        ctx.strokeStyle = zeroColor;
        ctx.beginPath();
        ctx.arc(width - 50, ly + 18, 4, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillText('Zeros', width - 58, ly + 22);

    }, [pzData, width, height, isDarkTheme]);

    return (
        <div className={`pole-zero-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
            />
        </div>
    );
}

PoleZeroView.propTypes = {
    data: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number
};

export default PoleZeroView;
