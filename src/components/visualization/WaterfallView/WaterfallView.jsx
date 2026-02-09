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
    const [windowFunction, setWindowFunction] = useState('blackman-harris');
    const [isNormalized, setIsNormalized] = useState(false);
    const [showLegend, setShowLegend] = useState(true);
    const [mouseFreq, setMouseFreq] = useState(null);
    const [cursorX, setCursorX] = useState(null);

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
            default:
                // Grayscale fallback
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

        // 1. Настройка размеров
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }
        ctx.scale(dpr, dpr);

        // 2. Рисуем историю
        const shiftY = 1; // 1 logical pixel
        // Draw from tempCanvas (source is dpr sized)
        // Draw into context (scaled), so destination coords are logical
        // But drawImage with canvas source ignores context scale for source reading?
        // Actually, best to handle history manipulation in tempCanvas pixel space,
        // then render tempCanvas to main canvas.

        // Shift tempCanvas content down
        // We need to copy tempCanvas to itself shifted.
        // Create a buffer or draw self? Draw self works if source is same.
        // To avoid artifacts, better to have a snapshot.
        // Actually simplest:
        // 1. Draw new line on top of tempCanvas (at 0)
        // But we need to shift existent.
        // Copy existing tempCanvas to main canvas, shifted down.
        // Draw new line on main canvas at top.
        // Copy main canvas back to tempCanvas.

        // Work with tempCanvas directly (pixel space)
        tempCtx.globalCompositeOperation = 'copy';
        tempCtx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight, 0, shiftY * dpr, targetWidth, targetHeight);
        tempCtx.globalCompositeOperation = 'source-over';

        // 3. Draw new line at top of tempCanvas
        const numBins = data.length;
        const binWidth = targetWidth / numBins;

        let minDb = -100;
        let maxDb = 0;

        if (isNormalized) {
            minDb = Infinity;
            maxDb = -Infinity;
            for (let i = 0; i < numBins; i++) {
                if (data[i] < minDb) minDb = data[i];
                if (data[i] > maxDb) maxDb = data[i];
            }
            if (maxDb === minDb) maxDb = minDb + 1;
        }

        for (let i = 0; i < numBins; i++) {
            const db = data[i];
            let normalized;
            if (isNormalized) {
                normalized = (db - minDb) / (maxDb - minDb);
            } else {
                normalized = (db + 100) / 100;
            }
            normalized = Math.max(0, Math.min(1, normalized));
            tempCtx.fillStyle = getColor(normalized, colorMap);
            tempCtx.fillRect(Math.floor(i * binWidth), 0, Math.ceil(binWidth), shiftY * dpr);
        }

        // 4. Render tempCanvas to main canvas
        // Clear main first via fill
        ctx.fillStyle = isDarkTheme ? '#000000' : '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw tempCanvas (which is pixel-device sized) to logical sized canvas
        ctx.drawImage(tempCanvas, 0, 0, width, height);

        // 5. Draw Axis (Major/Minor ticks)
        ctx.strokeStyle = isDarkTheme ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
        ctx.fillStyle = isDarkTheme ? '#aaa' : '#555';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const maxFreq = sampleRate / 2;
        // Step 100Hz
        const pixelsPerHz = width / maxFreq;

        // Determine grid interval based on width
        // Try 100Hz, if too crowded, 500Hz, 1k, etc.
        let stepHz = 100;
        if (pixelsPerHz * 100 < 40) stepHz = 500;
        if (pixelsPerHz * 500 < 40) stepHz = 1000;
        if (pixelsPerHz * 1000 < 40) stepHz = 5000;

        // Minor ticks
        const minorStepHz = stepHz / 5;

        // Draw Ticks
        const drawTick = (freq, isMajor) => {
            if (freq > maxFreq) return;
            const x = (freq / maxFreq) * width;

            ctx.beginPath();
            ctx.moveTo(x, height);
            ctx.lineTo(x, height - (isMajor ? 10 : 5));
            ctx.stroke();

            if (isMajor) {
                let label = freq < 1000 ? `${freq}` : `${freq / 1000}k`;
                ctx.fillText(label, x, height - 22);
            }
        };

        for (let f = 0; f <= maxFreq; f += minorStepHz) {
            const isMajor = f % stepHz === 0;
            drawTick(f, isMajor);

            // Draw vertical grid line for major
            if (isMajor && f > 0) {
                const x = (f / maxFreq) * width;
                ctx.save();
                ctx.strokeStyle = isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
                ctx.restore();
            }
        }

        // 6. Draw Mouse Cursor
        if (cursorX !== null) {
            ctx.strokeStyle = isDarkTheme ? '#ffffff' : '#000000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cursorX, 0);
            ctx.lineTo(cursorX, height);
            ctx.stroke();

            // Draw Frequency Label
            if (mouseFreq !== null) {
                const label = `${Math.round(mouseFreq)} Hz`;
                const labelWidth = ctx.measureText(label).width + 8;
                let lx = cursorX + 5;
                if (lx + labelWidth > width) lx = cursorX - labelWidth - 5;

                ctx.fillStyle = isDarkTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
                ctx.fillRect(lx, 10, labelWidth, 16);

                ctx.fillStyle = isDarkTheme ? '#fff' : '#000';
                ctx.textAlign = 'left';
                ctx.fillText(label, lx + 4, 12);
            }
        }

    }, [data, isDarkTheme, width, height, colorMap, getColor, isNormalized, sampleRate, cursorX, mouseFreq]);

    useEffect(() => {
        drawWaterfall();
    }, [drawWaterfall]);

    const handleMouseMove = useCallback((e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        // Clamp x
        const clampedX = Math.max(0, Math.min(width, x));

        setCursorX(clampedX);
        const freq = (clampedX / width) * (sampleRate / 2);
        setMouseFreq(freq);
    }, [width, sampleRate]);

    const handleMouseLeave = useCallback(() => {
        setCursorX(null);
        setMouseFreq(null);
    }, []);

    return (
        <div className={`waterfall-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="viz-toolbar">
                <div className="viz-toolbar-group">
                    <select
                        value={windowFunction}
                        onChange={e => setWindowFunction(e.target.value)}
                        className="viz-select"
                        title="Оконная функция"
                    >
                        <option value="blackman-harris">Blackman-Harris</option>
                        <option value="hamming">Hamming</option>
                        <option value="rectangular">Rectangular</option>
                    </select>
                </div>
                <div className="viz-toolbar-group">
                    <select
                        value={colorMap}
                        onChange={(e) => setColorMap(e.target.value)}
                        className="viz-select"
                        title="Цветовая схема"
                    >
                        <option value="audition">Audition</option>
                        <option value="grayscale">Grayscale</option>
                    </select>
                    <label className="viz-checkbox">
                        <input
                            type="checkbox"
                            checked={isNormalized}
                            onChange={(e) => setIsNormalized(e.target.checked)}
                        />
                        Norm
                    </label>
                </div>
                <button
                    className={`viz-btn ${showLegend ? 'active' : ''}`}
                    onClick={() => setShowLegend(!showLegend)}
                    title="Легенда цветовой схемы"
                >
                    L
                </button>
            </div>

            <div className="waterfall-container">
                <canvas
                    ref={canvasRef}
                    style={{ width, height }}
                    className="waterfall-canvas"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                />

                {showLegend && (
                    <div className="waterfall-legend-overlay">
                        <div className="legend-gradient" style={{
                            background: colorMap === 'audition'
                                ? 'linear-gradient(to top, black, purple, red, orange, yellow, white)'
                                : 'linear-gradient(to top, black, white)'
                        }}></div>
                        <div className="legend-labels">
                            <span>0dB</span>
                            <span>-50</span>
                            <span>-100</span>
                        </div>
                    </div>
                )}
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
