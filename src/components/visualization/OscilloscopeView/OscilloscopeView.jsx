import { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { setupCanvasDPR } from '../_shared/canvasUtils';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './OscilloscopeView.css';

const COLORS = {
    bg: '#1a1a2e',
    gridMajor: 'rgba(255, 255, 255, 0.08)',
    gridMinor: 'rgba(255, 255, 255, 0.03)',
    axisLine: 'rgba(255, 255, 255, 0.2)',
    axisText: '#7a8599',
    axisTextBright: '#99a8bf',
    signal: '#00e5a0',
    signalGlow: 'rgba(0, 229, 160, 0.12)',
    crosshair: 'rgba(255, 255, 255, 0.35)',
    cursorBg: 'rgba(10, 10, 30, 0.92)',
    cursorBorder: 'rgba(255, 255, 255, 0.15)',
    cursorText: '#c8d6e5',
    zeroLine: 'rgba(255, 255, 255, 0.15)',
};

const AXIS_LEFT = 40;
const AXIS_BOTTOM = 28;

function niceStep(range, targetDivs) {
    const raw = range / targetDivs;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const r = raw / mag;
    if (r <= 1.5) return mag;
    if (r <= 3.5) return 2 * mag;
    if (r <= 7.5) return 5 * mag;
    return 10 * mag;
}

function formatAmplitude(v) {
    if (Math.abs(v) < 1e-9) return '0';
    if (Number.isInteger(v)) return `${v}`;
    if (Math.abs(v) >= 1) return v.toFixed(1);
    return v.toFixed(2);
}

function formatTime(samples, sampleRate) {
    if (!sampleRate || sampleRate <= 0) return `${samples}`;
    const sec = samples / sampleRate;
    if (sec < 0.001) return `${(sec * 1e6).toFixed(0)}µs`;
    if (sec < 1) return `${(sec * 1e3).toFixed(1)}ms`;
    return `${sec.toFixed(3)}s`;
}

/**
 * Осциллограф — профессиональный вид в стиле Adobe Audition
 */
function OscilloscopeView({ data, sampleRate = 48000, width = 380, height = 260 }) {
    const { isDarkTheme } = useThemeContext();
    const canvasRef = useRef(null);

    // Horizontal zoom (visible samples)
    const [visibleSamples, setVisibleSamples] = useState(1024);
    // Vertical zoom (amplitude range ±)
    const [ampRange, setAmpRange] = useState(1.0);
    // Cursor
    const [cursorX, setCursorX] = useState(null);
    const [cursorY, setCursorY] = useState(null);
    const [hoverSample, setHoverSample] = useState(null);
    const [hoverAmplitude, setHoverAmplitude] = useState(null);
    const [hoverTime, setHoverTime] = useState(null);

    const plotLeft = AXIS_LEFT;
    const plotBottom = AXIS_BOTTOM;
    const plotW = width - plotLeft;
    const plotH = height - plotBottom;

    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = setupCanvasDPR(canvas, width, height);
        const c = COLORS;

        // Background
        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, width, height);

        const px = plotLeft;
        const pw = plotW;
        const ph = plotH;
        const cy = ph / 2;

        // --- Grid ---
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, 0, pw, ph);
        ctx.clip();

        // Horizontal amplitude grid
        const ampStep = niceStep(ampRange * 2, Math.max(3, Math.floor(ph / 50)));
        for (let v = -Math.ceil(ampRange / ampStep) * ampStep; v <= ampRange; v += ampStep) {
            const y = cy - (v / ampRange) * (ph / 2);
            if (y < 0 || y > ph) continue;
            const isZero = Math.abs(v) < 1e-9;
            const isMajor = isZero || Math.abs(v % (ampStep * 2)) < 1e-9;
            ctx.strokeStyle = isZero ? c.zeroLine : (isMajor ? c.gridMajor : c.gridMinor);
            ctx.lineWidth = isZero ? 1 : (isMajor ? 0.7 : 0.4);
            ctx.beginPath();
            ctx.moveTo(px, y);
            ctx.lineTo(px + pw, y);
            ctx.stroke();
        }

        // Vertical time grid
        const timeStep = niceStep(visibleSamples, Math.max(4, Math.floor(pw / 80)));
        for (let s = 0; s <= visibleSamples; s += timeStep) {
            const x = px + (s / visibleSamples) * pw;
            const isMajor = s === 0 || s % (timeStep * 2) === 0;
            ctx.strokeStyle = isMajor ? c.gridMajor : c.gridMinor;
            ctx.lineWidth = isMajor ? 0.7 : 0.4;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ph);
            ctx.stroke();
        }

        // --- Signal ---
        if (data && data.length > 0) {
            const pointsToDraw = Math.min(visibleSamples, data.length);

            // Gradient fill
            ctx.beginPath();
            for (let i = 0; i < pointsToDraw; i++) {
                const x = px + (i / (visibleSamples - 1)) * pw;
                const val = Math.max(-ampRange, Math.min(ampRange, data[i]));
                const y = cy - (val / ampRange) * (ph / 2);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            const lastX = px + ((pointsToDraw - 1) / (visibleSamples - 1)) * pw;
            const firstX = px;
            ctx.lineTo(lastX, cy);
            ctx.lineTo(firstX, cy);
            ctx.closePath();

            const grad = ctx.createLinearGradient(0, 0, 0, ph);
            grad.addColorStop(0, c.signalGlow);
            grad.addColorStop(0.5, 'transparent');
            grad.addColorStop(1, c.signalGlow);
            ctx.fillStyle = grad;
            ctx.fill();

            // Signal line
            ctx.beginPath();
            for (let i = 0; i < pointsToDraw; i++) {
                const x = px + (i / (visibleSamples - 1)) * pw;
                const val = Math.max(-ampRange, Math.min(ampRange, data[i]));
                const y = cy - (val / ampRange) * (ph / 2);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = c.signal;
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        ctx.restore();

        // --- Axes borders ---
        ctx.strokeStyle = c.axisLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, ph);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px, ph);
        ctx.lineTo(px + pw, ph);
        ctx.stroke();

        // --- Y-axis labels (amplitude) ---
        ctx.font = '10px "Segoe UI", "SF Pro", sans-serif';
        ctx.fillStyle = c.axisText;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let v = -Math.ceil(ampRange / ampStep) * ampStep; v <= ampRange; v += ampStep) {
            const y = cy - (v / ampRange) * (ph / 2);
            if (y < 2 || y > ph - 2) continue;
            ctx.fillText(formatAmplitude(v), px - 4, y);
            ctx.strokeStyle = c.axisLine;
            ctx.beginPath();
            ctx.moveTo(px - 3, y);
            ctx.lineTo(px, y);
            ctx.stroke();
        }

        // --- X-axis labels (time/samples) ---
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = c.axisText;

        for (let s = 0; s <= visibleSamples; s += timeStep) {
            const x = px + (s / visibleSamples) * pw;
            ctx.fillText(formatTime(s, sampleRate), x, ph + 4);
            ctx.strokeStyle = c.axisLine;
            ctx.beginPath();
            ctx.moveTo(x, ph);
            ctx.lineTo(x, ph + 3);
            ctx.stroke();
        }

        // Axis titles
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = c.axisTextBright;

        ctx.save();
        ctx.translate(10, ph / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Амплитуда', 0, 0);
        ctx.restore();

        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('Время', px + pw - 2, ph + 14);

        // --- Crosshair & cursor ---
        if (cursorX !== null && cursorY !== null &&
            cursorX >= px && cursorX <= px + pw &&
            cursorY >= 0 && cursorY <= ph) {

            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = c.crosshair;
            ctx.lineWidth = 0.8;

            ctx.beginPath();
            ctx.moveTo(cursorX, 0);
            ctx.lineTo(cursorX, ph);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(px, cursorY);
            ctx.lineTo(px + pw, cursorY);
            ctx.stroke();
            ctx.setLineDash([]);

            if (hoverSample !== null && hoverAmplitude !== null) {
                const timePart = hoverTime !== null ? formatTime(Math.round(hoverSample), sampleRate) : `${Math.round(hoverSample)}`;
                const label = `${timePart}  ${hoverAmplitude.toFixed(3)}`;
                ctx.font = '10px "Segoe UI Mono", "SF Mono", "Consolas", monospace';
                const textW = ctx.measureText(label).width + 12;
                const boxH = 20;

                let tx = cursorX + 10;
                let ty = cursorY - boxH - 6;
                if (tx + textW > px + pw) tx = cursorX - textW - 10;
                if (ty < 0) ty = cursorY + 10;

                ctx.fillStyle = c.cursorBg;
                ctx.strokeStyle = c.cursorBorder;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(tx, ty, textW, boxH, 3);
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
    }, [data, isDarkTheme, width, height, visibleSamples, ampRange, sampleRate,
        cursorX, cursorY, hoverSample, hoverAmplitude, hoverTime, plotLeft, plotW, plotH]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform]);

    const handleMouseMove = useCallback((e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCursorX(x);
        setCursorY(y);

        const fx = (x - plotLeft) / plotW;
        const sample = fx * visibleSamples;
        const amp = ampRange * (1 - 2 * y / plotH);

        setHoverSample(Math.max(0, sample));
        setHoverAmplitude(amp);
        setHoverTime(sample);
    }, [plotLeft, plotW, plotH, visibleSamples, ampRange]);

    const handleMouseLeave = useCallback(() => {
        setCursorX(null);
        setCursorY(null);
    }, []);

    const handleSamplesSlider = useCallback((e) => {
        setVisibleSamples(parseInt(e.target.value));
    }, []);

    const handleSamplesInput = useCallback((e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 10 && val <= 65536) {
            setVisibleSamples(val);
        }
    }, []);

    const handleAmpSlider = useCallback((e) => {
        setAmpRange(parseFloat(e.target.value));
    }, []);

    const handleAmpInput = useCallback((e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 0.01 && val <= 10) {
            setAmpRange(val);
        }
    }, []);

    return (
        <div className={`oscilloscope-view audition-theme ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="osc-toolbar">
                <div className="osc-toolbar-section">
                    <span className="osc-label">Время</span>
                    <input
                        type="range"
                        className="osc-slider"
                        min="16"
                        max="8192"
                        step="1"
                        value={visibleSamples}
                        onChange={handleSamplesSlider}
                        title="Горизонтальный масштаб (отсчёты)"
                    />
                    <input
                        type="number"
                        className="osc-input"
                        value={visibleSamples}
                        onChange={handleSamplesInput}
                        min="10"
                        max="65536"
                        step="64"
                        title="Видимые отсчёты"
                    />
                </div>

                <div className="osc-toolbar-divider" />

                <div className="osc-toolbar-section">
                    <span className="osc-label">Амплитуда</span>
                    <input
                        type="range"
                        className="osc-slider"
                        min="0.05"
                        max="5"
                        step="0.05"
                        value={ampRange}
                        onChange={handleAmpSlider}
                        title="Вертикальный масштаб (±)"
                    />
                    <input
                        type="number"
                        className="osc-input osc-input-narrow"
                        value={ampRange}
                        onChange={handleAmpInput}
                        min="0.01"
                        max="10"
                        step="0.1"
                        title="Диапазон ±"
                    />
                </div>
            </div>

            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="osc-canvas"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                role="img"
                aria-label="Осциллограф"
            />
        </div>
    );
}

OscilloscopeView.propTypes = {
    data: PropTypes.instanceOf(Float32Array),
    sampleRate: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number
};

export default OscilloscopeView;
