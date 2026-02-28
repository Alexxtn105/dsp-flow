import { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { setupCanvasDPR } from '../_shared/canvasUtils';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './ConstellationView.css';

const COLORS = {
    bg: '#1a1a2e',
    gridMajor: 'rgba(255, 255, 255, 0.07)',
    gridMinor: 'rgba(255, 255, 255, 0.025)',
    axisLine: 'rgba(255, 255, 255, 0.2)',
    axisText: '#7a8599',
    axisTextBright: '#99a8bf',
    unitCircle: 'rgba(255, 255, 255, 0.12)',
    signal: '#00e5a0',
    signalGlow: 'rgba(0, 229, 160, 0.35)',
    trail: 'rgba(0, 229, 160, 0.08)',
    crosshair: 'rgba(255, 255, 255, 0.35)',
    cursorBg: 'rgba(10, 10, 30, 0.92)',
    cursorBorder: 'rgba(255, 255, 255, 0.15)',
    cursorText: '#c8d6e5',
};

const AXIS_MARGIN = 36;

/**
 * Фазовое созвездие — профессиональный вид в стиле Adobe Audition
 * data — Float32Array interleaved [I0, Q0, I1, Q1, ...]
 */
function ConstellationView({ data, width = 380, height = 260 }) {
    const { isDarkTheme } = useThemeContext();
    const canvasRef = useRef(null);

    // Zoom (scale factor: 1.0 means ±1.0 range)
    const [scale, setScale] = useState(1.0);
    // Trail (persistence)
    const [showTrail, setShowTrail] = useState(false);
    const trailBufferRef = useRef([]);
    const MAX_TRAIL = 16;
    // Cursor
    const [cursorX, setCursorX] = useState(null);
    const [cursorY, setCursorY] = useState(null);
    const [hoverI, setHoverI] = useState(null);
    const [hoverQ, setHoverQ] = useState(null);

    // Accumulate trail frames
    useEffect(() => {
        if (!data || data.length < 2) return;
        if (!showTrail) {
            trailBufferRef.current = [];
            return;
        }
        trailBufferRef.current.push(Float32Array.from(data));
        if (trailBufferRef.current.length > MAX_TRAIL) {
            trailBufferRef.current.shift();
        }
    }, [data, showTrail]);

    // Plot area
    const plotLeft = AXIS_MARGIN;
    const plotBottom = AXIS_MARGIN;
    const plotW = width - plotLeft;
    const plotH = height - plotBottom;
    const side = Math.min(plotW, plotH);
    const plotCx = plotLeft + plotW / 2;
    const plotCy = plotH / 2;
    const halfRange = scale; // ±scale

    const draw = useCallback(() => {
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
        const cx = plotCx;
        const cy = plotCy;
        const unitPx = (side / 2) / halfRange;

        // --- Grid ---
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, 0, pw, ph);
        ctx.clip();

        // Adaptive grid step
        const gridStep = niceGridStep(halfRange, Math.min(pw, ph));

        // Vertical grid lines
        for (let v = -Math.ceil(halfRange / gridStep) * gridStep; v <= halfRange; v += gridStep) {
            const x = cx + v * unitPx;
            if (x < px || x > px + pw) continue;
            const isMajor = Math.abs(v) < 1e-9 || Math.abs(v % (gridStep * 2)) < 1e-9;
            ctx.strokeStyle = Math.abs(v) < 1e-9 ? c.axisLine : (isMajor ? c.gridMajor : c.gridMinor);
            ctx.lineWidth = Math.abs(v) < 1e-9 ? 1 : (isMajor ? 0.7 : 0.4);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ph);
            ctx.stroke();
        }

        // Horizontal grid lines
        for (let v = -Math.ceil(halfRange / gridStep) * gridStep; v <= halfRange; v += gridStep) {
            const y = cy - v * unitPx;
            if (y < 0 || y > ph) continue;
            const isMajor = Math.abs(v) < 1e-9 || Math.abs(v % (gridStep * 2)) < 1e-9;
            ctx.strokeStyle = Math.abs(v) < 1e-9 ? c.axisLine : (isMajor ? c.gridMajor : c.gridMinor);
            ctx.lineWidth = Math.abs(v) < 1e-9 ? 1 : (isMajor ? 0.7 : 0.4);
            ctx.beginPath();
            ctx.moveTo(px, y);
            ctx.lineTo(px + pw, y);
            ctx.stroke();
        }

        // Unit circle
        const ucRadius = 1.0 * unitPx;
        if (ucRadius > 5) {
            ctx.strokeStyle = c.unitCircle;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.arc(cx, cy, ucRadius, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // --- Trail points ---
        if (showTrail && trailBufferRef.current.length > 0) {
            const frames = trailBufferRef.current;
            for (let fi = 0; fi < frames.length - 1; fi++) {
                const frame = frames[fi];
                const alpha = ((fi + 1) / frames.length) * 0.15;
                ctx.fillStyle = `rgba(0, 229, 160, ${alpha.toFixed(3)})`;
                const n = Math.floor(frame.length / 2);
                for (let i = 0; i < n; i++) {
                    const I = frame[i * 2];
                    const Q = frame[i * 2 + 1];
                    const ptx = cx + I * unitPx;
                    const pty = cy - Q * unitPx;
                    ctx.beginPath();
                    ctx.arc(ptx, pty, 1.2, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }

        // --- Current points ---
        if (data && data.length >= 2) {
            const numPoints = Math.floor(data.length / 2);

            // Glow pass
            ctx.fillStyle = c.signalGlow;
            for (let i = 0; i < numPoints; i++) {
                const I = data[i * 2];
                const Q = data[i * 2 + 1];
                const ptx = cx + I * unitPx;
                const pty = cy - Q * unitPx;
                ctx.beginPath();
                ctx.arc(ptx, pty, 3.5, 0, 2 * Math.PI);
                ctx.fill();
            }

            // Sharp points
            ctx.fillStyle = c.signal;
            for (let i = 0; i < numPoints; i++) {
                const I = data[i * 2];
                const Q = data[i * 2 + 1];
                const ptx = cx + I * unitPx;
                const pty = cy - Q * unitPx;
                ctx.beginPath();
                ctx.arc(ptx, pty, 1.5, 0, 2 * Math.PI);
                ctx.fill();
            }
        }

        ctx.restore();

        // --- Axes borders ---
        ctx.strokeStyle = c.axisLine;
        ctx.lineWidth = 1;
        // Left border
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, ph);
        ctx.stroke();
        // Bottom border
        ctx.beginPath();
        ctx.moveTo(px, ph);
        ctx.lineTo(px + pw, ph);
        ctx.stroke();

        // --- Axis labels ---
        ctx.font = '10px "Segoe UI", "SF Pro", sans-serif';
        ctx.fillStyle = c.axisText;

        // Y-axis (Q) labels
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let v = -Math.ceil(halfRange / gridStep) * gridStep; v <= halfRange; v += gridStep) {
            const y = cy - v * unitPx;
            if (y < 2 || y > ph - 2) continue;
            if (Math.abs(v) < 1e-9 && Math.abs(cy - ph / 2) < 1) continue; // skip 0 at center to avoid clutter
            ctx.fillText(formatAxis(v), px - 4, y);
            // Tick
            ctx.strokeStyle = c.axisLine;
            ctx.beginPath();
            ctx.moveTo(px - 3, y);
            ctx.lineTo(px, y);
            ctx.stroke();
        }

        // X-axis (I) labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let v = -Math.ceil(halfRange / gridStep) * gridStep; v <= halfRange; v += gridStep) {
            const x = cx + v * unitPx;
            if (x < px + 5 || x > px + pw - 5) continue;
            if (Math.abs(v) < 1e-9) continue;
            ctx.fillText(formatAxis(v), x, ph + 4);
            // Tick
            ctx.strokeStyle = c.axisLine;
            ctx.beginPath();
            ctx.moveTo(x, ph);
            ctx.lineTo(x, ph + 3);
            ctx.stroke();
        }

        // Axis titles
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = c.axisTextBright;

        // I label
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('I', px + pw - 3, ph + 14);

        // Q label
        ctx.save();
        ctx.translate(10, ph / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Q', 0, 0);
        ctx.restore();

        // Origin "0"
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = c.axisText;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('0', px - 4, ph + 3);

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

            if (hoverI !== null && hoverQ !== null) {
                const label = `I: ${hoverI.toFixed(3)}  Q: ${hoverQ.toFixed(3)}`;
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
    }, [data, isDarkTheme, width, height, scale, showTrail,
        cursorX, cursorY, hoverI, hoverQ, plotLeft, plotW, plotH, plotCx, plotCy, side, halfRange]);

    useEffect(() => {
        draw();
    }, [draw]);

    const handleMouseMove = useCallback((e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCursorX(x);
        setCursorY(y);

        const unitPx = (side / 2) / halfRange;
        setHoverI((x - plotCx) / unitPx);
        setHoverQ((plotCy - y) / unitPx);
    }, [side, halfRange, plotCx, plotCy]);

    const handleMouseLeave = useCallback(() => {
        setCursorX(null);
        setCursorY(null);
    }, []);

    const handleScaleSlider = useCallback((e) => {
        setScale(parseFloat(e.target.value));
    }, []);

    const handleScaleInput = useCallback((e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 0.1 && val <= 10) {
            setScale(val);
        }
    }, []);

    return (
        <div className={`constellation-view audition-theme ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="cv-toolbar">
                <div className="cv-toolbar-section">
                    <button
                        className={`cv-btn ${showTrail ? 'active' : ''}`}
                        onClick={() => setShowTrail(!showTrail)}
                        title="След (персистентность)"
                    >
                        TRAIL
                    </button>
                </div>

                <div className="cv-toolbar-divider" />

                <div className="cv-toolbar-section">
                    <span className="cv-label">Масштаб</span>
                    <input
                        type="range"
                        className="cv-slider"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={scale}
                        onChange={handleScaleSlider}
                        title="Масштаб отображения"
                    />
                    <input
                        type="number"
                        className="cv-input"
                        value={scale}
                        onChange={handleScaleInput}
                        min="0.1"
                        max="10"
                        step="0.1"
                        title="Диапазон ±"
                    />
                </div>
            </div>

            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="cv-canvas"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                role="img"
                aria-label="Фазовое созвездие"
            />
        </div>
    );
}

function niceGridStep(halfRange, sizePx) {
    const target = Math.max(3, Math.floor(sizePx / 70));
    const raw = (halfRange * 2) / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const r = raw / mag;
    if (r <= 1.5) return mag;
    if (r <= 3.5) return 2 * mag;
    if (r <= 7.5) return 5 * mag;
    return 10 * mag;
}

function formatAxis(v) {
    if (Math.abs(v) < 1e-9) return '0';
    if (Number.isInteger(v)) return `${v}`;
    return v.toFixed(1);
}

ConstellationView.propTypes = {
    data: PropTypes.instanceOf(Float32Array),
    width: PropTypes.number,
    height: PropTypes.number
};

export default ConstellationView;
