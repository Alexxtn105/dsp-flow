/**
 * ConstellationDiagram - диаграмма фазового созвездия для комплексных сигналов
 */

import { useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';
import './ConstellationDiagram.css';

const ConstellationDiagram = memo(({ data, width = 600, height = 600 }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || !svgRef.current) return;

        const calculateEVM = (points) => {
            if (points.length === 0) return 0;
            const avgMagnitude = d3.mean(points, d => d.magnitude);
            const errorSquares = points.map(p => {
                const error = p.magnitude - avgMagnitude;
                return error * error;
            });
            const rmsError = Math.sqrt(d3.mean(errorSquares));
            return (rmsError / avgMagnitude) * 100;
        };

        const complexData = data;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 40, right: 40, bottom: 40, left: 40 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;

        // Извлекаем действительную и мнимую части
        let real, imag;

        if (complexData.real && complexData.imag) {
            real = Array.from(complexData.real);
            imag = Array.from(complexData.imag);
        } else {
            // Если это просто массив, считаем его действительным
            real = Array.from(complexData);
            imag = new Array(real.length).fill(0);
        }

        // Находим максимальные значения для масштабирования
        const maxReal = Math.max(...real.map(Math.abs));
        const maxImag = Math.max(...imag.map(Math.abs));
        const maxValue = Math.max(maxReal, maxImag) * 1.2;

        // Масштабы
        const xScale = d3.scaleLinear()
            .domain([-maxValue, maxValue])
            .range([0, plotWidth]);

        const yScale = d3.scaleLinear()
            .domain([-maxValue, maxValue])
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
        const gridLines = 10;
        const gridStep = maxValue * 2 / gridLines;

        // Вертикальные линии
        for (let i = 0; i <= gridLines; i++) {
            const value = -maxValue + i * gridStep;
            g.append('line')
                .attr('x1', xScale(value))
                .attr('x2', xScale(value))
                .attr('y1', 0)
                .attr('y2', plotHeight)
                .attr('stroke', value === 0 ? '#00ff88' : '#1a1a1a')
                .attr('stroke-width', value === 0 ? 1.5 : 0.5)
                .attr('opacity', value === 0 ? 0.8 : 0.3);
        }

        // Горизонтальные линии
        for (let i = 0; i <= gridLines; i++) {
            const value = -maxValue + i * gridStep;
            g.append('line')
                .attr('x1', 0)
                .attr('x2', plotWidth)
                .attr('y1', yScale(value))
                .attr('y2', yScale(value))
                .attr('stroke', value === 0 ? '#00ff88' : '#1a1a1a')
                .attr('stroke-width', value === 0 ? 1.5 : 0.5)
                .attr('opacity', value === 0 ? 0.8 : 0.3);
        }

        // Окружности для reference
        const circles = [0.25, 0.5, 0.75, 1.0];
        circles.forEach(ratio => {
            g.append('circle')
                .attr('cx', xScale(0))
                .attr('cy', yScale(0))
                .attr('r', ratio * plotWidth / 2)
                .attr('fill', 'none')
                .attr('stroke', '#2a2a2a')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '2,2')
                .attr('opacity', 0.3);
        });

        // Точки созвездия
        const points = real.map((r, i) => ({
            x: r,
            y: imag[i],
            magnitude: Math.sqrt(r * r + imag[i] * imag[i]),
            phase: Math.atan2(imag[i], r)
        }));

        // Цветовая шкала по магнитуде
        const colorScale = d3.scaleSequential(d3.interpolatePlasma)
            .domain([0, d3.max(points, d => d.magnitude)]);

        // Рисуем точки
        g.selectAll('.point')
            .data(points)
            .enter()
            .append('circle')
            .attr('class', 'point')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 2)
            .attr('fill', d => colorScale(d.magnitude))
            .attr('opacity', 0.6);

        // Оси
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d => d.toFixed(1));

        const yAxis = d3.axisLeft(yScale)
            .ticks(10)
            .tickFormat(d => d.toFixed(1));

        g.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${plotHeight})`)
            .call(xAxis)
            .selectAll('text')
            .attr('fill', '#aaa')
            .style('font-size', '10px');

        g.append('g')
            .attr('class', 'axis y-axis')
            .call(yAxis)
            .selectAll('text')
            .attr('fill', '#aaa')
            .style('font-size', '10px');

        // Подписи осей
        g.append('text')
            .attr('x', plotWidth / 2)
            .attr('y', plotHeight + 35)
            .attr('fill', '#ccc')
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Действительная часть (I)');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -plotHeight / 2)
            .attr('y', -30)
            .attr('fill', '#ccc')
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Мнимая часть (Q)');

        // Заголовок
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', 20)
            .attr('fill', '#fff')
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .text('Фазовое созвездие (IQ диаграмма)');

        // Статистика
        const stats = g.append('g')
            .attr('class', 'stats')
            .attr('transform', `translate(10, 10)`);

        stats.append('rect')
            .attr('width', 160)
            .attr('height', 70)
            .attr('fill', '#1a1a1a')
            .attr('opacity', 0.8)
            .attr('rx', 4);

        const statsData = [
            `Точек: ${points.length}`,
            `Max mag: ${d3.max(points, d => d.magnitude).toFixed(3)}`,
            `Avg mag: ${d3.mean(points, d => d.magnitude).toFixed(3)}`,
            `EVM: ${calculateEVM(points).toFixed(2)}%`
        ];

        statsData.forEach((text, i) => {
            stats.append('text')
                .attr('x', 10)
                .attr('y', 20 + i * 16)
                .attr('fill', '#00ccff')
                .style('font-size', '11px')
                .style('font-family', 'monospace')
                .text(text);
        });
    }, [data, width, height]);

    return (
        <div className="constellation-diagram">
            <svg
                ref={svgRef}
                width={width}
                height={height}
                className="constellation-svg"
            />
        </div>
    );
});

ConstellationDiagram.propTypes = {
    data: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.instanceOf(Float32Array)
    ]),
    width: PropTypes.number,
    height: PropTypes.number
};

export default ConstellationDiagram;
