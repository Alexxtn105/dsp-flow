import PropTypes from 'prop-types';
import './Footer.css';

function Footer({ isDarkTheme, onStart, onStop, isRunning, nodesCount, connectionsCount }) {
    return (
        <footer className={`app-footer ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="footer-content">
                <div className="footer-left">
                    <span className="footer-status">
                        Статус: {isRunning ? 'Выполнение схемы...' : 'Готов'}
                    </span>
                </div>

                <div className="footer-center">
                    <div className="simulation-controls">
                        <button
                            className={`footer-btn start-btn ${isRunning ? 'active' : ''}`}
                            onClick={onStart}
                            disabled={isRunning}
                        >
                            ▶️ Старт
                        </button>

                        <button
                            className={`footer-btn stop-btn`}
                            onClick={onStop}
                            disabled={!isRunning}
                        >
                            ⏹️ Стоп
                        </button>
                    </div>
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
    onStart: PropTypes.func.isRequired,
    onStop: PropTypes.func.isRequired,
    isRunning: PropTypes.bool.isRequired,
    nodesCount: PropTypes.number.isRequired,
    connectionsCount: PropTypes.number.isRequired
};

export default Footer;
