import { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './PhasePortraitView.css';

/**
 * Фазовый портрет — траектория сигнала в пространстве (x[n], x[n-1]).
 * Для комплексного сигнала: (Re, Im). data = Float32Array (interleaved Re,Im).
 */
function PhasePortraitView({ data, width = 380, height = 260 }) {
    const canvasRef = useRef(null);
    const { isDarkTheme } = useThemeContext();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const bgColor = isDarkTheme ? '#1a1a2e' : '#f8f9fa';
        const dotColor = isDarkTheme ? 'rgba(100,181,246,0.6)' : 'rgba(33,150,243,0.5)';
        const axisColor = isDarkTheme ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
        const textColor = isDarkTheme ? '#aaa' : '#666';

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        const margin = 25;
        const plotW = width - margin * 2;
        const plotH = height - margin * 2;
        const cx = width / 2;
        const cy = height / 2;

        // Axes
        ctx.strokeStyle = axisColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(margin, cy);
        ctx.lineTo(width - margin, cy);
        ctx.moveTo(cx, margin);
        ctx.lineTo(cx, height - margin);
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Re', width - margin + 12, cy + 4);
        ctx.fillText('Im', cx, margin - 8);

        if (!data || !(data instanceof Float32Array) || data.length < 4) return;

        // Complex interleaved: [re0, im0, re1, im1, ...]
        let maxAbs = 0;
        for (let i = 0; i < data.length; i += 2) {
            const re = Math.abs(data[i]);
            const im = Math.abs(data[i + 1]);
            if (re > maxAbs) maxAbs = re;
            if (im > maxAbs) maxAbs = im;
        }
        if (maxAbs === 0) maxAbs = 1;

        const scale = Math.min(plotW, plotH) / 2 / maxAbs;

        ctx.fillStyle = dotColor;
        for (let i = 0; i < data.length; i += 2) {
            const x = cx + data[i] * scale;
            const y = cy - data[i + 1] * scale;
            ctx.fillRect(x - 1, y - 1, 2, 2);
        }

    }, [data, width, height, isDarkTheme]);

    return (
        <div className={`phase-portrait-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
            />
        </div>
    );
}

PhasePortraitView.propTypes = {
    data: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number
};

export default PhasePortraitView;
