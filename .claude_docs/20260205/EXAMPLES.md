# Примеры использования Execution Layer

## Пример 1: Простая фильтрация сигнала

```javascript
// Создание узлов
const nodes = [
    {
        id: 'source',
        type: 'block',
        position: { x: 100, y: 100 },
        data: {
            label: 'Входной сигнал',
            blockType: 'Входной сигнал',
            params: { frequency: 1000, amplitude: 1.0 }
        }
    },
    {
        id: 'filter',
        type: 'block',
        position: { x: 400, y: 100 },
        data: {
            label: 'КИХ-Фильтр',
            blockType: 'КИХ-Фильтр',
            params: { order: 64, cutoff: 3000, filterType: 'lowpass' }
        }
    },
    {
        id: 'scope',
        type: 'block',
        position: { x: 700, y: 100 },
        data: {
            label: 'Осциллограф',
            blockType: 'Осциллограф',
            params: {}
        }
    }
];

const edges = [
    { id: 'e1', source: 'source', target: 'filter', type: 'real' },
    { id: 'e2', source: 'filter', target: 'scope', type: 'real' }
];

// Компиляция
import { dspExecutionStore } from './stores/DSPExecutionStore';

const result = dspExecutionStore.compile(nodes, edges);
console.log('Compilation:', result.success);

// Запуск
dspExecutionStore.start();
```

## Пример 2: Анализ спектра с БПФ

```javascript
const nodes = [
    {
        id: 'gen1',
        data: {
            blockType: 'Входной сигнал',
            params: { frequency: 1000, amplitude: 0.8 }
        }
    },
    {
        id: 'gen2',
        data: {
            blockType: 'Входной сигнал',
            params: { frequency: 2500, amplitude: 0.5 }
        }
    },
    {
        id: 'sum',
        data: {
            blockType: 'Сумматор',
            params: { numInputs: 2 }
        }
    },
    {
        id: 'fft',
        data: {
            blockType: 'БПФ',
            params: { fftSize: 2048 }
        }
    },
    {
        id: 'spectrum',
        data: {
            blockType: 'Спектроанализатор',
            params: { fftSize: 2048 }
        }
    }
];

const edges = [
    { source: 'gen1', target: 'sum', type: 'real' },
    { source: 'gen2', target: 'sum', type: 'real' },
    { source: 'sum', target: 'fft', type: 'real' },
    { source: 'fft', target: 'spectrum', type: 'complex' }
];
```

## Пример 3: Демодуляция с преобразованием Гильберта

```javascript
const nodes = [
    {
        id: 'modulated',
        data: {
            blockType: 'Входной сигнал',
            params: { frequency: 1000, amplitude: 1.0 }
        }
    },
    {
        id: 'hilbert',
        data: {
            blockType: 'Преобразователь Гильберта',
            params: { order: 64 }
        }
    },
    {
        id: 'refSine',
        data: {
            blockType: 'Референсный синусный генератор',
            params: { frequency: 1000, amplitude: 1.0 }
        }
    },
    {
        id: 'refCosine',
        data: {
            blockType: 'Референсный косинусный генератор',
            params: { frequency: 1000, amplitude: 1.0 }
        }
    },
    {
        id: 'multI',
        data: {
            blockType: 'Перемножитель',
            params: {}
        }
    },
    {
        id: 'multQ',
        data: {
            blockType: 'Перемножитель',
            params: {}
        }
    },
    {
        id: 'constellation',
        data: {
            blockType: 'Фазовое созвездие',
            params: {}
        }
    }
];

const edges = [
    // I канал
    { source: 'modulated', target: 'hilbert', type: 'real' },
    { source: 'hilbert', target: 'multI', type: 'complex' },
    { source: 'refCosine', target: 'multI', type: 'real' },
    
    // Q канал
    { source: 'hilbert', target: 'multQ', type: 'complex' },
    { source: 'refSine', target: 'multQ', type: 'real' },
    
    // Созвездие
    { source: 'multI', target: 'constellation', type: 'complex' },
    { source: 'multQ', target: 'constellation', type: 'complex' }
];
```

## Пример 4: Использование DSPLib напрямую

