import { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { getCanvasColors, invalidateCanvasColors } from '../_shared/canvasUtils';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './OscilloscopeView.css';

/**
 * Осциллограф - отображение временной формы сигнала
 */
function OscilloscopeView({ data, width = 380, height = 200 }) {
    const { isDarkTheme } = useThemeContext();
    const canvasRef = useRef(null);
    const [visibleSamples, setVisibleSamples] = useState(1000); // Default visible count

    // Zoom levels logic could be complex, for now simple input

    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Установка размера с учётом DPR
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
        }
        ctx.resetTransform();
        ctx.scale(dpr, dpr);

        // Получаем цвета из CSS-переменных
        invalidateCanvasColors();
        const colors = getCanvasColors(canvas.parentElement);

        // Очистка
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        // Сетка
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 0.5;

        // H-lines
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // V-lines (Time)
        for (let i = 0; i <= 8; i++) {
            const x = (width / 8) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Center line
        ctx.strokeStyle = colors.axis;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Signal
        if (!data || data.length === 0) return;

        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        // We only show 'visibleSamples' amount of data.
        // If data.length < visibleSamples, we show all data stretched or partial?
        // Usually oscilloscopes show what is available buffer.
        // We will scale x axis so visibleSamples fits width.

        const pointsToDraw = Math.min(visibleSamples, data.length);
        const stepX = width / (visibleSamples - 1);

        for (let i = 0; i < pointsToDraw; i++) {
            const x = i * stepX;
            const val = data[i];
            // y maps [-1, 1] -> [height, 0]
            const y = height / 2 - (val * height / 2);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Axis Labels
        ctx.fillStyle = colors.text;
        ctx.font = '10px sans-serif';

        // Y-axis
        ctx.fillText('+1.0', 2, 10);
        ctx.fillText('0.0', 2, height / 2 - 2);
        ctx.fillText('-1.0', 2, height - 2);

        // X-axis (Samples count)
        ctx.textAlign = 'right';
        ctx.fillText(`${visibleSamples} samples`, width - 2, height - 2);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- isDarkTheme не используется напрямую, но нужен для перерисовки при смене темы (CSS-переменные)
    }, [data, isDarkTheme, width, height, visibleSamples]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform]);

    return (
        <div className={`oscilloscope-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="viz-toolbar"> {/* Reuse styles */}
                <span className="viz-toolbar-label">Zoom:</span>
                <input
                    type="number"
                    value={visibleSamples}
                    onChange={(e) => setVisibleSamples(Math.max(10, parseInt(e.target.value) || 1000))}
                    className="viz-select viz-zoom-input"
                    step="100"
                    aria-label="Количество видимых отсчётов"
                />
            </div>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="oscilloscope-canvas"
                role="img"
                aria-label="Осциллограф"
            />
        </div>
    );
}

OscilloscopeView.propTypes = {
    data: PropTypes.instanceOf(Float32Array),
    width: PropTypes.number,
    height: PropTypes.number
};

export default OscilloscopeView;
