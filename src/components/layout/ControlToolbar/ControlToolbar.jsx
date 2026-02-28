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
    isSaveEnabled,
    isSaveAsEnabled,
    isRunning
}) {
    const { isDarkTheme, toggleTheme } = useThemeContext();

    return (
        <div className={`ct ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="ct-content">
                {/* File group */}
                <div className="ct-group">
                    <button
                        className="ct-btn ct-btn-new"
                        onClick={onNewScheme}
                        title="Новая схема"
                    >
                        <Icon name="add" size="large" className="ct-icon" />
                    </button>
                    <button
                        className="ct-btn ct-btn-save"
                        onClick={onSave}
                        title={isRunning ? 'Остановите для сохранения' : 'Сохранить'}
                        disabled={!isSaveEnabled || isRunning}
                    >
                        <Icon name="save" size="large" className="ct-icon" />
                    </button>
                    <button
                        className="ct-btn ct-btn-saveas"
                        onClick={onSaveAs}
                        title={isRunning ? 'Остановите для сохранения' : 'Сохранить как'}
                        disabled={!isSaveAsEnabled || isRunning}
                    >
                        <Icon name="save_as" size="large" className="ct-icon" />
                    </button>
                    <button
                        className="ct-btn ct-btn-load"
                        onClick={onLoad}
                        title="Загрузить схему"
                    >
                        <Icon name="folder_open" size="large" className="ct-icon" />
                    </button>
                </div>

                <div className="ct-sep" />

                {/* Settings group */}
                <div className="ct-group">
                    <button
                        className="ct-btn ct-btn-settings"
                        onClick={onSettings}
                        title="Настройки схемы"
                    >
                        <Icon name="tune" size="large" className="ct-icon" />
                    </button>
                    <button
                        className="ct-btn ct-btn-theme"
                        onClick={toggleTheme}
                        title={isDarkTheme ? 'Светлая тема' : 'Тёмная тема'}
                    >
                        <Icon
                            name={isDarkTheme ? 'light_mode' : 'dark_mode'}
                            size="large"
                            className="ct-icon"
                        />
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
    isSaveEnabled: PropTypes.bool.isRequired,
    isSaveAsEnabled: PropTypes.bool.isRequired,
    isRunning: PropTypes.bool.isRequired
};

export default ControlToolbar;