```javascript
import DSPLib from './engine/DSPLib';

// Генерация тестового сигнала
const sampleRate = 48000;
const duration = 1; // секунда
const numSamples = sampleRate * duration;

// Создаём смесь двух синусоид
const signal1 = DSPLib.generateSine(1000, 0.5, sampleRate, numSamples);
const signal2 = DSPLib.generateSine(3000, 0.3, sampleRate, numSamples);
const mixed = DSPLib.sum([signal1, signal2]);

// Фильтруем
const coeffs = DSPLib.generateFIRCoefficients(128, 2000, sampleRate, 'lowpass');
const filtered = DSPLib.firFilter(mixed, coeffs);

// Анализируем спектр
const fftResult = DSPLib.fft(filtered, 4096);
const spectrum = DSPLib.powerSpectrum(fftResult);
const dbSpectrum = DSPLib.toDecibels(spectrum);

// Визуализация
console.log('Spectrum:', dbSpectrum);
```

## Пример 5: Скользящее БПФ для водопада

```javascript
import DSPLib from './engine/DSPLib';

// Длинный сигнал
const signal = DSPLib.generateSine(1000, 1.0, 48000, 48000);

// Скользящее БПФ
const windowSize = 1024;
const hopSize = 512; // 50% overlap
const waterfallData = DSPLib.slidingFFT(signal, windowSize, hopSize, 2048);

// Результат - массив спектров во времени
waterfallData.forEach((frame, i) => {
    console.log(`Frame ${i} at time ${frame.timestamp}:`, frame.spectrum);
});
```

## Пример 6: Мониторинг состояния выполнения

```javascript
import { dspExecutionStore } from './stores/DSPExecutionStore';
import { autorun } from 'mobx';

// Автоматическая реакция на изменения
const dispose = autorun(() => {
    console.log('Running:', dspExecutionStore.isRunning);
    console.log('Cycles:', dspExecutionStore.executionStats.cyclesExecuted);
    console.log('Execution time:', dspExecutionStore.executionStats.executionTime, 'ms');
    console.log('FPS:', Math.round(1000 / dspExecutionStore.executionStats.executionTime));
});

// Остановить мониторинг
// dispose();
```

## Пример 7: Получение данных визуализации

```javascript
import { dspExecutionStore } from './stores/DSPExecutionStore';
import { observer } from 'mobx-react-lite';

const MyVisualization = observer(({ nodeId }) => {
    const data = dspExecutionStore.getVisualizationData(nodeId);
    
    if (!data) {
        return <div>Нет данных</div>;
    }
    
    return (
        <div>
            <h3>Тип: {data.type}</h3>
            <pre>{JSON.stringify(data.data)}</pre>
            <small>Обновлено: {new Date(data.timestamp).toLocaleTimeString()}</small>
        </div>
    );
});
```

## Пример 8: Кастомная визуализация

```javascript
import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { dspExecutionStore } from './stores/DSPExecutionStore';
import * as d3 from 'd3';

const CustomVisualizer = observer(({ nodeId }) => {
    const svgRef = useRef(null);
    
    useEffect(() => {
        const data = dspExecutionStore.getExecutionData(nodeId);
        if (!data || !svgRef.current) return;
        
        // Очищаем SVG
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        
        // Создаём визуализацию
        const width = 800;
        const height = 400;
        const signal = Array.from(data);
        
        const xScale = d3.scaleLinear()
            .domain([0, signal.length])
            .range([0, width]);
            
        const yScale = d3.scaleLinear()
            .domain([d3.min(signal), d3.max(signal)])
            .range([height, 0]);
        
        const line = d3.line()
            .x((d, i) => xScale(i))
            .y(d => yScale(d));
        
        svg.append('path')
            .datum(signal)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 2)
            .attr('d', line);
            
    }, [nodeId, dspExecutionStore.executionData]);
    
    return <svg ref={svgRef} width={800} height={400} />;
});
```

## Пример 9: Обработка ошибок компиляции

```javascript
import { dspExecutionStore } from './stores/DSPExecutionStore';

const result = dspExecutionStore.compile(nodes, edges);

if (!result.success) {
    result.errors.forEach(error => {
        switch (error.type) {
            case 'TYPE_MISMATCH':
                console.error(`Несовместимые типы: ${error.source} → ${error.target}`);
                break;
                
            case 'CYCLE_DETECTED':
                console.error('Обнаружены циклы:', error.cycles);
                break;
                
            case 'INVALID_CONNECTION':
                console.error('Неверное соединение:', error.edge);
                break;
                
            default:
                console.error('Ошибка:', error.message);
        }
    });
}
```

## Пример 10: Настройка параметров движка

```javascript
import { dspExecutionStore } from './stores/DSPExecutionStore';

// Изменить частоту дискретизации и размер буфера
dspExecutionStore.updateConfig({
    sampleRate: 96000,  // 96 kHz
    bufferSize: 2048    // больший буфер
});

// Компиляция и запуск с новыми параметрами
dspExecutionStore.compile(nodes, edges);
dspExecutionStore.start();
```
