import { useState, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import VisualizationWindow from '../VisualizationWindow';
import OscilloscopeView from '../OscilloscopeView';
import SpectrumView from '../SpectrumView';
import WaterfallView from '../WaterfallView';

/**
 * Менеджер окон визуализации
 * Управляет открытием/закрытием и обновлением данных в окнах
 */
const VisualizationManager = forwardRef(function VisualizationManager({
    isDarkTheme,
    sampleRate,
    nodes
}, ref) {
    const [openWindows, setOpenWindows] = useState(new Map());
    const [windowData, setWindowData] = useState(new Map());

    // Открыть окно визуализации
    const openWindow = useCallback((nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const blockType = node.data.blockType;
        const windowId = nodeId;

        // Определяем тип визуализации по типу блока
        let vizType = 'oscilloscope';
        if (blockType === 'Спектроанализатор' || blockType === 'БПФ') {
            vizType = 'spectrum';
        } else if (blockType === 'Водопад') {
            vizType = 'waterfall';
        }

        // Позиционирование окна (ближе к правому краю)
        const existingCount = openWindows.size;
        const defaultWidth = 400;
        const screenWidth = window.innerWidth;

        // Отступ справа 20px, смещение для каждого следующего окна
        const startX = screenWidth - defaultWidth - 50;

        const position = {
            x: Math.max(50, startX - (existingCount * 30)), // Сдвигаем влево каждое новое, чтобы было видно
            y: 100 + existingCount * 30
        };

        setOpenWindows(prev => {
            const next = new Map(prev);
            next.set(windowId, {
                nodeId,
                vizType,
                title: node.data.label,
                position,
                width: 400,
                height: 300
            });
            return next;
        });
    }, [nodes, openWindows.size]);

    // Закрываем окна удалённых блоков
    // This useState call was incorrectly placed and not used to declare state.
    // The comment indicates it was meant for a side effect, which should be useEffect.
    // The actual side effect logic is correctly implemented in the useEffect below.

    // Эффект для автоматического закрытия окон при удалении узлов
    // Используем setTimeout чтобы не блокировать рендер, или просто useEffect
    useEffect(() => {
        setOpenWindows(prev => {
            let changed = false;
            const next = new Map(prev);

            for (const [windowId, config] of prev.entries()) {
                const nodeExists = nodes.some(n => n.id === config.nodeId);
                if (!nodeExists) {
                    next.delete(windowId);
                    changed = true;
                }
            }

            if (changed) {
                // Также чистим данные
                setWindowData(prevData => {
                    const nextData = new Map(prevData);
                    // Находим удаленные ключи
                    // Note: windowId === nodeId in openWindow logic
                    for (const [winId] of prev) {
                        if (!next.has(winId)) {
                            nextData.delete(winId);
                        }
                    }
                    return nextData;
                });
                return next;
            }
            return prev;
        });
    }, [nodes]); // Зависимость от списка узлов

    // Закрыть окно
    const closeWindow = useCallback((windowId) => {
        setOpenWindows(prev => {
            const next = new Map(prev);
            next.delete(windowId);
            return next;
        });
        setWindowData(prev => {
            const next = new Map(prev);
            next.delete(windowId);
            return next;
        });
    }, []);

    // Resize window
    const handleResize = useCallback((windowId, width, height) => {
        setOpenWindows(prev => {
            const next = new Map(prev);
            const config = next.get(windowId);
            if (config) {
                // Enforce limits: 100x100 to 1600x1600
                const newWidth = Math.max(100, Math.min(1600, width));
                const newHeight = Math.max(100, Math.min(1600, height));

                next.set(windowId, {
                    ...config,
                    width: newWidth,
                    height: newHeight
                });
            }
            return next;
        });
    }, []);

    // Обновить данные в окне
    const updateData = useCallback((nodeId, data) => {
        setWindowData(prev => {
            const next = new Map(prev);
            next.set(nodeId, data);
            return next;
        });
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        openWindow,
        closeWindow,
        updateData,
        getOpenWindows: () => openWindows
    }), [openWindow, closeWindow, updateData, openWindows]);

    // Рендерим все открытые окна
    const renderWindows = () => {
        const windows = [];

        openWindows.forEach((config, windowId) => {
            const data = windowData.get(windowId);

            windows.push(
                <VisualizationWindow
                    key={windowId}
                    nodeId={windowId}
                    title={config.title}
                    isDarkTheme={isDarkTheme}
                    onClose={closeWindow}
                    onResize={handleResize}
                    initialPosition={config.position}
                    width={config.width}
                    height={config.height}
                >
                    {config.vizType === 'spectrum' ? (
                        <SpectrumView
                            data={data}
                            sampleRate={sampleRate}
                            isDarkTheme={isDarkTheme}
                            width={config.width}
                            height={config.height - 70}
                        />
                    ) : config.vizType === 'waterfall' ? (
                        <WaterfallView
                            data={data}
                            sampleRate={sampleRate}
                            isDarkTheme={isDarkTheme}
                            width={config.width}
                            height={config.height - 70}
                        />
                    ) : (
                        <OscilloscopeView
                            data={data}
                            isDarkTheme={isDarkTheme}
                            width={config.width}
                            height={config.height - 70}
                        />
                    )}
                </VisualizationWindow>
            );
        });

        return windows;
    };

    return <>{renderWindows()}</>;
});

VisualizationManager.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    sampleRate: PropTypes.number.isRequired,
    nodes: PropTypes.array.isRequired
};

export default VisualizationManager;
