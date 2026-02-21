/**
 * Oscilloscope - компонент визуализации временной области сигнала
 */

import { useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';
import './Oscilloscope.css';

const Oscilloscope = memo(({ data, width = 800, height = 400, channels: _channels = 1 }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || !svgRef.current) return;

        const signal = Array.isArray(data) ? data : Array.from(data);

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;

        // Масштабы
        const xScale = d3.scaleLinear()
            .domain([0, signal.length])
            .range([0, plotWidth]);

        const yScale = d3.scaleLinear()
            .domain([d3.min(signal) * 1.1, d3.max(signal) * 1.1])
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
            .attr('stroke-opacity', 0.5);

        g.append('g')
            .attr('class', 'grid')
            .call(yGrid)
            .selectAll('line')
            .attr('stroke', '#1a1a1a')
            .attr('stroke-opacity', 0.5);

        // Нулевая линия
        g.append('line')
            .attr('x1', 0)
            .attr('x2', plotWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0))
            .attr('stroke', '#00ff88')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,4')
            .attr('opacity', 0.5);

        // Линия сигнала
        const line = d3.line()
            .x((d, i) => xScale(i))
            .y(d => yScale(d))
            .curve(d3.curveLinear);

        g.append('path')
            .datum(signal)
            .attr('fill', 'none')
            .attr('stroke', '#00ccff')
            .attr('stroke-width', 2)
            .attr('d', line);

        // Оси
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d => d.toFixed(0));

        const yAxis = d3.axisLeft(yScale)
            .ticks(8);

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
            .text('Отсчёты');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -plotHeight / 2)
            .attr('y', -45)
            .attr('fill', '#ccc')
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Амплитуда');

        // Статистика
        const stats = g.append('g')
            .attr('class', 'stats')
            .attr('transform', `translate(${plotWidth - 150}, 10)`);

        stats.append('rect')
            .attr('width', 140)
            .attr('height', 80)
            .attr('fill', '#1a1a1a')
            .attr('opacity', 0.8)
            .attr('rx', 4);

        const statsData = [
            `Max: ${d3.max(signal).toFixed(3)}`,
            `Min: ${d3.min(signal).toFixed(3)}`,
            `Avg: ${d3.mean(signal).toFixed(3)}`,
            `RMS: ${Math.sqrt(d3.mean(signal.map(x => x * x))).toFixed(3)}`
        ];

        statsData.forEach((text, i) => {
            stats.append('text')
                .attr('x', 10)
                .attr('y', 20 + i * 18)
                .attr('fill', '#00ccff')
                .style('font-size', '11px')
                .style('font-family', 'monospace')
                .text(text);
        });
    }, [data, width, height]);

    return (
        <div className="oscilloscope">
            <div className="oscilloscope-header">
                <span className="title">Осциллограф</span>
                <span className="status">● Live</span>
            </div>
            <svg
                ref={svgRef}
                width={width}
                height={height}
                className="oscilloscope-svg"
            />
        </div>
    );
});

Oscilloscope.propTypes = {
    data: PropTypes.oneOfType([
        PropTypes.instanceOf(Float32Array),
        PropTypes.array
    ]),
    width: PropTypes.number,
    height: PropTypes.number,
    channels: PropTypes.number
};

export default Oscilloscope;
