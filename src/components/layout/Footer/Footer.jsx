import PropTypes from 'prop-types';
import './Footer.css';

function Footer({ isDarkTheme, isRunning, nodesCount, connectionsCount, sampleRate, progress }) {
    const formatProgress = (value) => {
        return Math.round(value * 100);
    };

    return (
        <footer className={`app-footer ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="footer-content">
                <div className="footer-left">
                    <span className="footer-status">
                        Статус: {isRunning ? 'Выполнение схемы...' : 'Готов'}
                    </span>
                    {isRunning && progress > 0 && (
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
                        Частота дискретизации: {sampleRate >= 1000 ? `${sampleRate / 1000}k` : sampleRate} Гц
                    </span>
                </div>

                <div className="footer-right">
                    <div className="footer-info">
                        <span className="nodes-count">Узлов: {nodesCount}</span>
                        <span className="connections-count">Соединений: {connectionsCount}</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

Footer.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    isRunning: PropTypes.bool.isRequired,
    nodesCount: PropTypes.number.isRequired,
    connectionsCount: PropTypes.number.isRequired,
    sampleRate: PropTypes.number.isRequired,
    progress: PropTypes.number
};

Footer.defaultProps = {
    progress: 0
};

export default Footer;