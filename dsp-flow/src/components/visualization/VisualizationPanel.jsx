/**
 * VisualizationPanel - панель для отображения результатов обработки сигналов
 */

import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react-lite';
import SpectrumAnalyzer from './SpectrumAnalyzer';
import Oscilloscope from './Oscilloscope';
import ConstellationDiagram from './ConstellationDiagram';
import { dspExecutionStore } from '../../stores/DSPExecutionStore';
import './VisualizationPanel.css';

const VisualizationPanel = observer(({ isDarkTheme }) => {
    const [activeVisualizations, setActiveVisualizations] = useState([]);

    useEffect(() => {
        // Обновляем список активных визуализаций при изменении данных
        const visualizations = [];
        
        dspExecutionStore.visualizationData.forEach((data, nodeId) => {
            visualizations.push({
                nodeId,
                type: data.type,
                data: data.data,
                timestamp: data.timestamp
            });
        });

        setActiveVisualizations(visualizations);
    }, [dspExecutionStore.visualizationData]);

    const renderVisualization = (vis) => {
        const key = `${vis.nodeId}-${vis.timestamp}`;

        switch (vis.type) {
            case 'oscilloscope':
                return (
                    <div key={key} className="visualization-item">
                        <Oscilloscope 
                            data={vis.data}
                            width={800}
                            height={400}
                        />
                    </div>
                );

            case 'spectrum':
                return (
                    <div key={key} className="visualization-item">
                        <SpectrumAnalyzer 
                            data={vis.data}
                            width={800}
                            height={600}
                            mode="both"
                        />
                    </div>
                );

            case 'constellation':
                return (
                    <div key={key} className="visualization-item">
                        <ConstellationDiagram 
                            data={vis.data}
                            width={600}
                            height={600}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    if (!dspExecutionStore.isRunning && activeVisualizations.length === 0) {
        return (
            <div className={`visualization-panel empty ${isDarkTheme ? 'dark-theme' : ''}`}>
                <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <h3>Визуализация недоступна</h3>
                    <p>Добавьте блоки визуализации в схему и запустите выполнение</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`visualization-panel ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="panel-header">
                <h3>Визуализация сигналов</h3>
                <div className="stats">
                    <span>Активных: {activeVisualizations.length}</span>
                    <span className="separator">|</span>
                    <span>FPS: {Math.round(1000 / (dspExecutionStore.executionStats.executionTime || 16))}</span>
                    <span className="separator">|</span>
                    <span>
                        {dspExecutionStore.isRunning ? 
                            <span className="status-running">● Выполняется</span> : 
                            <span className="status-stopped">⏸ Остановлено</span>
                        }
                    </span>
                </div>
            </div>

            <div className="visualizations-grid">
                {activeVisualizations.map(vis => renderVisualization(vis))}
            </div>
        </div>
    );
});

VisualizationPanel.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired
};

export default VisualizationPanel;
