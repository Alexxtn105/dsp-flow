import { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { setupCanvasDPR } from '../_shared/canvasUtils';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './MultiChannelSpectrumView.css';

const CHANNEL_COLORS = [
    { line: '#00bfff', glow: 'rgba(0, 191, 255, 0.12)' },
    { line: '#00e564', glow: 'rgba(0, 229, 100, 0.12)' },
    { line: '#ffd200', glow: 'rgba(255, 210, 0, 0.12)' },
    { line: '#ff4040', glow: 'rgba(255, 64, 64, 0.12)' },
];

const COLORS = {
    bg: '#1a1a2e',
    gridMajor: 'rgba(255, 255, 255, 0.08)',
    gridMinor: 'rgba(255, 255, 255, 0.03)',
    axisLine: 'rgba(255, 255, 255, 0.15)',
    axisText: '#7a8599',
    axisTextBright: '#99a8bf',
    crosshair: 'rgba(255, 255, 255, 0.4)',
    cursorBg: 'rgba(10, 10, 30, 0.92)',
    cursorBorder: 'rgba(255, 255, 255, 0.15)',
    cursorText: '#c8d6e5',
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
    if (residual <= 1.5) return magnitude;
    if (residual <= 3.5) return 2 * magnitude;
    if (residual <= 7.5) return 5 * magnitude;
    return 10 * magnitude;
}

function calcDbGridStep(plotHeight, dbRange) {
    const targetSteps = Math.max(3, Math.floor(plotHeight / 50));
    const rawStep = Math.abs(dbRange) / targetSteps;
    if (rawStep <= 5) return 5;
    if (rawStep <= 10) return 10;
    if (rawStep <= 20) return 20;
    return 30;
}

function extractChannels(data) {
    if (!data) return [null, null, null, null];
    if (data.channels) return data.channels;
    if (data instanceof Float32Array) return [data, null, null, null];
    return [null, null, null, null];
}

/**
 * Многоканальный спектроанализатор — 4 канала
 */
function MultiChannelSpectrumView({ data, sampleRate = 48000, width = 380, height = 260, fftSize, onFftSizeChange }) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation();
    const canvasRef = useRef(null);

    const [startFreq, setStartFreq] = useState(0);
    const [visibleRange, setVisibleRange] = useState(sampleRate / 2);
    const [minDb, setMinDb] = useState(-100);
    const maxDb = 0;

    const [cursorX, setCursorX] = useState(null);
    const [cursorY, setCursorY] = useState(null);
    const [hoverFreq, setHoverFreq] = useState(null);
    const [hoverDb, setHoverDb] = useState(null);

    const [channelVisible, setChannelVisible] = useState([true, true, true, true]);

    // Измерение частоты (выделение участка ЛКМ)
    const [measuring, setMeasuring] = useState(false);
    const [measureStartFreq, setMeasureStartFreq] = useState(null);
    const [measureEndFreq, setMeasureEndFreq] = useState(null);

    const channels = extractChannels(data);
    const nyquist = sampleRate / 2;

    useEffect(() => {
        setVisibleRange(prev => Math.min(prev, nyquist));
        setStartFreq(prev => Math.max(0, Math.min(prev, nyquist - MIN_VISIBLE_RANGE)));
    }, [nyquist]);

    const endFreq = Math.min(startFreq + visibleRange, nyquist);
    const actualRange = endFreq - startFreq;

    const plotWidth = width - AXIS_LEFT;
    const plotHeight = height - AXIS_BOTTOM;
    const dbRange = maxDb - minDb;

    const clampFreqView = useCallback((newStart, newRange) => {
        const r = Math.max(MIN_VISIBLE_RANGE, Math.min(newRange, nyquist));
        const s = Math.max(0, Math.min(newStart, nyquist - r));
        setStartFreq(s);
        setVisibleRange(r);
    }, [nyquist]);

    const toggleChannel = useCallback((idx) => {
        setChannelVisible(prev => {
            const next = [...prev];
            next[idx] = !next[idx];
            return next;
        });
    }, []);

    const drawSpectrum = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = setupCanvasDPR(canvas, width, height);
        const c = COLORS;

        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, width, height);

        const px = AXIS_LEFT;
        const py = 0;
        const pw = plotWidth;
        const ph = plotHeight;

        // --- Grid ---
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, pw, ph);
        ctx.clip();

        const dbStep = calcDbGridStep(ph, dbRange);
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

        // --- Spectrum channels ---
        for (let ch = 0; ch < 4; ch++) {
            const chData = channels[ch];
            if (!chData || !channelVisible[ch] || chData.length === 0) continue;

            const color = CHANNEL_COLORS[ch];
            const binCount = chData.length;
            const binFreqStep = nyquist / binCount;
            const minBinIndex = Math.max(0, Math.floor(startFreq / binFreqStep));
            const maxBinIndex = Math.min(binCount - 1, Math.ceil(endFreq / binFreqStep));

            ctx.save();
            ctx.beginPath();
            ctx.rect(px, py, pw, ph);
            ctx.clip();

            // Fill
            ctx.beginPath();
            let firstX, started = false;
            for (let i = minBinIndex; i <= maxBinIndex; i++) {
                const freq = i * binFreqStep;
                const x = px + ((freq - startFreq) / actualRange) * pw;
                const db = Math.max(minDb, Math.min(maxDb, chData[i]));
                const y = py + ph - ((db - minDb) / dbRange) * ph;
                if (!started) {
                    ctx.moveTo(x, y);
                    firstX = x;
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }

            if (started) {
                const lastFreq = maxBinIndex * binFreqStep;
                const lastX = px + ((lastFreq - startFreq) / actualRange) * pw;
                ctx.lineTo(lastX, py + ph);
                ctx.lineTo(firstX, py + ph);
                ctx.closePath();

                const grad = ctx.createLinearGradient(0, py, 0, py + ph);
                grad.addColorStop(0, color.glow);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fill();

                // Line on top
                ctx.beginPath();
                for (let i = minBinIndex; i <= maxBinIndex; i++) {
                    const freq = i * binFreqStep;
                    const x = px + ((freq - startFreq) / actualRange) * pw;
                    const db = Math.max(minDb, Math.min(maxDb, chData[i]));
                    const y = py + ph - ((db - minDb) / dbRange) * ph;
                    if (i === minBinIndex) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
            }

            ctx.strokeStyle = color.line;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
        }

        // --- Axes ---
        ctx.strokeStyle = c.axisLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + ph);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px, py + ph);
        ctx.lineTo(px + pw, py + ph);
        ctx.stroke();

        // dB labels
        ctx.font = '10px "Segoe UI", "SF Pro", sans-serif';
        ctx.fillStyle = c.axisText;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        for (let db = maxDb; db >= minDb; db -= dbStep) {
            const y = py + ph - ((db - minDb) / dbRange) * ph;
            ctx.fillText(`${db}`, px - 4, y);
            ctx.strokeStyle = c.axisLine;
            ctx.beginPath();
            ctx.moveTo(px - 3, y);
            ctx.lineTo(px, y);
            ctx.stroke();
        }

        // Frequency labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = c.axisText;
        for (let f = gridStart; f <= endFreq; f += freqStep) {
            const x = px + ((f - startFreq) / actualRange) * pw;
            ctx.fillText(formatFreq(f), x, py + ph + 4);
            ctx.strokeStyle = c.axisLine;
            ctx.beginPath();
            ctx.moveTo(x, py + ph);
            ctx.lineTo(x, py + ph + 3);
            ctx.stroke();
        }

        // Axis titles
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = c.axisTextBright;
        ctx.save();
        ctx.translate(10, py + ph / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t('viz.units.db'), 0, 0);
        ctx.restore();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(t('viz.units.hz'), px + pw - 2, py + ph + 14);

        // --- Frequency measurement overlay ---
        if (measureStartFreq !== null && measureEndFreq !== null) {
            const f0 = Math.min(measureStartFreq, measureEndFreq);
            const f1 = Math.max(measureStartFreq, measureEndFreq);
            const x0 = px + ((f0 - startFreq) / actualRange) * pw;
            const x1 = px + ((f1 - startFreq) / actualRange) * pw;

            ctx.fillStyle = 'rgba(0, 191, 255, 0.12)';
            ctx.fillRect(x0, py, x1 - x0, ph);

            ctx.strokeStyle = 'rgba(0, 191, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(x0, py); ctx.lineTo(x0, py + ph);
            ctx.moveTo(x1, py); ctx.lineTo(x1, py + ph);
            ctx.stroke();
            ctx.setLineDash([]);

            const deltaFreq = f1 - f0;
            if (deltaFreq > 0) {
                const label = `\u0394: ${Math.round(f0)} \u2013 ${Math.round(f1)} ${t('viz.units.hz')} | ${Math.round(deltaFreq)} ${t('viz.units.hz')}`;
                ctx.font = '10px "Segoe UI Mono", "SF Mono", "Consolas", monospace';
                const textW = ctx.measureText(label).width + 14;
                const boxH = 20;

                let bx = (x0 + x1) / 2 - textW / 2;
                if (bx < px) bx = px + 2;
                if (bx + textW > px + pw) bx = px + pw - textW - 2;
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

        // --- Crosshair ---
        if (cursorX !== null && cursorY !== null &&
            cursorX >= px && cursorX <= px + pw &&
            cursorY >= py && cursorY <= py + ph) {

            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = c.crosshair;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(cursorX, py);
            ctx.lineTo(cursorX, py + ph);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px, cursorY);
            ctx.lineTo(px + pw, cursorY);
            ctx.stroke();
            ctx.setLineDash([]);

            if (hoverFreq !== null && hoverDb !== null) {
                const label = `${Math.round(hoverFreq)} ${t('viz.units.hz')}  ${hoverDb.toFixed(1)} ${t('viz.units.db')}`;
                ctx.font = '10px "Segoe UI Mono", "SF Mono", "Consolas", monospace';
                const textW = ctx.measureText(label).width + 12;
                const boxH = 20;
                let tx = cursorX + 10;
                let ty = cursorY - boxH - 6;
                if (tx + textW > px + pw) tx = cursorX - textW - 10;
                if (ty < py) ty = cursorY + 10;

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
    }, [data, sampleRate, isDarkTheme, width, height,
        cursorX, cursorY, hoverFreq, hoverDb, startFreq, visibleRange, minDb,
        plotWidth, plotHeight, dbRange, nyquist, actualRange, endFreq,
        channels, channelVisible, measureStartFreq, measureEndFreq, t]);

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
        const fx = (x - AXIS_LEFT) / plotWidth;
        const fy = 1 - (y / plotHeight);
        const freq = Math.max(0, Math.min(startFreq + actualRange, startFreq + fx * actualRange));
        setHoverFreq(freq);
        setHoverDb(minDb + fy * dbRange);

        if (measuring) {
            setMeasureEndFreq(freq);
        }
    }, [plotWidth, plotHeight, startFreq, actualRange, minDb, dbRange, measuring]);

    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return;
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const fx = (x - AXIS_LEFT) / plotWidth;
        const freq = Math.max(0, Math.min(startFreq + actualRange, startFreq + fx * actualRange));

        if (x >= AXIS_LEFT && x <= AXIS_LEFT + plotWidth) {
            setMeasuring(true);
            setMeasureStartFreq(freq);
            setMeasureEndFreq(freq);
        }
    }, [plotWidth, startFreq, actualRange]);

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
        const newStart = freqAtCursor - fx * newRange;
        clampFreqView(newStart, newRange);
    }, [plotWidth, startFreq, actualRange, nyquist, clampFreqView]);

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
        <div className={`multi-spectrum-view audition-theme ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="msa-toolbar">
                {fftSize !== undefined && onFftSizeChange && (
                    <>
                        <div className="msa-toolbar-section">
                            <span className="msa-label">FFT</span>
                            <select
                                className="msa-select"
                                value={fftSize}
                                onChange={(e) => onFftSizeChange(parseInt(e.target.value))}
                                title={t('viz.multiSpectrum.fftSize')}
                            >
                                {FFT_SIZES.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                        <div className="msa-toolbar-divider" />
                    </>
                )}

                <div className="msa-toolbar-section">
                    <span className="msa-label">{t('viz.multiSpectrum.scale')}</span>
                    <input
                        type="range"
                        className="msa-slider"
                        min="2"
                        max="100"
                        value={zoomSliderValue}
                        onChange={handleZoomSlider}
                        title={t('viz.multiSpectrum.freqScale')}
                    />
                </div>

                {visibleRange < nyquist && (
                    <div className="msa-toolbar-section">
                        <span className="msa-label">{t('viz.multiSpectrum.pan')}</span>
                        <input
                            type="range"
                            className="msa-slider"
                            min="0"
                            max={maxPan}
                            step={Math.max(1, Math.round(maxPan / 200))}
                            value={Math.round(startFreq)}
                            onChange={handlePanSlider}
                            title={t('viz.multiSpectrum.freqScroll')}
                        />
                    </div>
                )}

                <div className="msa-toolbar-divider" />

                <div className="msa-toolbar-section">
                    <span className="msa-label">{t('viz.multiSpectrum.level')}</span>
                    <input
                        type="range"
                        className="msa-slider"
                        min="-160"
                        max="-20"
                        value={minDb}
                        onChange={handleDbSlider}
                        title={t('viz.multiSpectrum.levelScale')}
                    />
                    <input
                        type="number"
                        className="msa-input msa-input-narrow"
                        value={minDb}
                        onChange={handleDbInput}
                        min="-160"
                        max="-20"
                        step="10"
                        title={t('viz.multiSpectrum.minLevel')}
                    />
                    <span className="msa-unit">{t('viz.units.db')}</span>
                </div>

                <div className="msa-toolbar-divider" />

                <div className="msa-toolbar-section msa-channels">
                    {CHANNEL_COLORS.map((color, idx) => (
                        <label
                            key={idx}
                            className={`msa-channel-toggle ${channelVisible[idx] ? 'active' : ''}`}
                            title={t('viz.multiSpectrum.channel', { n: idx + 1 })}
                        >
                            <input
                                type="checkbox"
                                checked={channelVisible[idx]}
                                onChange={() => toggleChannel(idx)}
                            />
                            <span
                                className="msa-channel-dot"
                                style={{ background: channelVisible[idx] ? color.line : 'transparent', borderColor: color.line }}
                            />
                            <span className="msa-channel-label">{idx + 1}</span>
                        </label>
                    ))}
                </div>
            </div>

            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="msa-canvas"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                role="img"
                aria-label={t('viz.multiSpectrum.ariaLabel')}
            />
        </div>
    );
}

MultiChannelSpectrumView.propTypes = {
    data: PropTypes.oneOfType([
        PropTypes.instanceOf(Float32Array),
        PropTypes.shape({
            channels: PropTypes.arrayOf(PropTypes.instanceOf(Float32Array))
        })
    ]),
    sampleRate: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    fftSize: PropTypes.number,
    onFftSizeChange: PropTypes.func,
};

export default MultiChannelSpectrumView;
