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
    const [isNormalized, setIsNormalized] = useState(false); // Checkbox for normalization

    // Управление размером временного канваса с сохранением содержимого
    useEffect(() => {
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = width * dpr;
        const targetHeight = height * dpr;

        if (!tempCanvasRef.current) {
            // Инициализация
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = isDarkTheme ? '#000000' : '#ffffff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            tempCanvasRef.current = canvas;
        } else {
            // Ресайз с сохранением
            const oldCanvas = tempCanvasRef.current;
            if (oldCanvas.width !== targetWidth || oldCanvas.height !== targetHeight) {
                const newCanvas = document.createElement('canvas');
                newCanvas.width = targetWidth;
                newCanvas.height = targetHeight;
                const newCtx = newCanvas.getContext('2d');

                // Заливаем фон
                newCtx.fillStyle = isDarkTheme ? '#000000' : '#ffffff';
                newCtx.fillRect(0, 0, targetWidth, targetHeight);

                // Рисуем старое изображение растянутым
                newCtx.drawImage(oldCanvas, 0, 0, targetWidth, targetHeight);

                tempCanvasRef.current = newCanvas;
            }
        }
    }, [width, height, isDarkTheme]);

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
        const targetWidth = width * dpr;
        const targetHeight = height * dpr;

        // 1. Настройка размеров основного канваса
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            // После ресайза канвас очищается, это нормально, 
            // мы восстановим изображение из tempCanvas на следующем шаге
        }

        // 2. Рисуем историю из tempCanvas на основной канвас со сдвигом вниз
        // Сдвигаем на 1 реальный пиксель (dpr) или больше для скорости
        const shiftY = dpr;

        // Рисуем всё изображение из tempCanvas в основной canvas, сдвинув вниз
        // tempCanvas уже имеет правильный размер (благодаря useEffect)
        ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight, 0, shiftY, targetWidth, targetHeight);

        // 3. Рисуем новую строку сверху (высотой shiftY)
        const numBins = data.length;
        const binWidth = targetWidth / numBins;

        // Find min/max for normalization if enabled
        let minDb = -100; // Default floor
        let maxDb = 0;    // Default ceil

        if (isNormalized) {
            minDb = Infinity;
            maxDb = -Infinity;
            for (let i = 0; i < numBins; i++) {
                if (data[i] < minDb) minDb = data[i];
                if (data[i] > maxDb) maxDb = data[i];
            }
            // Avoid division by zero
            if (maxDb === minDb) maxDb = minDb + 1;
        }

        for (let i = 0; i < numBins; i++) {
            const db = data[i];
            let normalized;

            if (isNormalized) {
                normalized = (db - minDb) / (maxDb - minDb);
            } else {
                // Fixed range logic (-100dB to 0dB)
                normalized = (db + 100) / 100;
            }

            normalized = Math.max(0, Math.min(1, normalized));

            ctx.fillStyle = getColor(normalized, colorMap);
            // Рисуем прямоугольник с перекрытием чтобы не было щелей
            ctx.fillRect(Math.floor(i * binWidth), 0, Math.ceil(binWidth), shiftY);
        }

        // 4. Обновляем tempCanvas актуальным состоянием
        tempCtx.drawImage(canvas, 0, 0);

    }, [data, isDarkTheme, width, height, colorMap, getColor, isNormalized]);

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
                <label className="waterfall-checkbox">
                    <input
                        type="checkbox"
                        checked={isNormalized}
                        onChange={(e) => setIsNormalized(e.target.checked)}
                    />
                    Norm.
                </label>
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
