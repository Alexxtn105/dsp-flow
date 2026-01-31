import './Footer.css';

function Footer({ isDarkTheme, onStart, onStop, isRunning, nodesCount = 0, connectionsCount = 0 }) {
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
                            title="Запустить выполнение схемы"
                        >
                            ▶️ Старт
                        </button>

                        <button
                            className={`footer-btn stop-btn ${!isRunning ? 'disabled' : ''}`}
                            onClick={onStop}
                            disabled={!isRunning}
                            title="Остановить выполнение схемы"
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

export default Footer;