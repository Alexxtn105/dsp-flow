import PropTypes from 'prop-types';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './Footer.css';

function Footer({
    isRunning,
    isPaused,
    nodesCount,
    // connectionsCount зарезервирован для будущего использования
    sampleRate,
    progress,
    isManualMode,
    manualStepSize,
    currentSample,
    totalSamples,
    onToggleManual,
    onStep,
    onStepSizeChange
}) {
    const { isDarkTheme } = useThemeContext();
    const formatProgress = (value) => {
        return Math.round(value * 100);
    };

    return (
        <footer className={`app-footer ${isDarkTheme ? 'dark-theme' : ''} ${isManualMode ? 'manual-mode' : ''}`}>
            <div className="footer-content">
                <div className="footer-left">
                    <div className="status-group">
                        <span className="footer-status">
                            Статус: {isRunning
                                ? (isManualMode ? 'Ручной режим' : 'Выполнение...')
                                : (isPaused ? 'Пауза' : 'Готов')}
                        </span>
                        {currentSample > 0 && (
                            <span className="sample-counter">
                                Отсчет: <strong>{currentSample.toLocaleString()}</strong>
                                {totalSamples > 0 && ` / ${totalSamples.toLocaleString()}`}
                            </span>
                        )}
                    </div>
                    {(isRunning || isPaused) && progress > 0 && !isManualMode && (
                        <div className="progress-container">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${formatProgress(progress)}%` }}
                                />
                            </div>
                            <span className="progress-text">{formatProgress(progress)}%</span>
                        </div>
                    )}
                </div>

                <div className="footer-center">
                    <span className="footer-sample-rate">
                        {sampleRate >= 1000 ? `${sampleRate / 1000}k` : sampleRate} Гц
                    </span>
                </div>

                <div className="footer-right">
                    <div className="manual-controls">
                        <label className="manual-toggle" title="Ручной режим управления воспроизведением">
                            <input
                                type="checkbox"
                                checked={isManualMode}
                                onChange={(e) => onToggleManual(e.target.checked)}
                            />
                            <span>Ручной режим</span>
                        </label>

                        {isManualMode && (
                            <div className="step-controls">
                                <input
                                    type="number"
                                    value={manualStepSize}
                                    onChange={(e) => onStepSizeChange(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="step-size-input"
                                    title="Количество отсчетов для считывания"
                                />
                                <button
                                    className="footer-btn step-btn"
                                    onClick={onStep}
                                    title="Прочитать указанное количество отсчетов"
                                >
                                    Продолжить
                                </button>
                            </div>
                        )}

                        <div className="footer-info">
                            <span className="nodes-count" title="Количество узлов">N: {nodesCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Таймлайн на всю ширину */}
            <div className="footer-timeline">
                <div
                    className="timeline-progress"
                    style={{ width: `${(progress || 0) * 100}%` }}
                />
                {totalSamples > 0 && (
                    <div
                        className="timeline-handle"
                        style={{ left: `${(progress || 0) * 100}%` }}
                        title={`Позиция: ${Math.round(progress * 100)}%`}
                    />
                )}
            </div>
        </footer>
    );
}

Footer.propTypes = {
    isRunning: PropTypes.bool.isRequired,
    isPaused: PropTypes.bool,
    nodesCount: PropTypes.number.isRequired,
    connectionsCount: PropTypes.number.isRequired,
    sampleRate: PropTypes.number.isRequired,
    progress: PropTypes.number,
    isManualMode: PropTypes.bool,
    manualStepSize: PropTypes.number,
    currentSample: PropTypes.number,
    totalSamples: PropTypes.number,
    onToggleManual: PropTypes.func,
    onStep: PropTypes.func,
    onStepSizeChange: PropTypes.func
};

Footer.defaultProps = {
    progress: 0
};

export default Footer;