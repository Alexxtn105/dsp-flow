import { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './WaterfallView.css';

/**
 * Водопад (WaterFall) - спектрограмма во времени
 */
function WaterfallView({ data, sampleRate = 48000, isDarkTheme, width = 380, height = 200 }) {
    const canvasRef = useRef(null);
    const tempCanvasRef = useRef(null);

    // Инициализация временного канваса для хранения истории
    useEffect(() => {
        if (!tempCanvasRef.current) {
            tempCanvasRef.current = document.createElement('canvas');
            tempCanvasRef.current.width = width;
            tempCanvasRef.current.height = height;
        }
    }, [width, height]);

    const drawWaterfall = useCallback(() => {
        const canvas = canvasRef.current;
        const tempCanvas = tempCanvasRef.current;

        if (!canvas || !tempCanvas || !data || data.length === 0) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        const dpr = window.devicePixelRatio || 1;

        // Настраиваем основной канвас если размеры изменились
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);

            // Заливаем фон
            ctx.fillStyle = isDarkTheme ? '#1f2937' : '#f9fafb';
            ctx.fillRect(0, 0, width, height);
        }

        // 1. Сдвигаем старое изображение вниз на 1 пиксель
        // Копируем текущий канвас во временный
        tempCtx.drawImage(canvas, 0, 0, width * dpr, height * dpr);

        // Рисуем обратно со сдвигом вниз
        // Нам нужно отрисовать в логических координатах, но drawImage работает с пикселями канваса
        // Поэтому сбрасываем трансформацию для операции сдвига
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, width * dpr, height * dpr - dpr, 0, dpr, width * dpr, height * dpr - dpr);
        ctx.restore();

        // 2. Рисуем новую строку сверху
        const linePixelHeight = 1;
        const numBins = data.length;
        const binWidth = width / numBins;

        for (let i = 0; i < numBins; i++) {
            // Нормализуем значение дБ (-100...0) в 0...1
            const db = data[i];
            const normalized = Math.max(0, Math.min(1, (db + 100) / 100));

            // Цвет в зависимости от интенсивности (Jet colormap simulation)
            let r, g, b;

            if (normalized < 0.25) {
                // Blue to Cyan
                r = 0;
                g = Math.floor(4 * normalized * 255);
                b = 255;
            } else if (normalized < 0.5) {
                // Cyan to Green
                r = 0;
                g = 255;
                b = Math.floor((1 - 4 * (normalized - 0.25)) * 255);
            } else if (normalized < 0.75) {
                // Green to Yellow
                r = Math.floor(4 * (normalized - 0.5) * 255);
                g = 255;
                b = 0;
            } else {
                // Yellow to Red
                r = 255;
                g = Math.floor((1 - 4 * (normalized - 0.75)) * 255);
                b = 0;
            }

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(i * binWidth, 0, Math.ceil(binWidth), linePixelHeight);
        }

    }, [data, isDarkTheme, width, height]);

    useEffect(() => {
        drawWaterfall();
    }, [drawWaterfall]);

    return (
        <div className={`waterfall-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="waterfall-canvas"
            />
            <div className="waterfall-labels-x">
                <span>0</span>
                <span>{Math.round(sampleRate / 4)}</span>
                <span>{Math.round(sampleRate / 2)} Hz</span>
            </div>
        </div>
    );
}

WaterfallView.propTypes = {
    data: PropTypes.instanceOf(Float32Array),
    sampleRate: PropTypes.number,
    isDarkTheme: PropTypes.bool.isRequired,
    width: PropTypes.number,
    height: PropTypes.number
};

export default WaterfallView;
