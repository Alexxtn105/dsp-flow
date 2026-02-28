import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './Footer.css';

function formatSampleRate(sr) {
    if (sr >= 1000) return `${sr / 1000} kHz`;
    return `${sr} Hz`;
}

function formatTime(samples, sr) {
    if (!sr || sr <= 0 || samples <= 0) return '00:00.000';
    const sec = samples / sr;
    const min = Math.floor(sec / 60);
    const s = sec - min * 60;
    return `${String(min).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}

function Footer({
    isRunning,
    isPaused,
    nodesCount,
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

    const pct = Math.round((progress || 0) * 100);

    const statusLabel = isRunning
        ? (isManualMode ? 'MANUAL' : 'RUN')
        : (isPaused ? 'PAUSE' : 'READY');

    const statusClass = isRunning
        ? (isManualMode ? 'status-manual' : 'status-run')
        : (isPaused ? 'status-pause' : 'status-ready');

    const handleTimelineClick = useCallback(() => {
        // Reserved for seek functionality
    }, []);

    return (
        <footer className={`ft ${isDarkTheme ? 'dark-theme' : ''}`}>
            {/* Timeline */}
            <div className="ft-timeline" onClick={handleTimelineClick}>
                <div className="ft-timeline-track">
                    <div
                        className="ft-timeline-fill"
                        style={{ width: `${pct}%` }}
                    />
                    {totalSamples > 0 && (
                        <div
                            className="ft-timeline-head"
                            style={{ left: `${pct}%` }}
                        />
                    )}
                </div>
                {/* Time markers */}
                <div className="ft-timeline-markers">
                    <span className="ft-time-current">
                        {formatTime(currentSample, sampleRate)}
                    </span>
                    {totalSamples > 0 && (
                        <span className="ft-time-total">
                            {formatTime(totalSamples, sampleRate)}
                        </span>
                    )}
                </div>
            </div>

            {/* Status bar */}
            <div className="ft-bar">
                {/* Left: status + counter */}
                <div className="ft-section">
                    <div className={`ft-status ${statusClass}`}>
                        <span className="ft-status-led" />
                        <span className="ft-status-text">{statusLabel}</span>
                    </div>

                    {currentSample > 0 && (
                        <div className="ft-counter">
                            <span className="ft-counter-val">{currentSample.toLocaleString()}</span>
                            {totalSamples > 0 && (
                                <>
                                    <span className="ft-counter-sep">/</span>
                                    <span className="ft-counter-total">{totalSamples.toLocaleString()}</span>
                                </>
                            )}
                        </div>
                    )}

                    {(isRunning || isPaused) && !isManualMode && progress > 0 && (
                        <span className="ft-pct">{pct}%</span>
                    )}
                </div>

                {/* Center: sample rate + info */}
                <div className="ft-section ft-section-center">
                    <span className="ft-sr">{formatSampleRate(sampleRate)}</span>
                    <span className="ft-divider" />
                    <span className="ft-nodes">
                        <span className="ft-nodes-icon">●</span> {nodesCount}
                    </span>
                </div>

                {/* Right: manual controls */}
                <div className="ft-section ft-section-right">
                    <label className="ft-manual-toggle" title="Ручной режим управления">
                        <input
                            type="checkbox"
                            checked={isManualMode}
                            onChange={(e) => onToggleManual(e.target.checked)}
                            className="ft-manual-cb"
                        />
                        <span className="ft-manual-switch" />
                        <span className="ft-manual-label">Manual</span>
                    </label>

                    {isManualMode && (
                        <div className="ft-step-group">
                            <span className="ft-step-label">Step</span>
                            <input
                                type="number"
                                value={manualStepSize}
                                onChange={(e) => onStepSizeChange(Math.max(1, parseInt(e.target.value) || 1))}
                                className="ft-step-input"
                                title="Количество отсчётов за шаг"
                            />
                            <button
                                className="ft-step-btn"
                                onClick={onStep}
                                title="Выполнить шаг"
                            >
                                <span className="material-icons" style={{ fontSize: 14 }}>play_arrow</span>
                                Шаг
                            </button>
                        </div>
                    )}
                </div>
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
