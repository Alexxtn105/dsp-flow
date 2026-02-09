import { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import './SpectrumView.css';

/**
 * Спектроанализатор - отображение амплитудного спектра
 */
function SpectrumView({ data, sampleRate = 48000, isDarkTheme, width = 380, height = 200 }) {
    const canvasRef = useRef(null);
    const [windowFunction, setWindowFunction] = useState('blackman-harris');
    const [accumulate, setAccumulate] = useState(false);
    const [accumulatedData, setAccumulatedData] = useState(null);

    // Mouse tracking
    const [cursorX, setCursorX] = useState(null);
    const [cursorY, setCursorY] = useState(null);
    const [hoverFreq, setHoverFreq] = useState(null);
    const [hoverDb, setHoverDb] = useState(null);

    // Reset accumulated data when stopped or toggled
    useEffect(() => {
        if (!accumulate) {
            setAccumulatedData(null);
        }
    }, [accumulate]);

    // Update accumulated data
    useEffect(() => {
        if (!data || !accumulate) return;

        setAccumulatedData(prev => {
            if (!prev) return Float32Array.from(data);

            // Max hold logic
            const next = new Float32Array(prev.length);
            for (let i = 0; i < prev.length; i++) {
                next[i] = Math.max(prev[i], data[i] || -100);
            }
            return next;
        });
    }, [data, accumulate]);

    const drawSpectrum = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Установка размера с учётом DPR
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
        }
        ctx.resetTransform();
        ctx.scale(dpr, dpr);

        // Очистка
        ctx.fillStyle = isDarkTheme ? '#1f2937' : '#f9fafb';
        ctx.fillRect(0, 0, width, height);

        // Grid parameters
        const minDb = -100;
        const maxDb = 0;
        const dbRange = maxDb - minDb;

        // Draw Grid
        ctx.strokeStyle = isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;

        // Horizontal dB lines (every 10dB)
        ctx.font = '10px sans-serif';
        ctx.fillStyle = isDarkTheme ? '#9ca3af' : '#4b5563';
        ctx.textBaseline = 'middle';

        for (let db = maxDb; db >= minDb; db -= 10) {
            const y = height - ((db - minDb) / dbRange) * height;
            ctx.beginPath();
            ctx.moveTo(30, y); // Offset for labels
            ctx.lineTo(width, y);
            ctx.stroke();

            ctx.fillText(`${db}`, 2, y);
        }

        // Vertical Freq lines
        const maxFreq = sampleRate / 2;
        const pixelsPerHz = width / maxFreq;

        let stepHz = 100;
        if (pixelsPerHz * 100 < 40) stepHz = 500;
        if (pixelsPerHz * 500 < 40) stepHz = 1000;
        if (pixelsPerHz * 1000 < 40) stepHz = 5000;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const minorStepHz = stepHz / 5;

        for (let f = 0; f <= maxFreq; f += minorStepHz) {
            const isMajor = f % stepHz === 0;
            const x = (f / maxFreq) * width;

            ctx.beginPath();
            ctx.moveTo(x, height);
            ctx.lineTo(x, height - (isMajor ? 10 : 5));
            ctx.stroke();

            if (isMajor) {
                let label = f < 1000 ? `${f}` : `${f / 1000}k`;
                ctx.fillText(label, x, height - 2);

                if (f > 0) {
                    ctx.save();
                    ctx.strokeStyle = isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, height - 10);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        // Drawing helper
        const drawLine = (pData, color) => {
            if (!pData || pData.length === 0) return;

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;

            // Map data points
            // data is usually half FFT size (e.g. 1024 points)
            // We need to stretch it to width

            for (let i = 0; i < pData.length; i++) {
                const x = (i / (pData.length - 1)) * width;
                const db = Math.max(minDb, Math.min(maxDb, pData[i]));
                const y = height - ((db - minDb) / dbRange) * height;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        };

        // Draw Accumulated
        if (accumulate && accumulatedData) {
            drawLine(accumulatedData, '#ef4444'); // Red for max hold
        }

        // Draw Current
        if (data) {
            drawLine(data, isDarkTheme ? '#60a5fa' : '#3b82f6');
        }

        // Crosshair
        if (cursorX !== null && cursorY !== null) {
            ctx.strokeStyle = isDarkTheme ? '#ffffff' : '#000000';
            ctx.lineWidth = 1;

            // V-line
            ctx.beginPath();
            ctx.moveTo(cursorX, 0);
            ctx.lineTo(cursorX, height);
            ctx.stroke();

            // H-line
            ctx.beginPath();
            ctx.moveTo(0, cursorY);
            ctx.lineTo(width, cursorY);
            ctx.stroke();

            // Label
            const label = `${Math.round(hoverFreq)}Hz : ${hoverDb.toFixed(1)}dB`;
            const textW = ctx.measureText(label).width + 8;

            let tx = cursorX + 5;
            let ty = cursorY - 20;
            if (tx + textW > width) tx = cursorX - textW - 5;
            if (ty < 0) ty = cursorY + 10;

            ctx.fillStyle = isDarkTheme ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)';
            ctx.fillRect(tx, ty, textW, 16);
            ctx.fillStyle = isDarkTheme ? '#fff' : '#000';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, tx + 4, ty + 8);
        }

    }, [data, accumulatedData, accumulate, sampleRate, isDarkTheme, width, height, cursorX, cursorY, hoverFreq, hoverDb]);

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

        // Calc freq and dB from coords
        const maxFreq = sampleRate / 2;
        const freq = (x / width) * maxFreq;

        const minDb = -100;
        const maxDb = 0;
        const dbRange = maxDb - minDb;
        const db = minDb + ((height - y) / height) * dbRange;

        setHoverFreq(freq);
        setHoverDb(db);
    }, [width, height, sampleRate]);

    const handleMouseLeave = useCallback(() => {
        setCursorX(null);
        setCursorY(null);
    }, []);

    return (
        <div className={`spectrum-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="viz-toolbar"> {/* Reuse styles for consistency */}
                <div className="viz-toolbar-group">
                    <button
                        className={`viz-btn ${accumulate ? 'active' : ''}`}
                        style={{ width: 'auto', padding: '0 8px' }}
                        onClick={() => setAccumulate(!accumulate)}
                        title="Накопление спектра (Max Hold)"
                    >
                        Max Hold
                    </button>
                </div>
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
            </div>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
                className="spectrum-canvas"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            />
        </div>
    );
}

SpectrumView.propTypes = {
    data: PropTypes.instanceOf(Float32Array),
    sampleRate: PropTypes.number,
    isDarkTheme: PropTypes.bool.isRequired,
    width: PropTypes.number,
    height: PropTypes.number
};

export default SpectrumView;
