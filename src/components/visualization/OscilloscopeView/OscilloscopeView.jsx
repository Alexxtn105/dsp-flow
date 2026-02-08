import { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './OscilloscopeView.css';

/**
 * Осциллограф - отображение временной формы сигнала
 */
function OscilloscopeView({ data, isDarkTheme, width = 380, height = 200 }) {
    const canvasRef = useRef(null);

    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Установка размера с учётом DPR
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // Очистка
        ctx.fillStyle = isDarkTheme ? '#1f2937' : '#f9fafb';
        ctx.fillRect(0, 0, width, height);

        // Сетка
        ctx.strokeStyle = isDarkTheme ? '#374151' : '#e5e7eb';
        ctx.lineWidth = 0.5;

        // Горизонтальные линии
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Вертикальные линии
        for (let i = 0; i <= 8; i++) {
            const x = (width / 8) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Центральная линия (ноль)
        ctx.strokeStyle = isDarkTheme ? '#6b7280' : '#9ca3af';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Отрисовка сигнала
        if (!data || data.length === 0) return;

        ctx.strokeStyle = isDarkTheme ? '#60a5fa' : '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        const step = Math.max(1, Math.floor(data.length / width));

        for (let i = 0; i < width; i++) {
            const dataIndex = Math.floor(i * step);
            if (dataIndex >= data.length) break;

            const sample = data[dataIndex];
            // Нормализация: предполагаем, что данные в диапазоне [-1, 1]
            const y = height / 2 - (sample * height / 2);

            if (i === 0) {
                ctx.moveTo(i, y);
            } else {
                ctx.lineTo(i, y);
            }
        }

        ctx.stroke();
    }, [data, isDarkTheme, width, height]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform]);

    return (
        <div className={`oscilloscope-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="oscilloscope-canvas"
            />
            <div className="oscilloscope-labels">
                <span className="label-max">+1.0</span>
                <span className="label-zero">0.0</span>
                <span className="label-min">-1.0</span>
            </div>
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
