import { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { setupCanvasDPR, drawFrequencyGrid, drawCursorLabel, getMouseFrequency } from '../_shared/canvasUtils';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './SpectrumView.css';

/**
 * Спектроанализатор - отображение амплитудного спектра
 */
function SpectrumView({ data, sampleRate = 48000, width = 380, height = 200 }) {
    const { isDarkTheme } = useThemeContext();
    const canvasRef = useRef(null);
    const [accumulate, setAccumulate] = useState(false);
    const [accumulatedData, setAccumulatedData] = useState(null);

    // Mouse tracking
    const [cursorX, setCursorX] = useState(null);
    const [cursorY, setCursorY] = useState(null);
    const [hoverFreq, setHoverFreq] = useState(null);
    const [hoverDb, setHoverDb] = useState(null);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!accumulate) setAccumulatedData(null);
    }, [accumulate]);

    useEffect(() => {
        if (!data || !accumulate) return;
        setAccumulatedData(prev => {
            if (!prev) return Float32Array.from(data);
            const next = new Float32Array(prev.length);
            for (let i = 0; i < prev.length; i++) {
                next[i] = Math.max(prev[i], data[i] || -100);
            }
            return next;
        });
    }, [data, accumulate]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const drawSpectrum = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = setupCanvasDPR(canvas, width, height);

        // Очистка
        ctx.fillStyle = isDarkTheme ? '#1f2937' : '#f9fafb';
        ctx.fillRect(0, 0, width, height);

        // Grid parameters
        const minDb = -100;
        const maxDb = 0;
        const dbRange = maxDb - minDb;

        // Draw Grid
        ctx.strokeStyle = isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;

        // Horizontal dB lines (every 10dB)
        ctx.font = '10px sans-serif';
        ctx.fillStyle = isDarkTheme ? '#9ca3af' : '#4b5563';
        ctx.textBaseline = 'middle';

        for (let db = maxDb; db >= minDb; db -= 10) {
            const y = height - ((db - minDb) / dbRange) * height;
            ctx.beginPath();
            ctx.moveTo(30, y); // Offset for labels
            ctx.lineTo(width, y);
            ctx.stroke();

            ctx.fillText(`${db}`, 2, y);
        }

        // Vertical Freq lines (shared utility)
        ctx.lineWidth = 0.5;
        ctx.font = '10px sans-serif';
        ctx.fillStyle = isDarkTheme ? '#9ca3af' : '#4b5563';
        drawFrequencyGrid(ctx, width, height, sampleRate, isDarkTheme);

        // Drawing helper
        const drawLine = (pData, color) => {
            if (!pData || pData.length === 0) return;

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;

            // Map data points
            // data is usually half FFT size (e.g. 1024 points)
            // We need to stretch it to width

            for (let i = 0; i < pData.length; i++) {
                const x = (i / (pData.length - 1)) * width;
                const db = Math.max(minDb, Math.min(maxDb, pData[i]));
                const y = height - ((db - minDb) / dbRange) * height;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        };

        // Draw Accumulated
        if (accumulate && accumulatedData) {
            drawLine(accumulatedData, '#ef4444'); // Red for max hold
        }

        // Draw Current
        if (data) {
            drawLine(data, isDarkTheme ? '#60a5fa' : '#3b82f6');
        }

        // Crosshair
        if (cursorX !== null && cursorY !== null) {
            ctx.strokeStyle = isDarkTheme ? '#ffffff' : '#000000';
            ctx.lineWidth = 1;

            // V-line
            ctx.beginPath();
            ctx.moveTo(cursorX, 0);
            ctx.lineTo(cursorX, height);
            ctx.stroke();

            // H-line
            ctx.beginPath();
            ctx.moveTo(0, cursorY);
            ctx.lineTo(width, cursorY);
            ctx.stroke();

            // Label
            const label = `${Math.round(hoverFreq)}Hz : ${hoverDb.toFixed(1)}dB`;
            drawCursorLabel(ctx, label, cursorX, cursorY - 20, width, isDarkTheme);
        }

    }, [data, accumulatedData, accumulate, sampleRate, isDarkTheme, width, height, cursorX, cursorY, hoverFreq, hoverDb]);

    useEffect(() => {
        drawSpectrum();
    }, [drawSpectrum]);

    const handleMouseMove = useCallback((e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setCursorX(x);
        setCursorY(y);

        // Calc freq and dB from coords
        const freq = getMouseFrequency(x, width, sampleRate);

        const minDb = -100;
        const maxDb = 0;
        const dbRange = maxDb - minDb;
        const db = minDb + ((height - y) / height) * dbRange;

        setHoverFreq(freq);
        setHoverDb(db);
    }, [width, height, sampleRate]);

    const handleMouseLeave = useCallback(() => {
        setCursorX(null);
        setCursorY(null);
    }, []);

    return (
        <div className={`spectrum-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="viz-toolbar"> {/* Reuse styles for consistency */}
                <div className="viz-toolbar-group">
                    <button
                        className={`viz-btn viz-btn-text ${accumulate ? 'active' : ''}`}
                        onClick={() => setAccumulate(!accumulate)}
                        title="Накопление спектра (Max Hold)"
                    >
                        Max Hold
                    </button>
                </div>
            </div>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="spectrum-canvas"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                role="img"
                aria-label="Спектроанализатор"
            />
        </div>
    );
}

SpectrumView.propTypes = {
    data: PropTypes.instanceOf(Float32Array),
    sampleRate: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number
};

export default SpectrumView;
