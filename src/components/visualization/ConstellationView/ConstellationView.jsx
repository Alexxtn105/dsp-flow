import { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './ConstellationView.css';

/**
 * Фазовое созвездие (Constellation Diagram)
 * Отображает I/Q точки на комплексной плоскости.
 * data — Float32Array interleaved [I0, Q0, I1, Q1, ...]
 */
function ConstellationView({ data, width = 380, height = 200 }) {
    const { isDarkTheme } = useThemeContext();
    const canvasRef = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
        }
        ctx.resetTransform();
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = isDarkTheme ? '#1f2937' : '#f9fafb';
        ctx.fillRect(0, 0, width, height);

        // Use square area centered in the available space
        const side = Math.min(width, height);
        const offsetX = (width - side) / 2;
        const offsetY = (height - side) / 2;

        // Grid
        ctx.strokeStyle = isDarkTheme ? '#374151' : '#e5e7eb';
        ctx.lineWidth = 0.5;

        const gridCount = 8;
        for (let i = 0; i <= gridCount; i++) {
            const pos = (side / gridCount) * i;
            // Vertical
            ctx.beginPath();
            ctx.moveTo(offsetX + pos, offsetY);
            ctx.lineTo(offsetX + pos, offsetY + side);
            ctx.stroke();
            // Horizontal
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY + pos);
            ctx.lineTo(offsetX + side, offsetY + pos);
            ctx.stroke();
        }

        // Axes through center
        ctx.strokeStyle = isDarkTheme ? '#6b7280' : '#9ca3af';
        ctx.lineWidth = 1;
        const cx = offsetX + side / 2;
        const cy = offsetY + side / 2;

        ctx.beginPath();
        ctx.moveTo(offsetX, cy);
        ctx.lineTo(offsetX + side, cy);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, offsetY);
        ctx.lineTo(cx, offsetY + side);
        ctx.stroke();

        // Unit circle
        ctx.strokeStyle = isDarkTheme ? '#4b5563' : '#d1d5db';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const unitRadius = side / 2 * 0.7; // scale: 1.0 maps to 70% of half-side
        ctx.arc(cx, cy, unitRadius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);

        // Plot I/Q points
        if (data && data.length >= 2) {
            const scale = side / 2 * 0.7; // same as unit circle
            const numPoints = Math.floor(data.length / 2);

            ctx.fillStyle = isDarkTheme ? 'rgba(96, 165, 250, 0.6)' : 'rgba(59, 130, 246, 0.6)';

            for (let i = 0; i < numPoints; i++) {
                const I = data[i * 2];
                const Q = data[i * 2 + 1];
                const px = cx + I * scale;
                const py = cy - Q * scale; // Q up = screen up

                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
                ctx.fill();
            }
        }

        // Labels
        ctx.fillStyle = isDarkTheme ? '#9ca3af' : '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('I', offsetX + side - 8, cy - 4);
        ctx.fillText('Q', cx + 8, offsetY + 10);

    }, [data, isDarkTheme, width, height]);

    useEffect(() => {
        draw();
    }, [draw]);

    return (
        <div className={`constellation-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="constellation-canvas"
                role="img"
                aria-label="Фазовое созвездие"
            />
        </div>
    );
}

ConstellationView.propTypes = {
    data: PropTypes.instanceOf(Float32Array),
    width: PropTypes.number,
    height: PropTypes.number
};

export default ConstellationView;
