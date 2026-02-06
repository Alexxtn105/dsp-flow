import { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../common/Icons/Icon.jsx';
import './Header.css';

function Header({ 
    currentScheme, 
    isRunning, 
    onStart, 
    onStop,
    config,
    onConfigChange 
}) {
    const [showConfigDialog, setShowConfigDialog] = useState(false);
    const [tempConfig, setTempConfig] = useState(config);

    const handleSaveConfig = () => {
        onConfigChange(tempConfig);
        setShowConfigDialog(false);
    };

    return (
        <header className="app-header">
            <div className="app-header-left">
                <h1>DSP Flow Editor</h1>
                <p>Редактор схем цифровой обработки сигналов</p>
            </div>

            <div className="app-header-center">
                <div className="simulation-controls">
                    <button
                        className={`sim-btn start-btn ${isRunning ? 'active' : ''}`}
                        onClick={onStart}
                        disabled={isRunning}
                        title="Запустить симуляцию"
                    >
                        <Icon name="play_arrow" size="medium" />
                        <span>Старт</span>
                    </button>

                    <button
                        className="sim-btn stop-btn"
                        onClick={onStop}
                        disabled={!isRunning}
                        title="Остановить симуляцию"
                    >
                        <Icon name="stop" size="medium" />
                        <span>Стоп</span>
                    </button>
                    
                    <button
                        className="sim-btn config-btn"
                        onClick={() => setShowConfigDialog(true)}
                        title="Настройки симуляции"
                    >
                        <Icon name="settings" size="medium" />
                    </button>
                </div>
                
                <div className="current-scheme-info">
                    <div className="scheme-name" title={currentScheme.name}>
                        {currentScheme.name}
                    </div>
                    {!currentScheme.isSaved && currentScheme.name !== 'not_saved' && (
                        <div className="scheme-unsaved">
                            (не сохранено)
                        </div>
                    )}
                </div>
            </div>

            <div className="app-header-right">
                <div className="config-display">
                    <span className="config-label">Fs:</span>
                    <span className="config-value">{(config.sampleRate / 1000).toFixed(1)} кГц</span>
                    <span className="config-separator">|</span>
                    <span className="config-label">FPS:</span>
                    <span className="config-value">{config.targetFPS}</span>
                </div>
            </div>

            {/* Диалог настроек */}
            {showConfigDialog && (
                <div className="config-dialog-overlay" onClick={() => setShowConfigDialog(false)}>
                    <div className="config-dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>Настройки симуляции</h3>
                        
                        <div className="config-field">
                            <label>Частота дискретизации (Гц):</label>
                            <input 
                                type="number"
                                value={tempConfig.sampleRate}
                                onChange={(e) => setTempConfig({
                                    ...tempConfig,
                                    sampleRate: parseInt(e.target.value) || 48000
                                })}
                                min="8000"
                                max="192000"
                                step="1000"
                            />
                        </div>

                        <div className="config-field">
                            <label>Размер буфера:</label>
                            <select
                                value={tempConfig.bufferSize}
                                onChange={(e) => setTempConfig({
                                    ...tempConfig,
                                    bufferSize: parseInt(e.target.value)
                                })}
                            >
                                <option value="256">256</option>
                                <option value="512">512</option>
                                <option value="1024">1024</option>
                                <option value="2048">2048</option>
                                <option value="4096">4096</option>
                            </select>
                        </div>

                        <div className="config-field">
                            <label>Целевой FPS визуализации:</label>
                            <input 
                                type="number"
                                value={tempConfig.targetFPS}
                                onChange={(e) => setTempConfig({
                                    ...tempConfig,
                                    targetFPS: parseInt(e.target.value) || 30
                                })}
                                min="1"
                                max="60"
                            />
                        </div>

                        <div className="config-buttons">
                            <button onClick={handleSaveConfig}>Применить</button>
                            <button onClick={() => setShowConfigDialog(false)}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

Header.propTypes = {
    currentScheme: PropTypes.shape({
        name: PropTypes.string.isRequired,
        isSaved: PropTypes.bool.isRequired
    }).isRequired,
    isRunning: PropTypes.bool.isRequired,
    onStart: PropTypes.func.isRequired,
    onStop: PropTypes.func.isRequired,
    config: PropTypes.shape({
        sampleRate: PropTypes.number.isRequired,
        bufferSize: PropTypes.number.isRequired,
        targetFPS: PropTypes.number.isRequired
    }).isRequired,
    onConfigChange: PropTypes.func.isRequired
};

export default Header;
