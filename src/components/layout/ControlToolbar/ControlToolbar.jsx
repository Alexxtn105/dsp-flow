import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();

    return (
        <div className={`ct ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className="ct-content">
                {/* File group */}
                <div className="ct-group">
                    <button
                        className="ct-btn ct-btn-new"
                        onClick={onNewScheme}
                        title={t('controlToolbar.newScheme')}
                    >
                        <Icon name="add" size="large" className="ct-icon" />
                    </button>
                    <button
                        className="ct-btn ct-btn-save"
                        onClick={onSave}
                        title={isRunning ? t('controlToolbar.stopToSave') : t('controlToolbar.save')}
                        disabled={!isSaveEnabled || isRunning}
                    >
                        <Icon name="save" size="large" className="ct-icon" />
                    </button>
                    <button
                        className="ct-btn ct-btn-saveas"
                        onClick={onSaveAs}
                        title={isRunning ? t('controlToolbar.stopToSave') : t('controlToolbar.saveAs')}
                        disabled={!isSaveAsEnabled || isRunning}
                    >
                        <Icon name="save_as" size="large" className="ct-icon" />
                    </button>
                    <button
                        className="ct-btn ct-btn-load"
                        onClick={onLoad}
                        title={t('controlToolbar.loadScheme')}
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
                        title={t('controlToolbar.settings')}
                    >
                        <Icon name="tune" size="large" className="ct-icon" />
                    </button>
                    <button
                        className="ct-btn ct-btn-theme"
                        onClick={toggleTheme}
                        title={isDarkTheme ? t('controlToolbar.lightTheme') : t('controlToolbar.darkTheme')}
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
