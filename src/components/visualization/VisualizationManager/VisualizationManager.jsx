import { useState, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import VisualizationWindow from '../VisualizationWindow';
import OscilloscopeView from '../OscilloscopeView';
import SpectrumView from '../SpectrumView';
import WaterfallView from '../WaterfallView';
import ConstellationView from '../ConstellationView';
import { ErrorBoundary } from '../../common';

/**
 * Менеджер окон визуализации
 * Управляет открытием/закрытием и обновлением данных в окнах
 */
const VisualizationManager = forwardRef(function VisualizationManager({
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
        } else if (blockType === 'Фазовое созвездие') {
            vizType = 'constellation';
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
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        // Находим ID окон, чьи узлы были удалены
        const removedIds = [];
        for (const [windowId, config] of openWindows.entries()) {
            const nodeExists = nodes.some(n => n.id === config.nodeId);
            if (!nodeExists) {
                removedIds.push(windowId);
            }
        }

        if (removedIds.length === 0) return;

        setOpenWindows(prev => {
            const next = new Map(prev);
            for (const id of removedIds) {
                next.delete(id);
            }
            return next;
        });

        setWindowData(prev => {
            const next = new Map(prev);
            for (const id of removedIds) {
                next.delete(id);
            }
            return next;
        });
    }, [nodes, openWindows]);
    /* eslint-enable react-hooks/set-state-in-effect */

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
                    onClose={closeWindow}
                    onResize={handleResize}
                    initialPosition={config.position}
                    width={config.width}
                    height={config.height}
                >
                    <ErrorBoundary fallbackMessage="Ошибка визуализации">
                        {config.vizType === 'spectrum' ? (
                            <SpectrumView
                                data={data}
                                sampleRate={sampleRate}
                                            width={config.width}
                                height={config.height - 70}
                            />
                        ) : config.vizType === 'waterfall' ? (
                            <WaterfallView
                                data={data}
                                sampleRate={sampleRate}
                                            width={config.width}
                                height={config.height - 70}
                            />
                        ) : config.vizType === 'constellation' ? (
                            <ConstellationView
                                data={data}
                                            width={config.width}
                                height={config.height - 70}
                            />
                        ) : (
                            <OscilloscopeView
                                data={data}
                                            width={config.width}
                                height={config.height - 70}
                            />
                        )}
                    </ErrorBoundary>
                </VisualizationWindow>
            );
        });

        return windows;
    };

    return <>{renderWindows()}</>;
});

VisualizationManager.propTypes = {
    sampleRate: PropTypes.number.isRequired,
    nodes: PropTypes.array.isRequired
};

export default VisualizationManager;
