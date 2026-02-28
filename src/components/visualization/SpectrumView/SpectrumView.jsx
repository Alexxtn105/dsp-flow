import { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { setupCanvasDPR } from '../_shared/canvasUtils';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './SpectrumView.css';

// Audition-style color palette
const AUDITION_COLORS = {
    bg: '#1a1a2e',
    gridMajor: 'rgba(255, 255, 255, 0.08)',
    gridMinor: 'rgba(255, 255, 255, 0.03)',
    axisLine: 'rgba(255, 255, 255, 0.15)',
    axisText: '#7a8599',
    axisTextBright: '#99a8bf',
    signal: '#00e5a0',
    signalGlow: 'rgba(0, 229, 160, 0.15)',
    accent: '#ff8c00',
    accentGlow: 'rgba(255, 140, 0, 0.1)',
    crosshair: 'rgba(255, 255, 255, 0.4)',
    cursorBg: 'rgba(10, 10, 30, 0.92)',
    cursorBorder: 'rgba(255, 255, 255, 0.15)',
    cursorText: '#c8d6e5',
    peakMarker: '#ff5555',
};

const AXIS_LEFT = 44;
const AXIS_BOTTOM = 28;
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
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;
    let niceStep;
    if (residual <= 1.5) niceStep = magnitude;
    else if (residual <= 3.5) niceStep = 2 * magnitude;
    else if (residual <= 7.5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;
    return niceStep;
}

function calcDbGridStep(plotHeight, dbRange) {
    const targetSteps = Math.max(3, Math.floor(plotHeight / 50));
    const rawStep = Math.abs(dbRange) / targetSteps;
    if (rawStep <= 5) return 5;
    if (rawStep <= 10) return 10;
    if (rawStep <= 20) return 20;
    return 30;
}

/**
 * Спектроанализатор — профессиональный вид в стиле Adobe Audition
 */
function SpectrumView({ data, sampleRate = 48000, width = 380, height = 260, fftSize, onFftSizeChange }) {
    const { isDarkTheme } = useThemeContext();
    const canvasRef = useRef(null);
    const [accumulate, setAccumulate] = useState(false);
    const [accumulatedData, setAccumulatedData] = useState(null);

    // Frequency pan/zoom state
    const [startFreq, setStartFreq] = useState(0);
    const [visibleRange, setVisibleRange] = useState(sampleRate / 2);
    const [minDb, setMinDb] = useState(-100);
    const maxDb = 0;

    // Mouse tracking
    const [cursorX, setCursorX] = useState(null);
    const [cursorY, setCursorY] = useState(null);
    const [hoverFreq, setHoverFreq] = useState(null);
    const [hoverDb, setHoverDb] = useState(null);

    // Peak detection
    const [showPeak, setShowPeak] = useState(true);

    useEffect(() => {
        if (!accumulate) setAccumulatedData(null);
    }, [accumulate]);

    useEffect(() => {
        if (!data || !accumulate) return;
        setAccumulatedData(prev => {
            if (!prev) return Float32Array.from(data);
            const next = new Float32Array(prev.length);
            for (let i = 0; i < prev.length; i++) {
                next[i] = Math.max(prev[i], data[i] || -200);
            }
            return next;
        });
    }, [data, accumulate]);

    const nyquist = sampleRate / 2;

    // Clamp when sampleRate changes
    useEffect(() => {
        setVisibleRange(prev => Math.min(prev, nyquist));
        setStartFreq(prev => Math.max(0, Math.min(prev, nyquist - MIN_VISIBLE_RANGE)));
    }, [nyquist]);

    const endFreq = Math.min(startFreq + visibleRange, nyquist);
    const actualRange = endFreq - startFreq;

    const plotWidth = width - AXIS_LEFT;
    const plotHeight = height - AXIS_BOTTOM;
    const dbRange = maxDb - minDb;

    // Clamp helper
    const clampFreqView = useCallback((newStart, newRange) => {
        const r = Math.max(MIN_VISIBLE_RANGE, Math.min(newRange, nyquist));
        const s = Math.max(0, Math.min(newStart, nyquist - r));
        setStartFreq(s);
        setVisibleRange(r);
    }, [nyquist]);

    const drawSpectrum = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = setupCanvasDPR(canvas, width, height);
        const c = AUDITION_COLORS;

        // Background
        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, width, height);

        // Plot area
        const px = AXIS_LEFT;
        const py = 0;
        const pw = plotWidth;
        const ph = plotHeight;

        // --- Grid ---
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, pw, ph);
        ctx.clip();

        // Horizontal dB grid
        const dbStep = calcDbGridStep(ph, dbRange);
        ctx.font = '10px "Segoe UI", "SF Pro", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';

        for (let db = maxDb; db >= minDb; db -= dbStep) {
            const y = py + ph - ((db - minDb) / dbRange) * ph;
            const isMajor = db % (dbStep * 2) === 0 || db === 0;

            ctx.strokeStyle = isMajor ? c.gridMajor : c.gridMinor;
            ctx.lineWidth = isMajor ? 0.8 : 0.5;
            ctx.beginPath();
            ctx.moveTo(px, y);
            ctx.lineTo(px + pw, y);
            ctx.stroke();
        }

        // Vertical frequency grid
        const freqStep = calcFreqGridStep(pw, actualRange);
        const gridStart = Math.ceil(startFreq / freqStep) * freqStep;
        for (let f = gridStart; f <= endFreq; f += freqStep) {
            const x = px + ((f - startFreq) / actualRange) * pw;
            const isMajor = f % (freqStep * 2) === 0 || f === 0;

            ctx.strokeStyle = isMajor ? c.gridMajor : c.gridMinor;
            ctx.lineWidth = isMajor ? 0.8 : 0.5;
            ctx.beginPath();
            ctx.moveTo(x, py);
            ctx.lineTo(x, py + ph);
            ctx.stroke();
        }

        ctx.restore();

        // --- Spectrum data ---
        const drawLine = (pData, color, fillColor) => {
            if (!pData || pData.length === 0) return;

            const binCount = pData.length;
            const binFreqStep = nyquist / binCount;
            const minBinIndex = Math.max(0, Math.floor(startFreq / binFreqStep));
            const maxBinIndex = Math.min(binCount - 1, Math.ceil(endFreq / binFreqStep));

            // Build path
            ctx.save();
            ctx.beginPath();
            ctx.rect(px, py, pw, ph);
            ctx.clip();

            ctx.beginPath();
            let firstX, started = false;
            for (let i = minBinIndex; i <= maxBinIndex; i++) {
                const freq = i * binFreqStep;
                const x = px + ((freq - startFreq) / actualRange) * pw;
                const db = Math.max(minDb, Math.min(maxDb, pData[i]));
                const y = py + ph - ((db - minDb) / dbRange) * ph;

                if (!started) {
                    ctx.moveTo(x, y);
                    firstX = x;
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }

            // Gradient fill
            if (fillColor && started) {
                const lastFreq = maxBinIndex * binFreqStep;
                const lastX = px + ((lastFreq - startFreq) / actualRange) * pw;
                ctx.lineTo(lastX, py + ph);
                ctx.lineTo(firstX, py + ph);
                ctx.closePath();

                const grad = ctx.createLinearGradient(0, py, 0, py + ph);
                grad.addColorStop(0, fillColor);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fill();

                // Redraw the line on top
                ctx.beginPath();
                for (let i = minBinIndex; i <= maxBinIndex; i++) {
                    const freq = i * binFreqStep;
                    const x = px + ((freq - startFreq) / actualRange) * pw;
                    const db = Math.max(minDb, Math.min(maxDb, pData[i]));
                    const y = py + ph - ((db - minDb) / dbRange) * ph;
                    if (i === minBinIndex) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
            }

            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
        };

        // Accumulated (Max Hold)
        if (accumulate && accumulatedData) {
            drawLine(accumulatedData, c.accent, c.accentGlow);
        }

        // Current spectrum
        if (data) {
            drawLine(data, c.signal, c.signalGlow);
        }

        // --- Peak marker ---
        if (showPeak && data && data.length > 0) {
            const binFreqStep = nyquist / data.length;
            const minBinPeak = Math.max(1, Math.floor(startFreq / binFreqStep));
            const maxBinPeak = Math.min(data.length - 1, Math.ceil(endFreq / binFreqStep));
            let peakIdx = minBinPeak;
            let peakVal = -Infinity;
            for (let i = minBinPeak; i <= maxBinPeak; i++) {
                if (data[i] > peakVal) {
                    peakVal = data[i];
                    peakIdx = i;
                }
            }
            if (peakVal > minDb) {
                const peakFreq = peakIdx * binFreqStep;
                const peakX = px + ((peakFreq - startFreq) / actualRange) * pw;
                const peakY = py + ph - ((peakVal - minDb) / dbRange) * ph;

                ctx.save();
                ctx.beginPath();
                ctx.rect(px, py, pw, ph);
                ctx.clip();

                // Triangle marker
                ctx.fillStyle = c.peakMarker;
                ctx.beginPath();
                ctx.moveTo(peakX, peakY - 6);
                ctx.lineTo(peakX - 4, peakY - 12);
                ctx.lineTo(peakX + 4, peakY - 12);
                ctx.closePath();
                ctx.fill();

                // Peak label — частота в Гц
                ctx.font = '9px "Segoe UI", sans-serif';
                ctx.fillStyle = c.peakMarker;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                const peakLabel = `${Math.round(peakFreq)} Гц  ${peakVal.toFixed(1)} дБ`;
                ctx.fillText(peakLabel, peakX, peakY - 13);

                ctx.restore();
            }
        }

        // --- Axes ---
        // Left axis border
        ctx.strokeStyle = c.axisLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + ph);
        ctx.stroke();

        // Bottom axis border
        ctx.beginPath();
        ctx.moveTo(px, py + ph);
        ctx.lineTo(px + pw, py + ph);
        ctx.stroke();

        // dB labels (Y axis)
        ctx.font = '10px "Segoe UI", "SF Pro", sans-serif';
        ctx.fillStyle = c.axisText;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';

        for (let db = maxDb; db >= minDb; db -= dbStep) {
            const y = py + ph - ((db - minDb) / dbRange) * ph;
            ctx.fillText(`${db}`, px - 4, y);

            // Tick mark
            ctx.strokeStyle = c.axisLine;
            ctx.beginPath();
            ctx.moveTo(px - 3, y);
            ctx.lineTo(px, y);
            ctx.stroke();
        }

        // Frequency labels (X axis)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = c.axisText;

        for (let f = gridStart; f <= endFreq; f += freqStep) {
            const x = px + ((f - startFreq) / actualRange) * pw;
            ctx.fillText(formatFreq(f), x, py + ph + 4);

            // Tick mark
            ctx.strokeStyle = c.axisLine;
            ctx.beginPath();
            ctx.moveTo(x, py + ph);
            ctx.lineTo(x, py + ph + 3);
            ctx.stroke();
        }

        // Axis titles
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = c.axisTextBright;

        // Y-axis title
        ctx.save();
        ctx.translate(10, py + ph / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('дБ', 0, 0);
        ctx.restore();

        // X-axis title
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('Гц', px + pw - 2, py + ph + 14);

        // --- Crosshair & cursor ---
        if (cursorX !== null && cursorY !== null &&
            cursorX >= px && cursorX <= px + pw &&
            cursorY >= py && cursorY <= py + ph) {

            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = c.crosshair;
            ctx.lineWidth = 0.8;

            // Vertical
            ctx.beginPath();
            ctx.moveTo(cursorX, py);
            ctx.lineTo(cursorX, py + ph);
            ctx.stroke();

            // Horizontal
            ctx.beginPath();
            ctx.moveTo(px, cursorY);
            ctx.lineTo(px + pw, cursorY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Cursor label
            if (hoverFreq !== null && hoverDb !== null) {
                const label = `${Math.round(hoverFreq)} Гц  ${hoverDb.toFixed(1)} дБ`;
                ctx.font = '10px "Segoe UI Mono", "SF Mono", "Consolas", monospace';
                const textW = ctx.measureText(label).width + 12;
                const boxH = 20;

                let tx = cursorX + 10;
                let ty = cursorY - boxH - 6;
                if (tx + textW > px + pw) tx = cursorX - textW - 10;
                if (ty < py) ty = cursorY + 10;

                // Background
                ctx.fillStyle = c.cursorBg;
                ctx.strokeStyle = c.cursorBorder;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(tx, ty, textW, boxH, 3);
                ctx.fill();
                ctx.stroke();

                // Text
                ctx.fillStyle = c.cursorText;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, tx + 6, ty + boxH / 2);
            }

            ctx.restore();
        }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, accumulatedData, accumulate, sampleRate, isDarkTheme, width, height,
        cursorX, cursorY, hoverFreq, hoverDb, startFreq, visibleRange, minDb, showPeak,
        plotWidth, plotHeight, dbRange, nyquist, actualRange, endFreq]);

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

        // Map to freq/dB within plot area
        const fx = (x - AXIS_LEFT) / plotWidth;
        const fy = 1 - (y / plotHeight);

        setHoverFreq(Math.max(0, startFreq + fx * actualRange));
        setHoverDb(minDb + fy * dbRange);
    }, [plotWidth, plotHeight, startFreq, actualRange, minDb, dbRange]);

    const handleMouseLeave = useCallback(() => {
        setCursorX(null);
        setCursorY(null);
    }, []);

    // Wheel zoom centered on cursor position
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const fx = (mouseX - AXIS_LEFT) / plotWidth;
        const freqAtCursor = startFreq + fx * actualRange;

        const zoomIn = e.deltaY > 0;
        const factor = zoomIn ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
        const newRange = Math.max(MIN_VISIBLE_RANGE, Math.min(actualRange * factor, nyquist));

        // Keep frequency under cursor at the same pixel position
        const newStart = freqAtCursor - fx * newRange;
        clampFreqView(newStart, newRange);
    }, [plotWidth, startFreq, actualRange, nyquist, clampFreqView]);

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
        if (!isNaN(val) && val >= -160 && val < 0) {
            setMinDb(val);
        }
    }, []);

    const zoomSliderValue = Math.round((visibleRange / nyquist) * 100);
    const maxPan = Math.max(0, nyquist - visibleRange);

    return (
        <div className={`spectrum-view audition-theme ${isDarkTheme ? 'dark-theme' : ''}`}>
            {/* Toolbar */}
            <div className="sa-toolbar">
                <div className="sa-toolbar-section">
                    <button
                        className={`sa-btn ${accumulate ? 'active' : ''}`}
                        onClick={() => setAccumulate(!accumulate)}
                        title="Накопление максимумов (Max Hold)"
                    >
                        MAX
                    </button>
                    <button
                        className={`sa-btn ${showPeak ? 'active' : ''}`}
                        onClick={() => setShowPeak(!showPeak)}
                        title="Показать пиковую частоту"
                    >
                        PEAK
                    </button>
                </div>

                {fftSize !== undefined && onFftSizeChange && (
                    <>
                        <div className="sa-toolbar-divider" />
                        <div className="sa-toolbar-section">
                            <span className="sa-label">FFT</span>
                            <select
                                className="sa-select"
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

                <div className="sa-toolbar-divider" />

                {/* Zoom */}
                <div className="sa-toolbar-section">
                    <span className="sa-label">Масштаб</span>
                    <input
                        type="range"
                        className="sa-slider"
                        min="2"
                        max="100"
                        value={zoomSliderValue}
                        onChange={handleZoomSlider}
                        title="Масштаб по частоте (или колесико мыши)"
                    />
                </div>

                {/* Pan */}
                {visibleRange < nyquist && (
                    <div className="sa-toolbar-section">
                        <span className="sa-label">Сдвиг</span>
                        <input
                            type="range"
                            className="sa-slider"
                            min="0"
                            max={maxPan}
                            step={Math.max(1, Math.round(maxPan / 200))}
                            value={Math.round(startFreq)}
                            onChange={handlePanSlider}
                            title="Прокрутка по частоте"
                        />
                    </div>
                )}

                <div className="sa-toolbar-divider" />

                {/* Vertical zoom */}
                <div className="sa-toolbar-section">
                    <span className="sa-label">Уровень</span>
                    <input
                        type="range"
                        className="sa-slider"
                        min="-160"
                        max="-20"
                        value={minDb}
                        onChange={handleDbSlider}
                        title="Масштаб по уровню"
                    />
                    <input
                        type="number"
                        className="sa-input sa-input-narrow"
                        value={minDb}
                        onChange={handleDbInput}
                        min="-160"
                        max="-20"
                        step="10"
                        title="Мин. уровень (дБ)"
                    />
                    <span className="sa-unit">дБ</span>
                </div>
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="sa-canvas"
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
    height: PropTypes.number,
    fftSize: PropTypes.number,
    onFftSizeChange: PropTypes.func,
};

export default SpectrumView;
