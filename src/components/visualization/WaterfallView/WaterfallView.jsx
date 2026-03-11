import { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { setupCanvasDPR } from '../_shared/canvasUtils';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './WaterfallView.css';

const COLORS = {
    bg: '#1a1a2e',
    axisLine: 'rgba(255, 255, 255, 0.15)',
    axisText: '#7a8599',
    axisTextBright: '#99a8bf',
    gridMajor: 'rgba(255, 255, 255, 0.08)',
    crosshair: 'rgba(255, 255, 255, 0.5)',
    cursorBg: 'rgba(10, 10, 30, 0.92)',
    cursorBorder: 'rgba(255, 255, 255, 0.15)',
    cursorText: '#c8d6e5',
    waterfallBg: '#000000',
};

const AXIS_LEFT = 44;
const AXIS_BOTTOM = 28;
const LEGEND_W = 18;
const LEGEND_PAD = 6;
const MIN_VISIBLE_RANGE = 500;
const ZOOM_FACTOR = 0.8;
const FFT_SIZES = [128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];

function formatFreq(freq) {
    if (freq >= 1000) return `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}k`;
    return `${Math.round(freq)}`;
}

function calcFreqGridStep(plotWidth, visibleRange) {
    const targetSteps = Math.max(4, Math.floor(plotWidth / 80));
    const rawStep = visibleRange / targetSteps;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const r = rawStep / mag;
    if (r <= 1.5) return mag;
    if (r <= 3.5) return 2 * mag;
    if (r <= 7.5) return 5 * mag;
    return 10 * mag;
}

function getAuditionColor(normalized) {
    let r, g, b;
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
    return `rgb(${r},${g},${b})`;
}

function getGrayscaleColor(normalized) {
    const v = Math.floor(normalized * 255);
    return `rgb(${v},${v},${v})`;
}

function getInfernoColor(normalized) {
    let r, g, b;
    if (normalized < 0.25) {
        const t = normalized / 0.25;
        r = Math.floor(t * 90); g = 0; b = Math.floor(20 + t * 100);
    } else if (normalized < 0.5) {
        const t = (normalized - 0.25) / 0.25;
        r = Math.floor(90 + t * 140); g = Math.floor(t * 40); b = Math.floor(120 - t * 50);
    } else if (normalized < 0.75) {
        const t = (normalized - 0.5) / 0.25;
        r = Math.floor(230 + t * 25); g = Math.floor(40 + t * 130); b = Math.floor(70 - t * 70);
    } else {
        const t = (normalized - 0.75) / 0.25;
        r = 255; g = Math.floor(170 + t * 85); b = Math.floor(t * 80);
    }
    return `rgb(${r},${g},${b})`;
}

const COLOR_MAPS = {
    audition: getAuditionColor,
    inferno: getInfernoColor,
    grayscale: getGrayscaleColor,
};

/**
 * Водопад (спектрограмма) — профессиональный вид в стиле Adobe Audition
 */
function WaterfallView({ data, sampleRate = 48000, width = 380, height = 260, fftSize, onFftSizeChange }) {
    const { isDarkTheme } = useThemeContext();
    const canvasRef = useRef(null);
    const tempCanvasRef = useRef(null);
    const [colorMap, setColorMap] = useState('audition');
    const [isNormalized, setIsNormalized] = useState(false);

    // Frequency pan/zoom
    const [startFreq, setStartFreq] = useState(0);
    const [visibleRange, setVisibleRange] = useState(sampleRate / 2);
    const [minDb, setMinDb] = useState(-100);
    const maxDb = 0;

    // Cursor
    const [cursorX, setCursorX] = useState(null);
    const [cursorY, setCursorY] = useState(null);
    const [hoverFreq, setHoverFreq] = useState(null);

    // Измерение частотной полосы (выделение ЛКМ)
    const [measuring, setMeasuring] = useState(false);
    const [measureStartFreq, setMeasureStartFreq] = useState(null);
    const [measureEndFreq, setMeasureEndFreq] = useState(null);

    const nyquist = sampleRate / 2;
    const plotLeft = AXIS_LEFT;
    const plotW = width - plotLeft - LEGEND_W - LEGEND_PAD * 2;
    const plotH = height - AXIS_BOTTOM;
    const legendX = plotLeft + plotW + LEGEND_PAD;

    const endFreq = Math.min(startFreq + visibleRange, nyquist);
    const actualRange = endFreq - startFreq;

    // Clamp helper
    const clampFreqView = useCallback((newStart, newRange) => {
        const r = Math.max(MIN_VISIBLE_RANGE, Math.min(newRange, nyquist));
        const s = Math.max(0, Math.min(newStart, nyquist - r));
        setStartFreq(s);
        setVisibleRange(r);
    }, [nyquist]);

    useEffect(() => {
        setVisibleRange(prev => Math.min(prev, nyquist));
        setStartFreq(prev => Math.max(0, Math.min(prev, nyquist - MIN_VISIBLE_RANGE)));
    }, [nyquist]);

    // Temp buffer resize
    useEffect(() => {
        const dpr = window.devicePixelRatio || 1;
        const tw = Math.floor(plotW * dpr);
        const th = Math.floor(plotH * dpr);
        if (tw <= 0 || th <= 0) return;

        if (!tempCanvasRef.current || tempCanvasRef.current.width !== tw || tempCanvasRef.current.height !== th) {
            const oldCanvas = tempCanvasRef.current;
            const newCanvas = document.createElement('canvas');
            newCanvas.width = tw;
            newCanvas.height = th;
            const ctx = newCanvas.getContext('2d');
            ctx.fillStyle = COLORS.waterfallBg;
            ctx.fillRect(0, 0, tw, th);
            if (oldCanvas) {
                ctx.drawImage(oldCanvas, 0, 0, tw, th);
            }
            tempCanvasRef.current = newCanvas;
        }
    }, [plotW, plotH]);

    const getColor = useCallback((normalized, mapType) => {
        const fn = COLOR_MAPS[mapType] || getAuditionColor;
        return fn(Math.max(0, Math.min(1, normalized)));
    }, []);

    const drawSceneRef = useRef(null);

    const drawScene = useCallback(() => {
        const canvas = canvasRef.current;
        const tempCanvas = tempCanvasRef.current;
        if (!canvas || !tempCanvas) return;

        const ctx = setupCanvasDPR(canvas, width, height);
        const c = COLORS;

        // Background
        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, width, height);

        // Draw waterfall buffer into plot area
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, plotLeft, 0, plotW, plotH);

        // --- Frequency grid overlay ---
        const freqStep = calcFreqGridStep(plotW, actualRange);
        const gridStart = Math.ceil(startFreq / freqStep) * freqStep;
        ctx.save();
        ctx.globalAlpha = 0.4;
        for (let f = gridStart; f <= endFreq; f += freqStep) {
            if (f <= startFreq) continue;
            const x = plotLeft + ((f - startFreq) / actualRange) * plotW;
            ctx.strokeStyle = c.gridMajor;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, plotH);
            ctx.stroke();
        }
        ctx.restore();

        // --- Axes borders ---
        ctx.strokeStyle = c.axisLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plotLeft, 0);
        ctx.lineTo(plotLeft, plotH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(plotLeft, plotH);
        ctx.lineTo(plotLeft + plotW, plotH);
        ctx.stroke();

        // --- X-axis labels (frequency) ---
        ctx.font = '10px "Segoe UI", "SF Pro", sans-serif';
        ctx.fillStyle = c.axisText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let f = gridStart; f <= endFreq; f += freqStep) {
            const x = plotLeft + ((f - startFreq) / actualRange) * plotW;
            ctx.fillText(formatFreq(f), x, plotH + 4);
            ctx.strokeStyle = c.axisLine;
            ctx.beginPath();
            ctx.moveTo(x, plotH);
            ctx.lineTo(x, plotH + 3);
            ctx.stroke();
        }

        // X-axis title
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = c.axisTextBright;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('Гц', plotLeft + plotW - 2, plotH + 14);

        // Y-axis title (time arrow)
        ctx.save();
        ctx.translate(10, plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = c.axisTextBright;
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillText('Время \u2191', 0, 0);
        ctx.restore();

        // Y-axis time markers (relative)
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = c.axisText;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('сейчас', plotLeft - 4, 8);

        // --- Legend ---
        const legTop = 4;
        const legH = plotH - 8;
        const legW = LEGEND_W;

        // Gradient bar
        for (let py = 0; py < legH; py++) {
            const normalized = 1 - py / legH;
            ctx.fillStyle = getColor(normalized, colorMap);
            ctx.fillRect(legendX, legTop + py, legW, 1);
        }
        // Border
        ctx.strokeStyle = c.axisLine;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(legendX, legTop, legW, legH);

        // Legend labels
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = c.axisText;
        ctx.textAlign = 'left';
        const legLabelX = legendX + legW + 3;

        if (isNormalized) {
            ctx.textBaseline = 'top';
            ctx.fillText('1.0', legLabelX, legTop);
            ctx.textBaseline = 'middle';
            ctx.fillText('0.5', legLabelX, legTop + legH / 2);
            ctx.textBaseline = 'bottom';
            ctx.fillText('0.0', legLabelX, legTop + legH);
        } else {
            ctx.textBaseline = 'top';
            ctx.fillText(`${maxDb}`, legLabelX, legTop);
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.round((maxDb + minDb) / 2)}`, legLabelX, legTop + legH / 2);
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${minDb}`, legLabelX, legTop + legH);
        }

        // --- Frequency band measurement overlay ---
        if (measureStartFreq !== null && measureEndFreq !== null) {
            const f0 = Math.min(measureStartFreq, measureEndFreq);
            const f1 = Math.max(measureStartFreq, measureEndFreq);
            const x0 = plotLeft + ((f0 - startFreq) / actualRange) * plotW;
            const x1 = plotLeft + ((f1 - startFreq) / actualRange) * plotW;

            ctx.fillStyle = 'rgba(0, 191, 255, 0.15)';
            ctx.fillRect(x0, 0, x1 - x0, plotH);

            ctx.strokeStyle = 'rgba(0, 191, 255, 0.7)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(x0, 0); ctx.lineTo(x0, plotH);
            ctx.moveTo(x1, 0); ctx.lineTo(x1, plotH);
            ctx.stroke();
            ctx.setLineDash([]);

            const deltaFreq = f1 - f0;
            if (deltaFreq > 0) {
                const label = `\u0394: ${Math.round(f0)} \u2013 ${Math.round(f1)} Гц | ${Math.round(deltaFreq)} Гц`;
                ctx.font = '10px "Segoe UI Mono", "SF Mono", "Consolas", monospace';
                const textW = ctx.measureText(label).width + 14;
                const boxH = 20;

                let bx = (x0 + x1) / 2 - textW / 2;
                if (bx < plotLeft) bx = plotLeft + 2;
                if (bx + textW > plotLeft + plotW) bx = plotLeft + plotW - textW - 2;
                const by = 6;

                ctx.fillStyle = 'rgba(0, 30, 60, 0.92)';
                ctx.strokeStyle = 'rgba(0, 191, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(bx, by, textW, boxH, 3); else ctx.rect(bx, by, textW, boxH);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#7ad4ff';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, bx + 7, by + boxH / 2);

                const arrowY = by + boxH + 6;
                if (x1 - x0 > 20) {
                    ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x0, arrowY); ctx.lineTo(x1, arrowY);
                    ctx.moveTo(x0 + 5, arrowY - 3); ctx.lineTo(x0, arrowY); ctx.lineTo(x0 + 5, arrowY + 3);
                    ctx.moveTo(x1 - 5, arrowY - 3); ctx.lineTo(x1, arrowY); ctx.lineTo(x1 - 5, arrowY + 3);
                    ctx.stroke();
                }
            }
        }

        // --- Cursor ---
        if (cursorX !== null && cursorY !== null &&
            cursorX >= plotLeft && cursorX <= plotLeft + plotW &&
            cursorY >= 0 && cursorY <= plotH) {

            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = c.crosshair;
            ctx.lineWidth = 0.8;

            ctx.beginPath();
            ctx.moveTo(cursorX, 0);
            ctx.lineTo(cursorX, plotH);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(plotLeft, cursorY);
            ctx.lineTo(plotLeft + plotW, cursorY);
            ctx.stroke();
            ctx.setLineDash([]);

            if (hoverFreq !== null) {
                const label = `${Math.round(hoverFreq)} Гц`;
                ctx.font = '10px "Segoe UI Mono", "SF Mono", "Consolas", monospace';
                const textW = ctx.measureText(label).width + 12;
                const boxH = 20;

                let tx = cursorX + 10;
                let ty = cursorY - boxH - 6;
                if (tx + textW > plotLeft + plotW) tx = cursorX - textW - 10;
                if (ty < 0) ty = cursorY + 10;

                ctx.fillStyle = c.cursorBg;
                ctx.strokeStyle = c.cursorBorder;
                ctx.lineWidth = 1;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(tx, ty, textW, boxH, 3); else ctx.rect(tx, ty, textW, boxH);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = c.cursorText;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, tx + 6, ty + boxH / 2);
            }

            ctx.restore();
        }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height, sampleRate, startFreq, visibleRange, minDb, plotLeft, plotW, plotH, legendX,
        colorMap, isNormalized, getColor, cursorX, cursorY, hoverFreq, isDarkTheme, actualRange, endFreq,
        measureStartFreq, measureEndFreq]);

    drawSceneRef.current = drawScene;

    // Update buffer on new data
    useEffect(() => {
        if (!data || data.length === 0 || !tempCanvasRef.current) {
            drawScene();
            return;
        }

        const tempCanvas = tempCanvasRef.current;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        const dpr = window.devicePixelRatio || 1;
        const tw = tempCanvas.width;

        // Shift down
        const shiftY = Math.max(1, Math.floor(dpr));
        tempCtx.globalCompositeOperation = 'copy';
        tempCtx.drawImage(tempCanvas, 0, 0, tw, tempCanvas.height, 0, shiftY, tw, tempCanvas.height);
        tempCtx.globalCompositeOperation = 'source-over';

        // Draw new line — only bins in visible frequency range
        const numBins = data.length;
        const binFreqStep = nyquist / numBins;
        const minBinIndex = Math.max(0, Math.floor(startFreq / binFreqStep));
        const maxBinIndex = Math.min(numBins - 1, Math.ceil(endFreq / binFreqStep));
        const visibleBinCount = maxBinIndex - minBinIndex + 1;
        const pixelsPerBin = tw / visibleBinCount;

        let localMin = minDb;
        let localMax = maxDb;
        if (isNormalized) {
            localMin = Infinity; localMax = -Infinity;
            for (let i = minBinIndex; i <= maxBinIndex; i++) {
                if (data[i] < localMin) localMin = data[i];
                if (data[i] > localMax) localMax = data[i];
            }
            if (localMax === localMin) localMax = localMin + 1;
        }
        const range = localMax - localMin;

        for (let i = minBinIndex; i <= maxBinIndex; i++) {
            const db = data[i];
            let normalized;
            if (isNormalized) normalized = (db - localMin) / range;
            else normalized = (db - minDb) / (maxDb - minDb);
            normalized = Math.max(0, Math.min(1, normalized));

            const x = Math.floor((i - minBinIndex) * pixelsPerBin);
            const w = Math.ceil(pixelsPerBin);
            tempCtx.fillStyle = getColor(normalized, colorMap);
            tempCtx.fillRect(x, 0, w, shiftY);
        }

        drawSceneRef.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, isNormalized, colorMap, getColor, startFreq, visibleRange, minDb]);

    // Re-render on overlay changes
    useEffect(() => {
        drawScene();
    }, [drawScene]);

    const handleMouseMove = useCallback((e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCursorX(x);
        setCursorY(y);
        const fx = (x - plotLeft) / plotW;
        const freq = Math.max(0, Math.min(startFreq + actualRange, startFreq + fx * actualRange));
        setHoverFreq(freq);

        if (measuring) {
            setMeasureEndFreq(freq);
        }
    }, [plotLeft, plotW, startFreq, actualRange, measuring]);

    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return;
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const fx = (x - plotLeft) / plotW;
        const freq = Math.max(0, Math.min(startFreq + actualRange, startFreq + fx * actualRange));

        if (x >= plotLeft && x <= plotLeft + plotW) {
            setMeasuring(true);
            setMeasureStartFreq(freq);
            setMeasureEndFreq(freq);
        }
    }, [plotLeft, plotW, startFreq, actualRange]);

    const handleMouseUp = useCallback(() => {
        if (measuring) {
            setMeasuring(false);
            if (measureStartFreq !== null && measureEndFreq !== null &&
                Math.abs(measureEndFreq - measureStartFreq) < 1) {
                setMeasureStartFreq(null);
                setMeasureEndFreq(null);
            }
        }
    }, [measuring, measureStartFreq, measureEndFreq]);

    const handleMouseLeave = useCallback(() => {
        setCursorX(null);
        setCursorY(null);
        if (measuring) {
            setMeasuring(false);
        }
    }, [measuring]);

    // Wheel zoom centered on cursor
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const fx = (mouseX - plotLeft) / plotW;
        const freqAtCursor = startFreq + fx * actualRange;

        const zoomIn = e.deltaY > 0;
        const factor = zoomIn ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
        const newRange = Math.max(MIN_VISIBLE_RANGE, Math.min(actualRange * factor, nyquist));

        const newStart = freqAtCursor - fx * newRange;
        clampFreqView(newStart, newRange);
    }, [plotLeft, plotW, startFreq, actualRange, nyquist, clampFreqView]);

    // Attach wheel handler with passive: false
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    const handleZoomSlider = useCallback((e) => {
        const pct = parseInt(e.target.value) / 100;
        const newRange = Math.max(MIN_VISIBLE_RANGE, pct * nyquist);
        clampFreqView(startFreq, newRange);
    }, [nyquist, startFreq, clampFreqView]);

    const handlePanSlider = useCallback((e) => {
        const newStart = parseInt(e.target.value);
        clampFreqView(newStart, visibleRange);
    }, [visibleRange, clampFreqView]);

    const handleDbSlider = useCallback((e) => {
        setMinDb(parseInt(e.target.value));
    }, []);

    const handleDbInput = useCallback((e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= -160 && val < 0) setMinDb(val);
    }, []);

    const zoomSliderValue = Math.round((visibleRange / nyquist) * 100);
    const maxPan = Math.max(0, nyquist - visibleRange);

    return (
        <div className={`waterfall-view audition-theme ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="wf-toolbar">
                <div className="wf-toolbar-section">
                    <select
                        value={colorMap}
                        onChange={(e) => setColorMap(e.target.value)}
                        className="wf-select"
                        title="Цветовая схема"
                    >
                        <option value="audition">Audition</option>
                        <option value="inferno">Inferno</option>
                        <option value="grayscale">Grayscale</option>
                    </select>
                    <button
                        className={`wf-btn ${isNormalized ? 'active' : ''}`}
                        onClick={() => setIsNormalized(!isNormalized)}
                        title="Нормализация по кадру"
                    >
                        NORM
                    </button>
                </div>

                {fftSize !== undefined && onFftSizeChange && (
                    <>
                        <div className="wf-toolbar-divider" />
                        <div className="wf-toolbar-section">
                            <span className="wf-label">FFT</span>
                            <select
                                className="wf-select"
                                value={fftSize}
                                onChange={(e) => onFftSizeChange(parseInt(e.target.value))}
                                title="Размер FFT"
                            >
                                {FFT_SIZES.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                <div className="wf-toolbar-divider" />

                {/* Zoom */}
                <div className="wf-toolbar-section">
                    <span className="wf-label">Масштаб</span>
                    <input
                        type="range"
                        className="wf-slider"
                        min="2"
                        max="100"
                        value={zoomSliderValue}
                        onChange={handleZoomSlider}
                        title="Масштаб по частоте (или колесико мыши)"
                    />
                </div>

                {/* Pan */}
                {visibleRange < nyquist && (
                    <div className="wf-toolbar-section">
                        <span className="wf-label">Сдвиг</span>
                        <input
                            type="range"
                            className="wf-slider"
                            min="0"
                            max={maxPan}
                            step={Math.max(1, Math.round(maxPan / 200))}
                            value={Math.round(startFreq)}
                            onChange={handlePanSlider}
                            title="Прокрутка по частоте"
                        />
                    </div>
                )}

                <div className="wf-toolbar-divider" />

                <div className="wf-toolbar-section">
                    <span className="wf-label">Уровень</span>
                    <input
                        type="range"
                        className="wf-slider wf-slider-short"
                        min="-160"
                        max="-20"
                        value={minDb}
                        onChange={handleDbSlider}
                        title="Мин. уровень"
                    />
                    <input
                        type="number"
                        className="wf-input wf-input-narrow"
                        value={minDb}
                        onChange={handleDbInput}
                        min="-160"
                        max="-20"
                        step="10"
                        title="Мин. уровень (дБ)"
                    />
                    <span className="wf-unit">дБ</span>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="wf-canvas"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                role="img"
                aria-label="Спектрограмма (водопад)"
            />
        </div>
    );
}

WaterfallView.propTypes = {
    data: PropTypes.instanceOf(Float32Array),
    sampleRate: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    fftSize: PropTypes.number,
    onFftSizeChange: PropTypes.func,
};

export default WaterfallView;
