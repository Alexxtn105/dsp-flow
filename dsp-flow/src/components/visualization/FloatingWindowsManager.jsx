/**
 * FloatingWindowsManager - менеджер плавающих окон визуализации
 */

import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import FloatingWindow from '../common/FloatingWindow';
import Oscilloscope from '../visualization/Oscilloscope';
import SpectrumAnalyzer from '../visualization/SpectrumAnalyzer';
import ConstellationDiagram from '../visualization/ConstellationDiagram';
import './FloatingWindowsManager.css';

function FloatingWindowsManager({ visualizationWindows, onCloseWindow, isDarkTheme }) {
    // Состояние позиций окон (можно сохранять в localStorage)
    const [windowPositions, _setWindowPositions] = useState({});

    const getInitialPosition = useCallback((nodeId) => {
        if (windowPositions[nodeId]) {
            return windowPositions[nodeId];
        }

        // Случайное смещение для новых окон
        const offset = Object.keys(windowPositions).length * 30;
        return {
            x: 100 + offset,
            y: 100 + offset
        };
    }, [windowPositions]);

    const renderVisualization = (window) => {
        const { nodeId, type, data } = window;

        switch (type) {
            case 'oscilloscope':
                return (
                    <Oscilloscope
                        key={nodeId}
                        data={data}
                        width={800}
                        height={400}
                    />
                );

            case 'spectrum':
                return (
                    <SpectrumAnalyzer
                        key={nodeId}
                        data={data}
                        width={800}
                        height={600}
                        mode="both"
                    />
                );

            case 'constellation':
                return (
                    <ConstellationDiagram
                        key={nodeId}
                        data={data}
                        width={600}
                        height={600}
                    />
                );

            default:
                return <div>Неизвестный тип визуализации</div>;
        }
    };

    return (
        <div className="floating-windows-manager">
            {visualizationWindows.map((window) => (
                <FloatingWindow
                    key={window.nodeId}
                    title={window.nodeLabel || `Визуализация ${window.type}`}
                    onClose={() => onCloseWindow(window.nodeId)}
                    initialPosition={getInitialPosition(window.nodeId)}
                    initialSize={
                        window.type === 'constellation'
                            ? { width: 600, height: 650 }
                            : window.type === 'oscilloscope'
                                ? { width: 800, height: 450 }
                                : { width: 800, height: 650 }
                    }
                    minWidth={400}
                    minHeight={300}
                    isDarkTheme={isDarkTheme}
                >
                    {renderVisualization(window)}
                </FloatingWindow>
            ))}
        </div>
    );
}

FloatingWindowsManager.propTypes = {
    visualizationWindows: PropTypes.arrayOf(PropTypes.shape({
        nodeId: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        data: PropTypes.any,
        nodeLabel: PropTypes.string
    })).isRequired,
    onCloseWindow: PropTypes.func.isRequired,
    isDarkTheme: PropTypes.bool.isRequired
};

export default FloatingWindowsManager;