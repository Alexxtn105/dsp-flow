import PropTypes from 'prop-types';
import Icon from '../../common/Icons/Icon.jsx';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './ControlToolbar.css';

function ControlToolbar({
    onSave,
    onSaveAs,
    onLoad,
    onNewScheme,
    onSettings,
    onStart,
    onStop,
    onRewind,
    isSaveEnabled,
    isSaveAsEnabled,
    isRunning,
    isPaused
}) {
    const { isDarkTheme, toggleTheme } = useThemeContext();

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
                        title={isRunning ? "Остановите симуляцию для сохранения" : "Сохранить текущую схему"}
                        disabled={!isSaveEnabled || isRunning}
                    >
                        <Icon name="save" size="large" className="control-btn-icon" />
                        <span className="control-btn-tooltip">Сохранить</span>
                    </button>

                    {/* Кнопка "Сохранить как" */}
                    <button
                        className="control-btn save-as-btn"
                        onClick={onSaveAs}
                        title={isRunning ? "Остановите симуляцию для сохранения" : "Сохранить под новым именем"}
                        disabled={!isSaveAsEnabled || isRunning}
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

                    {/* Кнопка "Старт" / "Продолжить" */}
                    <button
                        className={`control-btn start-btn ${isRunning ? 'active' : ''} ${isPaused ? 'paused' : ''}`}
                        onClick={onStart}
                        title={isPaused ? "Продолжить симуляцию" : "Запустить симуляцию"}
                        disabled={isRunning}
                    >
                        <Icon name="play_arrow" size="large" className="control-btn-icon" />
                        <span className="control-btn-tooltip">{isPaused ? 'Продолжить' : 'Старт'}</span>
                    </button>

                    {/* Кнопка "Пауза" */}
                    <button
                        className="control-btn stop-btn"
                        onClick={onStop}
                        title="Пауза"
                        disabled={!isRunning}
                    >
                        <Icon name="pause" size="large" className="control-btn-icon" />
                        <span className="control-btn-tooltip">Пауза</span>
                    </button>

                    {/* Кнопка "В начало" */}
                    <button
                        className="control-btn rewind-btn"
                        onClick={onRewind}
                        title="Перемотать в начало"
                        disabled={!isRunning && !isPaused}
                    >
                        <Icon name="skip_previous" size="large" className="control-btn-icon" />
                        <span className="control-btn-tooltip">В начало</span>
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
    onSave: PropTypes.func.isRequired,
    onSaveAs: PropTypes.func.isRequired,
    onLoad: PropTypes.func.isRequired,
    onNewScheme: PropTypes.func.isRequired,
    onSettings: PropTypes.func.isRequired,
    onStart: PropTypes.func.isRequired,
    onStop: PropTypes.func.isRequired,
    onRewind: PropTypes.func.isRequired,
    isSaveEnabled: PropTypes.bool.isRequired,
    isSaveAsEnabled: PropTypes.bool.isRequired,
    isRunning: PropTypes.bool.isRequired,
    isPaused: PropTypes.bool.isRequired
};

export default ControlToolbar;