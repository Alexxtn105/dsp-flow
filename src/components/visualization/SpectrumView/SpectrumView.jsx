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

function formatFreq(freq) {
    if (freq >= 1000) return `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}k`;
    return `${Math.round(freq)}`;
}

function calcFreqGridStep(plotWidth, maxFreq) {
    const targetSteps = Math.max(4, Math.floor(plotWidth / 80));
    const rawStep = maxFreq / targetSteps;
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
function SpectrumView({ data, sampleRate = 48000, width = 380, height = 260 }) {
    const { isDarkTheme } = useThemeContext();
    const canvasRef = useRef(null);
    const [accumulate, setAccumulate] = useState(false);
    const [accumulatedData, setAccumulatedData] = useState(null);

    // Zoom state
    const [maxFreq, setMaxFreq] = useState(sampleRate / 2);
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

    // Clamp maxFreq when sampleRate changes
    useEffect(() => {
        setMaxFreq(prev => Math.min(prev, sampleRate / 2));
    }, [sampleRate]);

    const plotWidth = width - AXIS_LEFT;
    const plotHeight = height - AXIS_BOTTOM;
    const dbRange = maxDb - minDb;
    const nyquist = sampleRate / 2;

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
        const freqStep = calcFreqGridStep(pw, maxFreq);
        for (let f = 0; f <= maxFreq; f += freqStep) {
            const x = px + (f / maxFreq) * pw;
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
            const maxBinIndex = Math.min(binCount - 1, Math.floor(maxFreq / binFreqStep));

            // Build path
            ctx.save();
            ctx.beginPath();
            ctx.rect(px, py, pw, ph);
            ctx.clip();

            ctx.beginPath();
            let firstX;
            for (let i = 0; i <= maxBinIndex; i++) {
                const freq = i * binFreqStep;
                const x = px + (freq / maxFreq) * pw;
                const db = Math.max(minDb, Math.min(maxDb, pData[i]));
                const y = py + ph - ((db - minDb) / dbRange) * ph;

                if (i === 0) {
                    ctx.moveTo(x, y);
                    firstX = x;
                } else {
                    ctx.lineTo(x, y);
                }
            }

            // Gradient fill
            if (fillColor) {
                const lastX = px + (maxBinIndex * binFreqStep / maxFreq) * pw;
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
                for (let i = 0; i <= maxBinIndex; i++) {
                    const freq = i * binFreqStep;
                    const x = px + (freq / maxFreq) * pw;
                    const db = Math.max(minDb, Math.min(maxDb, pData[i]));
                    const y = py + ph - ((db - minDb) / dbRange) * ph;
                    if (i === 0) ctx.moveTo(x, y);
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
            const maxBinIndex = Math.min(data.length - 1, Math.floor(maxFreq / binFreqStep));
            let peakIdx = 0;
            let peakVal = -Infinity;
            for (let i = 1; i <= maxBinIndex; i++) {
                if (data[i] > peakVal) {
                    peakVal = data[i];
                    peakIdx = i;
                }
            }
            if (peakVal > minDb) {
                const peakFreq = peakIdx * binFreqStep;
                const peakX = px + (peakFreq / maxFreq) * pw;
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

                // Peak label
                ctx.font = '9px "Segoe UI", sans-serif';
                ctx.fillStyle = c.peakMarker;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                const peakLabel = `${formatFreq(peakFreq)}Hz ${peakVal.toFixed(1)}dB`;
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

        for (let f = 0; f <= maxFreq; f += freqStep) {
            const x = px + (f / maxFreq) * pw;
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
        ctx.fillText('dB', 0, 0);
        ctx.restore();

        // X-axis title
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('Hz', px + pw - 2, py + ph + 14);

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
                const label = `${Math.round(hoverFreq)} Hz  ${hoverDb.toFixed(1)} dB`;
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
        cursorX, cursorY, hoverFreq, hoverDb, maxFreq, minDb, showPeak, plotWidth, plotHeight, dbRange, nyquist]);

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

        setHoverFreq(Math.max(0, fx * maxFreq));
        setHoverDb(minDb + fy * dbRange);
    }, [plotWidth, plotHeight, maxFreq, minDb, dbRange]);

    const handleMouseLeave = useCallback(() => {
        setCursorX(null);
        setCursorY(null);
    }, []);

    const handleFreqSlider = useCallback((e) => {
        const pct = parseInt(e.target.value) / 100;
        const newMax = Math.max(500, Math.round(pct * nyquist / 100) * 100);
        setMaxFreq(newMax);
    }, [nyquist]);

    const handleFreqInput = useCallback((e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 100 && val <= nyquist) {
            setMaxFreq(val);
        }
    }, [nyquist]);

    const handleDbSlider = useCallback((e) => {
        setMinDb(parseInt(e.target.value));
    }, []);

    const handleDbInput = useCallback((e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= -160 && val < 0) {
            setMinDb(val);
        }
    }, []);

    const freqSliderValue = Math.round((maxFreq / nyquist) * 100);

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

                <div className="sa-toolbar-divider" />

                {/* Horizontal zoom */}
                <div className="sa-toolbar-section">
                    <span className="sa-label">Частота</span>
                    <input
                        type="range"
                        className="sa-slider"
                        min="2"
                        max="100"
                        value={freqSliderValue}
                        onChange={handleFreqSlider}
                        title="Масштаб по частоте"
                    />
                    <input
                        type="number"
                        className="sa-input"
                        value={maxFreq}
                        onChange={handleFreqInput}
                        min="100"
                        max={nyquist}
                        step="100"
                        title="Макс. частота (Гц)"
                    />
                    <span className="sa-unit">Гц</span>
                </div>

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
    height: PropTypes.number
};

export default SpectrumView;
