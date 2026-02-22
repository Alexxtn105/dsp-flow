import { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import './OscilloscopeView.css';

/**
 * Осциллограф - отображение временной формы сигнала
 */
function OscilloscopeView({ data, isDarkTheme, width = 380, height = 200 }) {
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

        // Очистка
        ctx.fillStyle = isDarkTheme ? '#1f2937' : '#f9fafb';
        ctx.fillRect(0, 0, width, height);

        // Сетка
        ctx.strokeStyle = isDarkTheme ? '#374151' : '#e5e7eb';
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
        ctx.strokeStyle = isDarkTheme ? '#6b7280' : '#9ca3af';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Signal
        if (!data || data.length === 0) return;

        ctx.strokeStyle = isDarkTheme ? '#60a5fa' : '#3b82f6';
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
        ctx.fillStyle = isDarkTheme ? '#9ca3af' : '#6b7280';
        ctx.font = '10px sans-serif';

        // Y-axis
        ctx.fillText('+1.0', 2, 10);
        ctx.fillText('0.0', 2, height / 2 - 2);
        ctx.fillText('-1.0', 2, height - 2);

        // X-axis (Samples count)
        ctx.textAlign = 'right';
        ctx.fillText(`${visibleSamples} samples`, width - 2, height - 2);

    }, [data, isDarkTheme, width, height, visibleSamples]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform]);

    return (
        <div className={`oscilloscope-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="viz-toolbar"> {/* Reuse styles */}
                <span style={{ marginRight: 8, fontSize: 11 }}>Zoom:</span>
                <input
                    type="number"
                    value={visibleSamples}
                    onChange={(e) => setVisibleSamples(Math.max(10, parseInt(e.target.value) || 1000))}
                    className="viz-select"
                    style={{ width: 60 }}
                    step="100"
                />
            </div>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="oscilloscope-canvas"
            />
        </div>
    );
}

OscilloscopeView.propTypes = {
    data: PropTypes.instanceOf(Float32Array),
    isDarkTheme: PropTypes.bool.isRequired,
    width: PropTypes.number,
    height: PropTypes.number
};

export default OscilloscopeView;
