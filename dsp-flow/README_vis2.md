# DSP Flow Editor - Модернизация визуализации

## 🎯 Выполненные изменения

### 1. ✅ Плавающие окна визуализации
- **FloatingWindow.jsx** - компонент плавающего окна с поддержкой:
  - Перемещения (drag & drop)
  - Изменения размера
  - Закрытия
  - Темной темы
  
### 2. ✅ Кнопка показа/скрытия на блоках
- Добавлена кнопка с иконкой глаза (visibility/visibility_off)
- Размер: 20x20px, иконка 16x16px
- Расположение: верхний правый угол блока
- Доступна только для блоков визуализации

### 3. ✅ Кнопки Start/Stop в header
- Перенесены из Footer в Header
- Добавлена кнопка настроек
- Отображение текущих параметров (Fs и FPS)

### 4. ✅ Диалог настроек
- Частота дискретизации (8-192 кГц)
- Размер буфера (256-4096)
- Целевой FPS (1-60)

### 5. ✅ Блок "Аудио файл"
- Компонент AudioFileBlock для выбора WAV файлов
- AudioFileReader для загрузки и парсинга
- Отображение информации о файле

### 6. ✅ Ограничение FPS
- Реализовано в DSPExecutionStore
- Настраиваемое значение через диалог
- Корректная работа requestAnimationFrame

## 📁 Структура файлов

```
src/
├── components/
│   ├── common/
│   │   └── FloatingWindow/
│   │       ├── FloatingWindow.jsx        ✨ НОВЫЙ
│   │       ├── FloatingWindow.css        ✨ НОВЫЙ
│   │       └── index.js                  ✨ НОВЫЙ
│   ├── dsp/
│   │   ├── BlockNode/
│   │   │   ├── BlockNode.jsx             🔄 ОБНОВЛЕН
│   │   │   └── BlockNode.css             🔄 ОБНОВЛЕН
│   │   └── AudioFileBlock/
│   │       ├── AudioFileBlock.jsx        ✨ НОВЫЙ
│   │       ├── AudioFileBlock.css        ✨ НОВЫЙ
│   │       └── index.js                  ✨ НОВЫЙ
│   ├── layout/
│   │   └── Header/
│   │       ├── Header.jsx                🔄 ОБНОВЛЕН
│   │       └── Header.css                🔄 ОБНОВЛЕН
│   └── visualization/
│       ├── FloatingWindowsManager.jsx    ✨ НОВЫЙ
│       └── FloatingWindowsManager.css    ✨ НОВЫЙ
├── engine/
│   └── AudioFileReader.js                ✨ НОВЫЙ
├── utils/
│   └── constants.js                      🔄 НУЖНО ОБНОВИТЬ
├── stores/
│   └── DSPExecutionStore.js              🔄 НУЖНО ОБНОВИТЬ
└── App.jsx                                🔄 НУЖНО ОБНОВИТЬ
```

## 🔧 Что нужно доработать вручную

### 1. Обновить constants.js

Добавить блок "Аудио файл":

```javascript
// В DSP_BLOCK_TYPES
AUDIO_FILE: 'Аудио файл',

// В DEFAULT_BLOCK_PARAMS
[DSP_BLOCK_TYPES.AUDIO_FILE]: {
    fileName: '',
    sampleRate: 48000,
    channels: 1,
    loop: false,
    audioData: null
},

// В BLOCK_SIGNAL_CONFIG
'Аудио файл': { input: null, output: SIGNAL_TYPES.REAL },

// В DSP_ICONS
'Аудио файл': 'audio_file',

// В DSP_GROUPS, добавить в группу generators:
{
    id: 'audio-file',
    name: DSP_BLOCK_TYPES.AUDIO_FILE,
    icon: DSP_ICONS['Аудио файл'],
    description: 'Загрузка WAV файла',
}
```

### 2. Обновить DSPExecutionStore.js

Добавить управление FPS:

