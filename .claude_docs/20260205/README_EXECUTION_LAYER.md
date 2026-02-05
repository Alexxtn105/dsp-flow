# DSP Flow Editor - Execution Layer

## 🎯 Обзор

Execution Layer — это система выполнения графов обработки сигналов в реальном времени для DSP Flow Editor.

## 🏗️ Архитектура

### 1. Graph Compiler (`src/engine/GraphCompiler.js`)

**Функциональность:**
- ✅ Проверка типов соединений (совместимость real/complex сигналов)
- ✅ Обнаружение циклов (DFS алгоритм)
- ✅ Топологическая сортировка (алгоритм Кана)
- ✅ Генерация execution plan с зависимостями

**Пример использования:**
```javascript
import { GraphCompiler } from './engine';

const compiler = new GraphCompiler();
const result = compiler.compile(nodes, edges);

if (result.success) {
    console.log('Execution order:', result.compiledGraph.executionOrder);
} else {
    console.error('Errors:', result.errors);
}
```

### 2. DSP Library (`src/engine/DSPLib.js`)

**Реализованные блоки:**
- КИХ-фильтры (ФНЧ, ФВЧ, полосовой)
- Преобразование Гильберта
- БПФ (FFT.js)
- Скользящее БПФ для водопада
- Генераторы (синус, косинус)
- Математические операции (интегратор, сумматор, перемножитель)
- Детекторы (фазовый, частотный)

**Пример:**
```javascript
import DSPLib from './engine/DSPLib';

// Генерация сигнала
const signal = DSPLib.generateSine(1000, 1.0, 48000, 1024);

// Фильтрация
const coeffs = DSPLib.generateFIRCoefficients(64, 3000, 48000, 'lowpass');
const filtered = DSPLib.firFilter(signal, coeffs);

// БПФ
const fft = DSPLib.fft(filtered, 2048);
const spectrum = DSPLib.powerSpectrum(fft);
```

### 3. DSP Engine (`src/engine/DSPEngine.js`)

**Функции:**
- Исполнение компилированного графа
- Управление потоком данных между узлами
- Буферизация и обработка в реальном времени
- Сбор статистики выполнения

**Пример:**
```javascript
import { DSPEngine } from './engine';

const engine = new DSPEngine();
engine.initialize(compiledGraph, {
    sampleRate: 48000,
    bufferSize: 1024
});

engine.start();

// Выполнение циклов
const outputs = engine.executeOneCycle();
console.log('Sink outputs:', outputs);
```

### 4. State Management (`src/stores/DSPExecutionStore.js`)

**MobX Store для реактивного управления:**
- Observable состояние выполнения
- Автоматическое обновление UI
- Управление циклом выполнения
- Хранение данных визуализации

**Пример:**
```javascript
import { dspExecutionStore } from './stores/DSPExecutionStore';
import { observer } from 'mobx-react-lite';

const MyComponent = observer(() => {
    return (
        <div>
            Running: {dspExecutionStore.isRunning ? 'Yes' : 'No'}
            Cycles: {dspExecutionStore.executionStats.cyclesExecuted}
        </div>
    );
});
```

### 5. Visualization Layer

#### SpectrumAnalyzer (`src/components/visualization/SpectrumAnalyzer.jsx`)
- **Режимы:** спектр, водопад, оба
- **Технологии:** D3.js для спектра, Canvas для водопада
- **Цветовая шкала:** Inferno colormap (d3.interpolateInferno)

```javascript
<SpectrumAnalyzer 
    data={signalData}
    width={800}
    height={600}
    mode="both"
/>
```

#### Oscilloscope (`src/components/visualization/Oscilloscope.jsx`)
- Временная область сигнала
- Статистика (Max, Min, Avg, RMS)
- D3.js визуализация

```javascript
<Oscilloscope 
    data={timeSeriesData}
    width={800}
    height={400}
/>
```

#### ConstellationDiagram (`src/components/visualization/ConstellationDiagram.jsx`)
- IQ диаграмма для комплексных сигналов
- Вычисление EVM (Error Vector Magnitude)
- Цветовая шкала по магнитуде

```javascript
<ConstellationDiagram 
    data={{ real, imag }}
    width={600}
    height={600}
/>
```

## 🚀 Использование

### Установка зависимостей
```bash
npm install
```

### Запуск в режиме разработки
```bash
npm run dev
```

### Создание схемы

1. **Добавьте блоки** из библиотеки (левая панель)
2. **Соедините блоки** - редактор автоматически проверит совместимость типов
3. **Настройте параметры** блоков
4. **Добавьте визуализацию** (Осциллограф, Спектроанализатор, Фазовое созвездие)
5. **Запустите выполнение** кнопкой "Старт"

### Пример схемы

```
[Входной сигнал] → [КИХ-Фильтр] → [Преобразователь Гильберта] → [Фазовое созвездие]
     1000 Hz              ФНЧ                   64 порядок              IQ diagram
                         3000 Hz
```

## 🔧 API Reference

### GraphCompiler

```typescript
class GraphCompiler {
    compile(nodes, edges): CompilationResult
    detectCycles(): Cycle[]
    topologicalSort(): Node[]
    generateExecutionPlan(nodes): ExecutionPlan
}
```

### DSPEngine

```typescript
class DSPEngine {
    initialize(compiledGraph, config)
    start(): boolean
    stop(): boolean
    executeOneCycle(): SinkOutputs
    getStats(): ExecutionStats
}
```

### DSPExecutionStore

```typescript
class DSPExecutionStore {
    // Observables
    isRunning: boolean
    compiledGraph: CompiledGraph | null
    executionData: Map<nodeId, data>
    visualizationData: Map<nodeId, data>
    
    // Actions
    compile(nodes, edges): Result
    start(): boolean
    stop(): boolean
    
    // Computed
    hasErrors: boolean
    canStart: boolean
}
```

## 📊 Производительность

- **Частота обновления:** до 60 FPS
- **Размер буфера:** 1024 сэмпла (настраивается)
- **Частота дискретизации:** 48000 Hz (настраивается)
- **Максимум узлов:** не ограничено (зависит от производительности)

## 🎨 Цветовые схемы

### Спектр
- Линия спектра: `#00ff88` (зелёный)
- Градиент заливки: `#00ff88` с opacity

### Водопад
- Цветовая карта: `d3.interpolateInferno`
- Диапазон: от синего (низкий уровень) до жёлтого (высокий)

### Осциллограф
- Сигнал: `#00ccff` (голубой)
- Нулевая линия: `#00ff88` (пунктир)

### Фазовое созвездие
- Точки: `d3.interpolatePlasma` по магнитуде
- Сетка: `#1a1a1a` / `#00ff88` (оси)

## 🐛 Отладка

### Логи компиляции
```javascript
// Включить подробные логи
localStorage.setItem('DSP_DEBUG', 'true');
```

### Статистика выполнения
```javascript
console.log(dspExecutionStore.executionStats);
// {
//   totalSamples: 102400,
//   executionTime: 15.2,
//   cyclesExecuted: 100
// }
```

## 📝 TODO

- [ ] Добавить поддержку пользовательских блоков
- [ ] Реализовать экспорт/импорт схем с кодом выполнения
- [ ] Добавить SIMD оптимизации для DSP операций
- [ ] Реализовать Web Workers для фоновой обработки
- [ ] Добавить поддержку GPU ускорения (WebGL)
- [ ] Реализовать real-time аудио input/output (Web Audio API)

## 🤝 Contributing

1. Fork репозиторий
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT

## 👥 Авторы

DSP Flow Editor Team
