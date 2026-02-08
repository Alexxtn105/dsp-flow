import { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './SpectrumView.css';

/**
 * Спектроанализатор - отображение амплитудного спектра
 */
function SpectrumView({ data, sampleRate = 48000, isDarkTheme, width = 380, height = 200 }) {
    const canvasRef = useRef(null);

    const drawSpectrum = useCallback(() => {
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

        // Горизонтальные линии (дБ)
        for (let db = 0; db >= -60; db -= 10) {
            const y = height * (-db / 60);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Вертикальные линии (частота)
        const freqMarks = [100, 1000, 5000, 10000, 20000];
        const maxFreq = sampleRate / 2;

        for (const freq of freqMarks) {
            if (freq > maxFreq) continue;
            const x = (freq / maxFreq) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Отрисовка спектра
        if (!data || data.length === 0) return;

        // Градиент для столбцов
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, isDarkTheme ? '#3b82f6' : '#3b82f6');
        gradient.addColorStop(0.5, isDarkTheme ? '#8b5cf6' : '#8b5cf6');
        gradient.addColorStop(1, isDarkTheme ? '#ef4444' : '#ef4444');

        const barWidth = Math.max(1, width / data.length);
        const minDb = -60;

        for (let i = 0; i < data.length && i * barWidth < width; i++) {
            // data в дБ (отрицательные значения)
            const dbValue = Math.max(minDb, data[i]);
            const barHeight = height * (1 + dbValue / Math.abs(minDb));

            ctx.fillStyle = gradient;
            ctx.fillRect(
                i * barWidth,
                height - barHeight,
                barWidth - 0.5,
                barHeight
            );
        }
    }, [data, sampleRate, isDarkTheme, width, height]);

    useEffect(() => {
        drawSpectrum();
    }, [drawSpectrum]);

    return (
        <div className={`spectrum-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="spectrum-canvas"
            />
            <div className="spectrum-labels-y">
                <span>0 dB</span>
                <span>-30</span>
                <span>-60</span>
            </div>
            <div className="spectrum-labels-x">
                <span>0</span>
                <span>1k</span>
                <span>5k</span>
                <span>10k</span>
                <span>{Math.round(sampleRate / 2000)}k Hz</span>
            </div>
        </div>
    );
}

SpectrumView.propTypes = {
    data: PropTypes.instanceOf(Float32Array),
    sampleRate: PropTypes.number,
    isDarkTheme: PropTypes.bool.isRequired,
    width: PropTypes.number,
    height: PropTypes.number
};

export default SpectrumView;
