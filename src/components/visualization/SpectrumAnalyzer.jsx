/**
 * SpectrumAnalyzer - компонент визуализации спектра с водопадом
 */

import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react-lite';
import * as d3 from 'd3';
import DSPLib from '../../engine/DSPLib';
import './SpectrumAnalyzer.css';

const SpectrumAnalyzer = observer(({ data, width = 800, height = 600, mode = 'both' }) => {
    const canvasRef = useRef(null);
    const svgRef = useRef(null);
    const waterfallDataRef = useRef([]);
    const [displayMode, setDisplayMode] = useState(mode); // 'spectrum', 'waterfall', 'both'
    
    const maxWaterfallLines = 100; // Максимум линий в водопаде

    useEffect(() => {
        if (!data || !canvasRef.current || !svgRef.current) return;

        const signal = data.signal || data;
        
        // Вычисляем FFT если это обычный сигнал
        let spectrum;
        if (signal instanceof Float32Array) {
            const fftResult = DSPLib.fft(signal, 2048);
            const powerSpectrum = DSPLib.powerSpectrum(fftResult);
            spectrum = DSPLib.toDecibels(powerSpectrum);
        } else if (data.magnitude) {
            spectrum = DSPLib.toDecibels(data.magnitude);
        } else {
            return;
        }

        // Рисуем спектр
        if (displayMode === 'spectrum' || displayMode === 'both') {
            drawSpectrum(spectrum);
        }

        // Рисуем водопад
        if (displayMode === 'waterfall' || displayMode === 'both') {
            drawWaterfall(spectrum);
        }

    }, [data, displayMode]);

    /**
     * Рисование спектра с помощью D3
     */
    const drawSpectrum = (spectrum) => {
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const spectrumHeight = displayMode === 'both' ? height / 2 - 20 : height;
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = spectrumHeight - margin.top - margin.bottom;

        // Масштабы
        const xScale = d3.scaleLinear()
            .domain([0, spectrum.length])
            .range([0, plotWidth]);

        const yScale = d3.scaleLinear()
            .domain([d3.min(spectrum), d3.max(spectrum)])
            .range([plotHeight, 0]);

        // Создаём группу для графика
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Фон
        g.append('rect')
            .attr('width', plotWidth)
            .attr('height', plotHeight)
            .attr('fill', '#0a0a0a');

        // Сетка
        const xGrid = d3.axisBottom(xScale)
            .tickSize(plotHeight)
            .tickFormat('');

        const yGrid = d3.axisLeft(yScale)
            .tickSize(-plotWidth)
            .tickFormat('');

        g.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${plotHeight})`)
            .call(xGrid)
            .selectAll('line')
            .attr('stroke', '#1a1a1a')
            .attr('stroke-opacity', 0.3);

        g.append('g')
            .attr('class', 'grid')
            .call(yGrid)
            .selectAll('line')
            .attr('stroke', '#1a1a1a')
            .attr('stroke-opacity', 0.3);

        // Линия спектра
        const line = d3.line()
            .x((d, i) => xScale(i))
            .y(d => yScale(d))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(Array.from(spectrum))
            .attr('fill', 'none')
            .attr('stroke', '#00ff88')
            .attr('stroke-width', 1.5)
            .attr('d', line);

        // Заливка под кривой
        const area = d3.area()
            .x((d, i) => xScale(i))
            .y0(plotHeight)
            .y1(d => yScale(d))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(Array.from(spectrum))
            .attr('fill', 'url(#spectrumGradient)')
            .attr('opacity', 0.3)
            .attr('d', area);

        // Градиент
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'spectrumGradient')
            .attr('x1', '0%')
            .attr('x2', '0%')
            .attr('y1', '0%')
            .attr('y2', '100%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#00ff88')
            .attr('stop-opacity', 0.8);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#00ff88')
            .attr('stop-opacity', 0);

        // Оси
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d => Math.round(d * 24000 / spectrum.length) + ' Hz');

        const yAxis = d3.axisLeft(yScale)
            .ticks(8)
            .tickFormat(d => d.toFixed(0) + ' dB');

        g.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${plotHeight})`)
            .call(xAxis)
            .selectAll('text')
            .attr('fill', '#aaa')
            .style('font-size', '11px');

        g.append('g')
            .attr('class', 'axis y-axis')
            .call(yAxis)
            .selectAll('text')
            .attr('fill', '#aaa')
            .style('font-size', '11px');

        // Подписи осей
        g.append('text')
            .attr('x', plotWidth / 2)
            .attr('y', plotHeight + 35)
            .attr('fill', '#ccc')
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Частота (Hz)');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -plotHeight / 2)
            .attr('y', -45)
            .attr('fill', '#ccc')
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Мощность (dB)');
    };

    /**
     * Рисование водопада на Canvas
     */
    const drawWaterfall = (spectrum) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const waterfallHeight = displayMode === 'both' ? height / 2 : height;

        // Добавляем новую линию спектра
        waterfallDataRef.current.push(Array.from(spectrum));
        
        // Ограничиваем количество линий
        if (waterfallDataRef.current.length > maxWaterfallLines) {
            waterfallDataRef.current.shift();
        }

        // Очищаем canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, waterfallHeight);

        const lineHeight = waterfallHeight / maxWaterfallLines;
        const spectrumWidth = spectrum.length;
        const pixelWidth = width / spectrumWidth;

        // Находим мин/макс для нормализации цвета
        const allValues = waterfallDataRef.current.flat();
        const minDb = d3.min(allValues);
        const maxDb = d3.max(allValues);

        // Цветовая шкала
        const colorScale = d3.scaleSequential(d3.interpolateInferno)
            .domain([minDb, maxDb]);

        // Рисуем каждую линию водопада
        waterfallDataRef.current.forEach((line, lineIndex) => {
            const y = lineIndex * lineHeight;

            line.forEach((value, i) => {
                const x = i * pixelWidth;
                const color = colorScale(value);
                
                ctx.fillStyle = color;
                ctx.fillRect(x, y, Math.ceil(pixelWidth), Math.ceil(lineHeight));
            });
        });

        // Добавляем цветовую шкалу справа
        drawColorScale(ctx, colorScale, minDb, maxDb, waterfallHeight);
    };

    /**
     * Рисование цветовой шкалы
     */
    const drawColorScale = (ctx, colorScale, minDb, maxDb, waterfallHeight) => {
        const scaleWidth = 30;
        const scaleHeight = waterfallHeight - 40;
        const scaleX = width - scaleWidth - 10;
        const scaleY = 20;

        // Рисуем градиент
        const steps = 100;
        const stepHeight = scaleHeight / steps;

        for (let i = 0; i < steps; i++) {
            const value = minDb + (maxDb - minDb) * (1 - i / steps);
            ctx.fillStyle = colorScale(value);
            ctx.fillRect(scaleX, scaleY + i * stepHeight, scaleWidth, Math.ceil(stepHeight));
        }

        // Рамка
        ctx.strokeStyle = '#666';
        ctx.strokeRect(scaleX, scaleY, scaleWidth, scaleHeight);

        // Подписи
        ctx.fillStyle = '#ccc';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${maxDb.toFixed(0)} dB`, scaleX - 5, scaleY + 5);
        ctx.fillText(`${minDb.toFixed(0)} dB`, scaleX - 5, scaleY + scaleHeight);
    };

    return (
        <div className="spectrum-analyzer">
            <div className="controls">
                <button 
                    className={displayMode === 'spectrum' ? 'active' : ''}
                    onClick={() => setDisplayMode('spectrum')}
                >
                    Спектр
                </button>
                <button 
                    className={displayMode === 'waterfall' ? 'active' : ''}
                    onClick={() => setDisplayMode('waterfall')}
                >
                    Водопад
                </button>
                <button 
                    className={displayMode === 'both' ? 'active' : ''}
                    onClick={() => setDisplayMode('both')}
                >
                    Оба
                </button>
            </div>

            <div className="visualization-container">
                {(displayMode === 'spectrum' || displayMode === 'both') && (
                    <svg 
                        ref={svgRef} 
                        width={width} 
                        height={displayMode === 'both' ? height / 2 : height}
                        className="spectrum-svg"
                    />
                )}
                
                {(displayMode === 'waterfall' || displayMode === 'both') && (
                    <canvas 
                        ref={canvasRef} 
                        width={width} 
                        height={displayMode === 'both' ? height / 2 : height}
                        className="waterfall-canvas"
                    />
                )}
            </div>
        </div>
    );
});

SpectrumAnalyzer.propTypes = {
    data: PropTypes.oneOfType([
        PropTypes.instanceOf(Float32Array),
        PropTypes.object
    ]),
    width: PropTypes.number,
    height: PropTypes.number,
    mode: PropTypes.oneOf(['spectrum', 'waterfall', 'both'])
};

export default SpectrumAnalyzer;