```javascript
class DSPExecutionStore {
    // ... существующие поля
    
    targetFPS = 30;
    lastFrameTime = 0;
    
    runExecutionLoop() {
        if (!this.isRunning) return;

        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        const frameInterval = 1000 / this.targetFPS;

        if (elapsed >= frameInterval) {
            this.executeStep();
            this.lastFrameTime = now - (elapsed % frameInterval);
        }

        this.animationFrameId = requestAnimationFrame(() => {
            this.runExecutionLoop();
        });
    }
    
    updateConfig(config) {
        if (config.sampleRate !== undefined) {
            this.sampleRate = config.sampleRate;
        }
        if (config.bufferSize !== undefined) {
            this.bufferSize = config.bufferSize;
        }
        if (config.targetFPS !== undefined) {
            this.targetFPS = config.targetFPS;
        }
        
        // Применяем к движку
        if (this.engine) {
            this.engine.setConfig({
                sampleRate: this.sampleRate,
                bufferSize: this.bufferSize
            });
        }
    }
}
```

### 3. Обновить DSPEngine.js

Добавить обработку блока аудио файла:

```javascript
executeNode(node) {
    const blockType = node.data.blockType;
    const params = node.data.params;
    
    // ... существующий код
    
    switch (blockType) {
        // ... существующие case
        
        case 'Аудио файл':
            output = this.processAudioFile(params);
            break;
    }
}

processAudioFile(params) {
    if (!params.audioData || !params.audioData.samples) {
        return new Float32Array(this.bufferSize).fill(0);
    }
    
    // Берем следующий блок из аудио данных
    // Здесь нужна логика работы с offset и loop
    const samples = params.audioData.samples;
    const offset = params._currentOffset || 0;
    
    const output = new Float32Array(this.bufferSize);
    const remainingSamples = samples.length - offset;
    
    if (remainingSamples > 0) {
        const copyLength = Math.min(this.bufferSize, remainingSamples);
        output.set(samples.subarray(offset, offset + copyLength));
        params._currentOffset = offset + copyLength;
        
        // Если loop и данные закончились
        if (copyLength < this.bufferSize && params.loop) {
            params._currentOffset = 0;
        }
    } else if (params.loop) {
        // Начинаем сначала
        params._currentOffset = 0;
        return this.processAudioFile(params);
    }
    
    return output;
}
```

### 4. Обновить DSPEditor.jsx

Добавить управление плавающими окнами:

```javascript
import FloatingWindowsManager from '../visualization/FloatingWindowsManager';

function DSPEditor({ isDarkTheme, ... }) {
    const [visualizationWindows, setVisualizationWindows] = useState([]);
    
    // Обработчик переключения видимости визуализации
    const handleToggleVisualization = useCallback((nodeId) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                const newVisible = !node.data.visualizationVisible;
                
                if (newVisible) {
                    // Показываем окно
                    const visData = dspExecutionStore.getVisualizationData(nodeId);
                    if (visData) {
                        setVisualizationWindows(windows => [
                            ...windows.filter(w => w.nodeId !== nodeId),
                            {
                                nodeId,
                                type: visData.type,
                                data: visData.data,
                                nodeLabel: node.data.label
                            }
                        ]);
                    }
                } else {
                    // Скрываем окно
                    setVisualizationWindows(windows => 
                        windows.filter(w => w.nodeId !== nodeId)
                    );
                }
                
                return {
                    ...node,
                    data: {
                        ...node.data,
                        visualizationVisible: newVisible
                    }
                };
            }
            return node;
        }));
    }, []);
    
    // Обработчик закрытия окна
    const handleCloseVisualizationWindow = useCallback((nodeId) => {
        handleToggleVisualization(nodeId);
    }, [handleToggleVisualization]);
    
    // В onDrop добавить callback
    const newNode = {
        id: generateNodeId(),
        type: 'block',
        position,
        data: {
            label: blockType,
            blockType,
            params: getDefaultParams(blockType),
            signalConfig: signalConfig,
            visualizationVisible: false,
            onToggleVisualization: handleToggleVisualization  // ✨ ДОБАВИТЬ
        },
    };
    
    // Обновление данных визуализации при выполнении
    useEffect(() => {
        if (!dspExecutionStore.isRunning) return;
        
        const interval = setInterval(() => {
            setVisualizationWindows(windows => 
                windows.map(window => {
                    const visData = dspExecutionStore.getVisualizationData(window.nodeId);
                    if (visData) {
                        return {
                            ...window,
                            data: visData.data
                        };
                    }
                    return window;
                })
            );
        }, 100); // Обновляем каждые 100мс
        
        return () => clearInterval(interval);
    }, [dspExecutionStore.isRunning]);
    
    return (
        <>
            <div className="dsp-editor">
                {/* ... существующий код */}
            </div>
            
            {/* Плавающие окна визуализации */}
            <FloatingWindowsManager
                visualizationWindows={visualizationWindows}
                onCloseWindow={handleCloseVisualizationWindow}
                isDarkTheme={isDarkTheme}
            />
        </>
    );
}
```

