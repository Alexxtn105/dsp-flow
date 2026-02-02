import PropTypes from 'prop-types';
import './ReactFlowTheme.css';

function SignalLegend({ isDarkTheme }) {
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