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
    nodes,
    onUpdateNodeParams
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
        if (blockType === 'Спектроанализатор') {
            vizType = 'spectrum';
        } else if (blockType === 'Водопад') {
            vizType = 'waterfall';
        } else if (blockType === 'Фазовое созвездие') {
            vizType = 'constellation';
        }

        setOpenWindows(prev => {
            // Позиционирование окна (ближе к правому краю)
            const existingCount = prev.size;
            const defaultWidth = 400;
            const screenWidth = window.innerWidth;
            const startX = screenWidth - defaultWidth - 50;

            const position = {
                x: Math.max(50, startX - (existingCount * 30)),
                y: 100 + existingCount * 30
            };

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
    }, [nodes]);

    // Эффект для автоматического закрытия окон при удалении узлов (N15)
    // Используем functional update для чтения prev, не включая openWindows в deps
    const nodeIds = nodes.map(n => n.id).join(',');
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        setOpenWindows(prev => {
            const removedIds = [];
            for (const [windowId, config] of prev.entries()) {
                const nodeExists = nodes.some(n => n.id === config.nodeId);
                if (!nodeExists) {
                    removedIds.push(windowId);
                }
            }
            if (removedIds.length === 0) return prev;

            const next = new Map(prev);
            for (const id of removedIds) {
                next.delete(id);
            }
            return next;
        });

        setWindowData(prev => {
            const removedIds = [];
            for (const windowId of prev.keys()) {
                const nodeExists = nodes.some(n => n.id === windowId);
                if (!nodeExists) {
                    removedIds.push(windowId);
                }
            }
            if (removedIds.length === 0) return prev;

            const next = new Map(prev);
            for (const id of removedIds) {
                next.delete(id);
            }
            return next;
        });
    }, [nodeIds]); // eslint-disable-line react-hooks/exhaustive-deps
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

    // Изменить fftSize блока
    const handleFftSizeChange = useCallback((nodeId, newFftSize) => {
        if (!onUpdateNodeParams) return;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        onUpdateNodeParams(nodeId, { ...node.data.params, fftSize: newFftSize });
    }, [nodes, onUpdateNodeParams]);

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
            const node = nodes.find(n => n.id === config.nodeId);
            const nodeFftSize = node?.data?.params?.fftSize;

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
                                fftSize={nodeFftSize}
                                onFftSizeChange={onUpdateNodeParams ? (size) => handleFftSizeChange(config.nodeId, size) : undefined}
                            />
                        ) : config.vizType === 'waterfall' ? (
                            <WaterfallView
                                data={data}
                                sampleRate={sampleRate}
                                width={config.width}
                                height={config.height - 70}
                                fftSize={nodeFftSize}
                                onFftSizeChange={onUpdateNodeParams ? (size) => handleFftSizeChange(config.nodeId, size) : undefined}
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
                                sampleRate={sampleRate}
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
    nodes: PropTypes.array.isRequired,
    onUpdateNodeParams: PropTypes.func
};

export default VisualizationManager;
