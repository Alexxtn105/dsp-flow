import { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { setupCanvasDPR, drawFrequencyGrid, drawCursorLabel, getMouseFrequency } from '../_shared/canvasUtils';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './WaterfallView.css';

/**
 * Водопад (WaterFall) - спектрограмма во времени
 */
function WaterfallView({ data, sampleRate = 48000, width = 380, height = 200 }) {
    const { isDarkTheme } = useThemeContext();
    const canvasRef = useRef(null);
    const tempCanvasRef = useRef(null);
    const [colorMap, setColorMap] = useState('audition');
    const [isNormalized, setIsNormalized] = useState(false);
    const [showLegend, setShowLegend] = useState(true);
    const [mouseFreq, setMouseFreq] = useState(null);
    const [cursorX, setCursorX] = useState(null);

    // Initial buffer creation and resize logic
    useEffect(() => {
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = Math.floor(width * dpr);
        const targetHeight = Math.floor(height * dpr);

        if (!tempCanvasRef.current || tempCanvasRef.current.width !== targetWidth || tempCanvasRef.current.height !== targetHeight) {
            const oldCanvas = tempCanvasRef.current;
            const newCanvas = document.createElement('canvas');
            newCanvas.width = targetWidth;
            newCanvas.height = targetHeight;
            const newCtx = newCanvas.getContext('2d');

            newCtx.fillStyle = isDarkTheme ? '#000000' : '#ffffff';
            newCtx.fillRect(0, 0, targetWidth, targetHeight);

            if (oldCanvas) {
                newCtx.drawImage(oldCanvas, 0, 0, targetWidth, targetHeight);
            }
            tempCanvasRef.current = newCanvas;
        }
    }, [width, height, isDarkTheme]);

    const getColor = useCallback((normalized, mapType) => {
        let r, g, b;
        switch (mapType) {
            case 'audition':
                if (normalized < 0.2) {
                    r = Math.floor((normalized / 0.2) * 128); g = 0; b = Math.floor((normalized / 0.2) * 128);
                } else if (normalized < 0.4) {
                    r = Math.floor(128 + ((normalized - 0.2) / 0.2) * 127); g = 0; b = Math.floor(128 - ((normalized - 0.2) / 0.2) * 128);
                } else if (normalized < 0.6) {
                    r = 255; g = Math.floor(((normalized - 0.4) / 0.2) * 165); b = 0;
                } else if (normalized < 0.8) {
                    r = 255; g = Math.floor(165 + ((normalized - 0.6) / 0.2) * 90); b = 0;
                } else {
                    r = 255; g = 255; b = Math.floor(((normalized - 0.8) / 0.2) * 255);
                }
                break;
            default: {
                const v = Math.floor(normalized * 255);
                r = g = b = v;
                break;
            }
        }
        return `rgb(${r},${g},${b})`;
    }, []);

    const drawSceneRef = useRef(null);

    // Scene drawing function - draws Buffer + Overlays to main canvas
    const drawScene = useCallback(() => {
        const canvas = canvasRef.current;
        const tempCanvas = tempCanvasRef.current;
        if (!canvas || !tempCanvas) return;

        const ctx = setupCanvasDPR(canvas, width, height);

        // Clear BG
        ctx.fillStyle = isDarkTheme ? '#000000' : '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw Buffer (Waterfall history)
        ctx.drawImage(tempCanvas, 0, 0, width, height);

        // Draw Grid / Overlays
        ctx.strokeStyle = isDarkTheme ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
        ctx.fillStyle = isDarkTheme ? '#aaa' : '#555';
        ctx.font = '10px sans-serif';

        drawFrequencyGrid(ctx, width, height, sampleRate, isDarkTheme, {
            textBaseline: 'top',
            labelOffsetY: -22
        });

        // Draw Cursor
        if (cursorX !== null) {
            ctx.strokeStyle = isDarkTheme ? '#ffffff' : '#000000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cursorX, 0);
            ctx.lineTo(cursorX, height);
            ctx.stroke();

            if (mouseFreq !== null) {
                const label = `${Math.round(mouseFreq)} Hz`;
                ctx.font = '10px sans-serif';
                drawCursorLabel(ctx, label, cursorX, 10, width, isDarkTheme);
            }
        }
    }, [isDarkTheme, width, height, sampleRate, cursorX, mouseFreq]);

    drawSceneRef.current = drawScene;

    // 1. UPDATE BUFFER Only when new DATA arrives + call drawScene
    useEffect(() => {
        if (!data || data.length === 0 || !tempCanvasRef.current) {
            // Even if no data, we should render once to show the grid/bg
            drawScene();
            return;
        }

        const tempCanvas = tempCanvasRef.current;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = tempCanvas.width;

        // Shift existing content down by 1px (logical) -> dpr physical pixels
        const shiftY = Math.max(1, Math.floor(dpr));
        tempCtx.globalCompositeOperation = 'copy';
        tempCtx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, shiftY, tempCanvas.width, tempCanvas.height);
        tempCtx.globalCompositeOperation = 'source-over';

        // Draw new line at top
        const numBins = data.length;
        const binWidth = targetWidth / numBins;

        let minDb = -100;
        let maxDb = 0;
        if (isNormalized) {
            minDb = Infinity; maxDb = -Infinity;
            for (let i = 0; i < numBins; i++) {
                if (data[i] < minDb) minDb = data[i];
                if (data[i] > maxDb) maxDb = data[i];
            }
            if (maxDb === minDb) maxDb = minDb + 1;
        }

        for (let i = 0; i < numBins; i++) {
            const db = data[i];
            let normalized;
            if (isNormalized) normalized = (db - minDb) / (maxDb - minDb);
            else normalized = (db + 100) / 100;
            normalized = Math.max(0, Math.min(1, normalized));

            tempCtx.fillStyle = getColor(normalized, colorMap);
            tempCtx.fillRect(Math.floor(i * binWidth), 0, Math.ceil(binWidth), shiftY);
        }

        // Trigger scene drawing
        drawSceneRef.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, isNormalized, colorMap, getColor]);

    // Re-render on cursor changes when simulation is stopped
    useEffect(() => {
        drawScene();
    }, [cursorX, mouseFreq, isDarkTheme, width, height, drawScene]);

    const handleMouseMove = useCallback((e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clampedX = Math.max(0, Math.min(width, x));
        setCursorX(clampedX);
        setMouseFreq(getMouseFrequency(clampedX, width, sampleRate));
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
                    role="img"
                    aria-label="Спектрограмма (водопад)"
                />

                {showLegend && (
                    <div className="waterfall-legend-overlay">
                        <div className={`legend-gradient legend-gradient-${colorMap}`}></div>
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
    width: PropTypes.number,
    height: PropTypes.number
};

export default WaterfallView;
