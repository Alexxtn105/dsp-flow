import { useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './EyeDiagramView.css';

/**
 * Глазковая диаграмма — наложение символьных интервалов.
 * Принимает data = { traces: Float32Array[], samplesPerSymbol } от EyeDiagramPlugin.
 */
function EyeDiagramView({ data, width = 380, height = 260 }) {
    const canvasRef = useRef(null);
    const { isDarkTheme } = useThemeContext();

    const eyeData = useMemo(() => {
        if (!data || !data.traces || data.traces.length === 0) return null;
        return data;
    }, [data]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !eyeData) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const bgColor = isDarkTheme ? '#1a1a2e' : '#f8f9fa';
        const lineColor = isDarkTheme ? 'rgba(100, 181, 246, 0.15)' : 'rgba(33, 150, 243, 0.12)';
        const gridColor = isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const textColor = isDarkTheme ? '#aaa' : '#666';

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        const { traces, samplesPerSymbol } = eyeData;
        const traceLen = samplesPerSymbol * 2;
        const margin = { top: 10, right: 10, bottom: 25, left: 10 };
        const plotW = width - margin.left - margin.right;
        const plotH = height - margin.top - margin.bottom;

        // Определяем Y-диапазон по всем трейсам
        let yMin = Infinity, yMax = -Infinity;
        for (const trace of traces) {
            for (let i = 0; i < trace.length; i++) {
                if (trace[i] < yMin) yMin = trace[i];
                if (trace[i] > yMax) yMax = trace[i];
            }
        }
        if (yMax - yMin < 1e-10) { yMin -= 0.5; yMax += 0.5; }
        const yPad = (yMax - yMin) * 0.1;
        yMin -= yPad;
        yMax += yPad;

        // Сетка
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        // Горизонтальная центральная
        const centerY = margin.top + plotH * (yMax / (yMax - yMin));
        ctx.beginPath();
        ctx.moveTo(margin.left, centerY);
        ctx.lineTo(margin.left + plotW, centerY);
        ctx.stroke();
        // Вертикальная по символьным границам
        ctx.beginPath();
        ctx.moveTo(margin.left + plotW / 2, margin.top);
        ctx.lineTo(margin.left + plotW / 2, margin.top + plotH);
        ctx.stroke();

        // Рисуем трейсы
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        for (const trace of traces) {
            ctx.beginPath();
            for (let i = 0; i < trace.length && i < traceLen; i++) {
                const x = margin.left + (i / (traceLen - 1)) * plotW;
                const y = margin.top + ((yMax - trace[i]) / (yMax - yMin)) * plotH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Подписи
        ctx.fillStyle = textColor;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('0', margin.left, margin.top + plotH + 15);
        ctx.fillText('T', margin.left + plotW / 2, margin.top + plotH + 15);
        ctx.fillText('2T', margin.left + plotW, margin.top + plotH + 15);
    }, [eyeData, width, height, isDarkTheme]);

    return (
        <div className={`eye-diagram-view ${isDarkTheme ? 'dark-theme' : ''}`}>
            <canvas
                ref={canvasRef}
                style={{ width, height }}
            />
        </div>
    );
}

EyeDiagramView.propTypes = {
    data: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number
};

export default EyeDiagramView;
