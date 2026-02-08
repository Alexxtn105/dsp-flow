import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import PropTypes from 'prop-types';
import VisualizationWindow from '../VisualizationWindow';
import OscilloscopeView from '../OscilloscopeView';
import SpectrumView from '../SpectrumView';

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
        }

        // Позиционирование окна
        const existingCount = openWindows.size;
        const position = {
            x: 150 + existingCount * 30,
            y: 100 + existingCount * 30
        };

        setOpenWindows(prev => {
            const next = new Map(prev);
            next.set(windowId, {
                nodeId,
                vizType,
                title: node.data.label,
                position
            });
            return next;
        });
    }, [nodes, openWindows.size]);

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
                    initialPosition={config.position}
                    width={420}
                    height={280}
                >
                    {config.vizType === 'spectrum' ? (
                        <SpectrumView
                            data={data}
                            sampleRate={sampleRate}
                            isDarkTheme={isDarkTheme}
                        />
                    ) : (
                        <OscilloscopeView
                            data={data}
                            isDarkTheme={isDarkTheme}
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
