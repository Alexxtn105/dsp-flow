import PropTypes from 'prop-types';
import './ControlToolbar.css';

function ControlToolbar({
                            isDarkTheme,
                            toggleTheme,
                            onSave,
                            onSaveAs,
                            onLoad,
                            isSaveEnabled,
                            isSaveAsEnabled
                        }) {
    return (
        <div className={`control-toolbar ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="control-toolbar-header">
                <span className="control-toolbar-icon" title="Панель управления">⚙️</span>
            </div>

            <div className="control-toolbar-content">
                <div className="control-buttons">
                    <button
                        className="control-btn save-btn"
                        onClick={onSave}
                        title="Сохранить текущую схему"
                        disabled={!isSaveEnabled}
                    >
                        <span className="control-btn-icon">💾</span>
                        <span className="control-btn-tooltip">Сохранить</span>
                    </button>

                    <button
                        className="control-btn save-as-btn"
                        onClick={onSaveAs}
                        title="Сохранить под новым именем"
                        disabled={!isSaveAsEnabled}
                    >
                        <span className="control-btn-icon">📝</span>
                        <span className="control-btn-tooltip">Сохранить как</span>
                    </button>

                    <button
                        className="control-btn load-btn"
                        onClick={onLoad}
                        title="Загрузить сохраненную схему"
                    >
                        <span className="control-btn-icon">📂</span>
                        <span className="control-btn-tooltip">Загрузить</span>
                    </button>

                    <button
                        className="control-btn theme-btn"
                        onClick={toggleTheme}
                        title={isDarkTheme ? "Переключить на светлую тему" : "Переключить на темную тему"}
                    >
                        <span className="control-btn-icon">{isDarkTheme ? '☀️' : '🌙'}</span>
                        <span className="control-btn-tooltip">
                            {isDarkTheme ? 'Светлая тема' : 'Темная тема'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

ControlToolbar.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onSaveAs: PropTypes.func.isRequired,
    onLoad: PropTypes.func.isRequired,
    isSaveEnabled: PropTypes.bool.isRequired,
    isSaveAsEnabled: PropTypes.bool.isRequired
};

export default ControlToolbar;