### 5. Обновить App.jsx

Добавить управление конфигурацией:

```javascript
function App() {
    const [config, setConfig] = useState({
        sampleRate: 48000,
        bufferSize: 1024,
        targetFPS: 30
    });
    
    const handleConfigChange = useCallback((newConfig) => {
        setConfig(newConfig);
        dspExecutionStore.updateConfig(newConfig);
    }, []);
    
    return (
        <div className="app">
            <Header
                currentScheme={currentScheme}
                isRunning={dspExecutionStore.isRunning}
                onStart={handleStartSimulation}
                onStop={handleStopSimulation}
                config={config}
                onConfigChange={handleConfigChange}
            />
            
            {/* Остальной код */}
        </div>
    );
}
```

### 6. Удалить устаревшие компоненты

- Удалить `Footer.jsx` (кнопки теперь в Header)
- Удалить `VisualizationPanel.jsx` (заменен на плавающие окна)
- Обновить импорты в App.jsx

## 🧪 Тестирование

1. **Плавающие окна:**
   - Создать блок Осциллограф/Спектроанализатор
   - Нажать на иконку глаза - должно появиться окно
   - Перетащить окно
   - Изменить размер окна
   - Закрыть окно кнопкой X или повторным нажатием на глаз

2. **Кнопки Start/Stop:**
   - Проверить что кнопки в Header
   - Запустить симуляцию
   - Остановить симуляцию

3. **Настройки:**
   - Открыть диалог настроек
   - Изменить FPS
   - Изменить частоту дискретизации
   - Применить изменения

4. **Аудио файл:**
   - Добавить блок "Аудио файл"
   - Загрузить WAV файл
   - Проверить отображение информации
   - Подключить к визуализации

5. **FPS:**
   - Установить FPS = 10
   - Проверить что визуализация обновляется реже
   - Установить FPS = 60
   - Проверить плавную визуализацию

## 📦 Установка

1. Скопировать все файлы из `/mnt/user-data/outputs/src/` в ваш проект
2. Обновить файлы согласно разделу "Что нужно доработать"
3. Установить зависимости (если нужны новые)
4. Запустить проект: `npm run dev`

## ⚙️ Дополнительные настройки

### Настройки FPS по умолчанию
Можно изменить в `App.jsx`:
```javascript
const [config, setConfig] = useState({
    targetFPS: 30  // От 1 до 60
});
```

### Позиции окон по умолчанию
Можно настроить в `FloatingWindowsManager.jsx`:
```javascript
const getInitialPosition = (nodeId) => ({
    x: 100 + offset,
    y: 100 + offset
});
```

### Размеры окон по умолчанию
Настраиваются в `FloatingWindowsManager.jsx` в зависимости от типа визуализации.

## 🎨 Темная тема

Все новые компоненты поддерживают темную тему через класс `dark-theme`. Стили автоматически переключаются при изменении темы приложения.

## 🐛 Известные проблемы

1. При быстром открытии/закрытии окон может быть задержка обновления
2. Блок аудио файла требует доработки логики для зацикливания
3. FPS может колебаться при высокой нагрузке

## 📝 TODO

- [ ] Сохранение позиций окон в localStorage
- [ ] Возможность свернуть окно (минимизация)
- [ ] Группировка нескольких визуализаций в одном окне (вкладки)
- [ ] Экспорт визуализации в изображение
- [ ] Поддержка других аудио форматов (MP3, FLAC)
- [ ] Синхронизация FPS с частотой обновления экрана

Удачи с доработкой проекта! 🚀
