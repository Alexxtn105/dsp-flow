import { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import './WaterfallView.css';

/**
 * Водопад (WaterFall) - спектрограмма во времени
 */
function WaterfallView({ data, sampleRate = 48000, isDarkTheme, width = 380, height = 200 }) {
    const canvasRef = useRef(null);
    const tempCanvasRef = useRef(null);
    const [colorMap, setColorMap] = useState('audition'); // Default to Adobe Audition style

    // Инициализация временного канваса для хранения истории
    useEffect(() => {
        if (!tempCanvasRef.current) {
            tempCanvasRef.current = document.createElement('canvas');
            tempCanvasRef.current.width = width;
            tempCanvasRef.current.height = height;
        }
    }, [width, height]);

    // Функция получения цвета в зависимости от значения и карты
    const getColor = useCallback((normalized, mapType) => {
        let r, g, b;

        switch (mapType) {
            case 'audition':
                // Adobe Audition style: Black -> Purple -> Red -> Orange -> Yellow -> White
                if (normalized < 0.2) {
                    // Black to Purple (20%)
                    r = Math.floor((normalized / 0.2) * 128);
                    g = 0;
                    b = Math.floor((normalized / 0.2) * 128);
                } else if (normalized < 0.4) {
                    // Purple to Red (20%)
                    r = Math.floor(128 + ((normalized - 0.2) / 0.2) * 127);
                    g = 0;
                    b = Math.floor(128 - ((normalized - 0.2) / 0.2) * 128);
                } else if (normalized < 0.6) {
                    // Red to Orange (20%)
                    r = 255;
                    g = Math.floor(((normalized - 0.4) / 0.2) * 165);
                    b = 0;
                } else if (normalized < 0.8) {
                    // Orange to Yellow (20%)
                    r = 255;
                    g = Math.floor(165 + ((normalized - 0.6) / 0.2) * 90);
                    b = 0;
                } else {
                    // Yellow to White (20%)
                    r = 255;
                    g = 255;
                    b = Math.floor(((normalized - 0.8) / 0.2) * 255);
                }
                break;

            case 'jet':
                // Jet: Blue -> Cyan -> Green -> Yellow -> Red
                if (normalized < 0.25) {
                    r = 0;
                    g = Math.floor(4 * normalized * 255);
                    b = 255;
                } else if (normalized < 0.5) {
                    r = 0;
                    g = 255;
                    b = Math.floor((1 - 4 * (normalized - 0.25)) * 255);
                } else if (normalized < 0.75) {
                    r = Math.floor(4 * (normalized - 0.5) * 255);
                    g = 255;
                    b = 0;
                } else {
                    r = 255;
                    g = Math.floor((1 - 4 * (normalized - 0.75)) * 255);
                    b = 0;
                }
                break;

            case 'hot':
                // Hot: Black -> Red -> Yellow -> White
                if (normalized < 0.33) {
                    r = Math.floor((normalized / 0.33) * 255);
                    g = 0;
                    b = 0;
                } else if (normalized < 0.66) {
                    r = 255;
                    g = Math.floor(((normalized - 0.33) / 0.33) * 255);
                    b = 0;
                } else {
                    r = 255;
                    g = 255;
                    b = Math.floor(((normalized - 0.66) / 0.34) * 255);
                }
                break;

            case 'grayscale':
                // Black -> White
                const val = Math.floor(normalized * 255);
                r = g = b = val;
                break;

            default:
                // Fallback to Grayscale
                const v = Math.floor(normalized * 255);
                r = g = b = v;
        }

        return `rgb(${r},${g},${b})`;
    }, []);

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
            ctx.fillStyle = isDarkTheme ? '#000000' : '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }

        // 1. Сдвигаем старое изображение вниз на 1 пиксель
        // Копируем текущий канвас во временный
        tempCtx.drawImage(canvas, 0, 0, width * dpr, height * dpr);

        // Рисуем обратно со сдвигом вниз
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

            ctx.fillStyle = getColor(normalized, colorMap);
            ctx.fillRect(i * binWidth, 0, Math.ceil(binWidth), linePixelHeight);
        }

    }, [data, isDarkTheme, width, height, colorMap, getColor]);

    useEffect(() => {
        drawWaterfall();
    }, [drawWaterfall]);

    return (
        <div className={`waterfall-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="waterfall-controls">
                <select
                    value={colorMap}
                    onChange={(e) => setColorMap(e.target.value)}
                    className="waterfall-select"
                >
                    <option value="audition">Audition</option>
                    <option value="jet">Jet</option>
                    <option value="hot">Hot</option>
                    <option value="grayscale">Grayscale</option>
                </select>
            </div>
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
