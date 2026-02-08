import PropTypes from 'prop-types';
import Icon from '../../common/Icons/Icon.jsx';
import './ControlToolbar.css';

function ControlToolbar({
    isDarkTheme,
    toggleTheme,
    onSave,
    onSaveAs,
    onLoad,
    onNewScheme,
    onSettings,
    onStart,
    onStop,
    isSaveEnabled,
    isSaveAsEnabled,
    isRunning
}) {
    return (
        <div className={`control-toolbar ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="control-toolbar-header">
                <Icon
                    name="settings"
                    size="large"
                    className="control-toolbar-icon"
                    title="Панель управления"
                />
            </div>

            <div className="control-toolbar-content">
                <div className="control-buttons">
                    {/* Кнопка "Новая схема" */}
                    <button
                        className="control-btn new-btn"
                        onClick={onNewScheme}
                        title="Создать новую схему"
                    >
                        <Icon name="add" size="large" className="control-btn-icon" />
                        <span className="control-btn-tooltip">Новая схема</span>
                    </button>

                    <div className="control-divider"></div>

                    {/* Кнопка "Сохранить" */}
                    <button
                        className="control-btn save-btn"
                        onClick={onSave}
                        title="Сохранить текущую схему"
                        disabled={!isSaveEnabled}
                    >
                        <Icon name="save" size="large" className="control-btn-icon" />
                        <span className="control-btn-tooltip">Сохранить</span>
                    </button>

                    {/* Кнопка "Сохранить как" */}
                    <button
                        className="control-btn save-as-btn"
                        onClick={onSaveAs}
                        title="Сохранить под новым именем"
                        disabled={!isSaveAsEnabled}
                    >
                        <Icon name="save_as" size="large" className="control-btn-icon" />
                        <span className="control-btn-tooltip">Сохранить как</span>
                    </button>

                    {/* Кнопка "Загрузить" */}
                    <button
                        className="control-btn load-btn"
                        onClick={onLoad}
                        title="Загрузить сохраненную схему"
                    >
                        <Icon name="folder_open" size="large" className="control-btn-icon" />
                        <span className="control-btn-tooltip">Загрузить</span>
                    </button>

                    <div className="control-divider"></div>

                    {/* Кнопка "Старт" */}
                    <button
                        className={`control-btn start-btn ${isRunning ? 'active' : ''}`}
                        onClick={onStart}
                        title="Запустить симуляцию"
                        disabled={isRunning}
                    >
                        <Icon name="play_arrow" size="large" className="control-btn-icon" />
                        <span className="control-btn-tooltip">Старт</span>
                    </button>

                    {/* Кнопка "Стоп" */}
                    <button
                        className="control-btn stop-btn"
                        onClick={onStop}
                        title="Остановить симуляцию"
                        disabled={!isRunning}
                    >
                        <Icon name="stop" size="large" className="control-btn-icon" />
                        <span className="control-btn-tooltip">Стоп</span>
                    </button>

                    <div className="control-divider"></div>

                    {/* Кнопка "Настройки" */}
                    <button
                        className="control-btn settings-btn"
                        onClick={onSettings}
                        title="Настройки схемы"
                    >
                        <Icon name="tune" size="large" className="control-btn-icon" />
                        <span className="control-btn-tooltip">Настройки</span>
                    </button>

                    {/* Кнопка переключения темы */}
                    <button
                        className="control-btn theme-btn"
                        onClick={toggleTheme}
                        title={isDarkTheme ? "Переключить на светлую тему" : "Переключить на темную тему"}
                    >
                        <Icon
                            name={isDarkTheme ? 'light_mode' : 'dark_mode'}
                            size="large"
                            className="control-btn-icon"
                        />
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
    onNewScheme: PropTypes.func.isRequired,
    onSettings: PropTypes.func.isRequired,
    onStart: PropTypes.func.isRequired,
    onStop: PropTypes.func.isRequired,
    isSaveEnabled: PropTypes.bool.isRequired,
    isSaveAsEnabled: PropTypes.bool.isRequired,
    isRunning: PropTypes.bool.isRequired
};

export default ControlToolbar;