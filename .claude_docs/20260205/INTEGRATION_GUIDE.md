# Руководство по интеграции Execution Layer

## 📋 Пошаговая интеграция в существующий проект

### Шаг 1: Установка зависимостей

Добавьте в `package.json`:

```json
{
  "dependencies": {
    "mobx": "^6.10.2",
    "mobx-react-lite": "^4.0.5",
    "d3": "^7.8.5",
    "fft.js": "^4.0.4"
  }
}
```

Затем выполните:
```bash
npm install
```

### Шаг 2: Структура папок

Создайте следующую структуру:

```
src/
├── engine/
│   ├── GraphCompiler.js
│   ├── DSPEngine.js
│   ├── DSPLib.js
│   └── index.js
├── stores/
│   └── DSPExecutionStore.js
└── components/
    └── visualization/
        ├── SpectrumAnalyzer.jsx
        ├── SpectrumAnalyzer.css
        ├── Oscilloscope.jsx
        ├── Oscilloscope.css
        ├── ConstellationDiagram.jsx
        ├── ConstellationDiagram.css
        ├── VisualizationPanel.jsx
        ├── VisualizationPanel.css
        └── index.js
```

### Шаг 3: Копирование файлов

Скопируйте созданные файлы:

```bash
# Engine
cp /home/claude/src/engine/* src/engine/

# Store
cp /home/claude/src/stores/DSPExecutionStore.js src/stores/

# Visualization
cp /home/claude/src/components/visualization/* src/components/visualization/
```

### Шаг 4: Обновление DSPEditor

Замените существующий `DSPEditor.jsx` на интегрированную версию или добавьте следующие изменения:

```javascript
// Добавьте импорты
import { observer } from 'mobx-react-lite';
import { dspExecutionStore } from '../../../stores/DSPExecutionStore';
import VisualizationPanel from '../../visualization/VisualizationPanel';

// Оберните компонент в observer
const DSPEditor = observer(({ ... }) => {
    // ... существующий код ...
    
    // Добавьте компиляцию при изменении графа
    useEffect(() => {
        if (nodes.length === 0) return;
        
        const result = dspExecutionStore.compile(nodes, edges);
        if (!result.success) {
            console.error('Compilation errors:', result.errors);
        }
    }, [nodes, edges]);
    
    // Добавьте панель визуализации
    return (
        <>
            <div className="dsp-editor">
                {/* ... существующий ReactFlow ... */}
            </div>
            
            {showVisualization && (
                <VisualizationPanel isDarkTheme={isDarkTheme} />
            )}
        </>
    );
});
```

### Шаг 5: Обновление App.jsx

Обновите обработчики старта/стопа:

```javascript
import { observer } from 'mobx-react-lite';
import { dspExecutionStore } from './stores/DSPExecutionStore';

const App = observer(() => {
    // ... существующий код ...
    
    const handleStartSimulation = useCallback(() => {
        if (stats.nodesCount === 0) {
            alert('Добавьте хотя бы один узел для запуска симуляции');
            return;
        }

        const result = dspExecutionStore.start();
        
        if (!result) {
            if (dspExecutionStore.hasErrors) {
                const errors = dspExecutionStore.compilationErrors
                    .map(e => e.message)
                    .join('\n');
                alert('Ошибки компиляции графа:\n' + errors);
            }
        }
    }, [stats]);

    const handleStopSimulation = useCallback(() => {
        dspExecutionStore.stop();
    }, []);
    
    // Используйте dspExecutionStore.isRunning вместо локального состояния
    return (
        <div className="app">
            {/* ... */}
            <Footer
                isRunning={dspExecutionStore.isRunning}
                onStart={handleStartSimulation}
                onStop={handleStopSimulation}
                {/* ... */}
            />
        </div>
    );
});

export default App;
```

### Шаг 6: Обновление стилей

Добавьте в `App.css`:

```css
.app-content {
    position: relative;
    flex: 1;
    overflow: hidden;
}

/* Для панели визуализации */
.visualization-panel {
    /* Стили уже в VisualizationPanel.css */
}
```

### Шаг 7: Тестирование

1. **Создайте простую схему:**
   - Входной сигнал → Осциллограф

2. **Запустите симуляцию:**
   - Нажмите "Старт" в футере
   - Убедитесь, что панель визуализации появилась

3. **Проверьте спектр:**
   - Добавьте Спектроанализатор
   - Запустите и проверьте водопад

4. **Проверьте фильтрацию:**
   - Входной сигнал → КИХ-Фильтр → Спектроанализатор
   - Измените частоту среза и проверьте результат

