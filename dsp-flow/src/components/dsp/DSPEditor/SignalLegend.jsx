import PropTypes from 'prop-types';
import './ReactFlowTheme.css';

function SignalLegend({ isDarkTheme: _isDarkTheme }) {
    return (
        <div className="signal-legend">
            <div className="signal-legend-title">Типы сигналов</div>
            <div className="signal-legend-items">
                <div className="signal-legend-item">
                    <div className="signal-legend-line real"></div>
                    <span className="signal-legend-label">Действительный</span>
                </div>
                <div className="signal-legend-item">
                    <div className="signal-legend-line complex"></div>
                    <span className="signal-legend-label">Комплексный</span>
                </div>
            </div>
        </div>
    );
}

SignalLegend.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired
};

export default SignalLegend;

/*
import PropTypes from 'prop-types';
import './ReactFlowTheme.css';

function SignalLegend({ isDarkTheme, isRunning }) {
    return (
        <div className="signal-legend">
            <div className="signal-legend-header">
                <div className="signal-legend-title">Типы сигналов</div>
                <div className={`simulation-status ${isRunning ? 'running' : 'stopped'}`}>
                    {isRunning ? '▶ Симуляция' : '⏸ Симуляция'}
                </div>
            </div>
            <div className="signal-legend-items">
                <div className="signal-legend-item">
                    <div className="signal-legend-line real"></div>
                    <span className="signal-legend-label">Действительный</span>
                </div>
                <div className="signal-legend-item">
                    <div className="signal-legend-line complex"></div>
                    <span className="signal-legend-label">Комплексный</span>
                </div>
            </div>
            <div className="animation-hint">
                {isRunning ? 'Анимация включена' : 'Анимация выключена'}
            </div>
        </div>
    );
}

SignalLegend.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    isRunning: PropTypes.bool.isRequired
};

export default SignalLegend;
 */