### Шаг 8: Оптимизация производительности

#### Настройка размера буфера

```javascript
// В начале приложения
dspExecutionStore.updateConfig({
    sampleRate: 48000,
    bufferSize: 1024  // Меньше = выше FPS, но больше нагрузка
});
```

#### Ограничение FPS

```javascript
// В DSPExecutionStore.js, метод runExecutionLoop
runExecutionLoop() {
    if (!this.isRunning) return;
    
    // Ограничить до 30 FPS
    setTimeout(() => {
        this.executeStep();
        this.animationFrameId = requestAnimationFrame(() => {
            this.runExecutionLoop();
        });
    }, 1000 / 30);
}
```

### Шаг 9: Отладка

#### Включите детальные логи

```javascript
// В начале App.jsx
if (process.env.NODE_ENV === 'development') {
    window.DSP_DEBUG = true;
}
```

#### Мониторинг производительности

```javascript
import { autorun } from 'mobx';

autorun(() => {
    const stats = dspExecutionStore.executionStats;
    console.log('Performance:', {
        fps: Math.round(1000 / stats.executionTime),
        cyclesExecuted: stats.cyclesExecuted,
        totalSamples: stats.totalSamples
    });
});
```

### Шаг 10: Расширение функциональности

#### Добавление нового DSP блока

1. **Добавьте в DSPLib.js:**

```javascript
static customFilter(input, params) {
    const output = new Float32Array(input.length);
    // Ваша логика обработки
    return output;
}
```

2. **Добавьте в DSPEngine.js:**

```javascript
case DSP_BLOCK_TYPES.CUSTOM_FILTER:
    output = this.processCustomFilter(inputs[0], params);
    break;

// ...

processCustomFilter(input, params) {
    if (!input) return new Float32Array(this.bufferSize);
    return DSPLib.customFilter(input, params);
}
```

3. **Добавьте в constants.js:**

```javascript
export const DSP_BLOCK_TYPES = {
    // ... существующие ...
    CUSTOM_FILTER: 'Кастомный фильтр'
};
```

#### Добавление новой визуализации

1. **Создайте компонент:**

```javascript
// CustomVisualizer.jsx
import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';

const CustomVisualizer = observer(({ data, width, height }) => {
    const canvasRef = useRef(null);
    
    useEffect(() => {
        if (!data || !canvasRef.current) return;
        
        const ctx = canvasRef.current.getContext('2d');
        // Ваша логика визуализации
        
    }, [data]);
    
    return <canvas ref={canvasRef} width={width} height={height} />;
});

export default CustomVisualizer;
```

2. **Добавьте в VisualizationPanel.jsx:**

```javascript
import CustomVisualizer from './CustomVisualizer';

// В renderVisualization:
case 'custom':
    return <CustomVisualizer data={vis.data} />;
```

## 🔧 Troubleshooting

### Проблема: "Cannot find module 'mobx'"

**Решение:**
```bash
npm install mobx mobx-react-lite
```

### Проблема: "FFT is not a constructor"

**Решение:**
```bash
npm install fft.js --save
```

### Проблема: "d3 is not defined"

**Решение:**
```bash
npm install d3
```

### Проблема: Низкая производительность

**Решение:**
- Уменьшите `bufferSize` в конфигурации
- Увеличьте интервал обновления визуализации
- Используйте `useMemo` для тяжёлых вычислений
- Ограничьте количество точек в графиках

### Проблема: Водопад не отображается

**Решение:**
- Проверьте, что canvas имеет корректные width/height
- Убедитесь, что данные приходят корректного формата
- Проверьте цветовую шкалу (minDb, maxDb)

## 📚 Дополнительные ресурсы

- [MobX документация](https://mobx.js.org/)
- [D3.js примеры](https://observablehq.com/@d3/gallery)
- [FFT.js GitHub](https://github.com/indutny/fft.js)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## ✅ Checklist интеграции

- [ ] Установлены все зависимости
- [ ] Скопированы файлы engine
- [ ] Создан DSPExecutionStore
- [ ] Добавлены компоненты визуализации
- [ ] Обновлён DSPEditor с observer
- [ ] Обновлён App.jsx с observer
- [ ] Проверена компиляция графа
- [ ] Работает запуск/остановка
- [ ] Отображается Oscilloscope
- [ ] Отображается SpectrumAnalyzer
- [ ] Работает водопад
- [ ] Отображается ConstellationDiagram
- [ ] Проверена производительность
- [ ] Настроена отладка

## 🎉 Готово!

Теперь ваш DSP Flow Editor имеет полнофункциональный Execution Layer с визуализацией в реальном времени!
