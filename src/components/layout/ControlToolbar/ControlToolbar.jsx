import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Icon from '../../common/Icons/Icon.jsx';
import CanvasHelpDialog from '../../dialogs/CanvasHelpDialog/CanvasHelpDialog.jsx';
import { useThemeContext } from '../../../contexts/ThemeContext';
import useTouchDetect from '../../../hooks/useTouchDetect';
import './ControlToolbar.css';

function ControlToolbar({
    onSave,
    onSaveAs,
    onLoad,
    onNewScheme,
    onSettings,
    isSaveEnabled,
    isSaveAsEnabled,
    isRunning,
    onDeleteSelected,
    onUndo,
    hasSelection,
    hasUndoHistory
}) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation();
    const isTouch = useTouchDetect();
    const [showHelp, setShowHelp] = useState(false);

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
                </div>

                <div className="ct-sep" />

                {/* Touch edit group — delete & undo */}
                {isTouch && (
                    <>
                        <div className="ct-group">
                            <button
                                className="ct-btn ct-btn-delete"
                                onClick={onDeleteSelected}
                                title={t('controlToolbar.deleteSelected')}
                                disabled={!hasSelection}
                            >
                                <Icon name="delete" size="large" className="ct-icon" />
                            </button>
                            <button
                                className="ct-btn ct-btn-undo"
                                onClick={onUndo}
                                title={t('controlToolbar.undo')}
                                disabled={!hasUndoHistory}
                            >
                                <Icon name="undo" size="large" className="ct-icon" />
                            </button>
                        </div>
                        <div className="ct-sep" />
                    </>
                )}

                {/* Help group */}
                <div className="ct-group">
                    <button
                        className="ct-btn ct-btn-help"
                        onClick={() => setShowHelp(true)}
                        title={t('controlToolbar.canvasHelp')}
                    >
                        <Icon name="keyboard" size="large" className="ct-icon" />
                    </button>
                </div>
            </div>

            {showHelp && <CanvasHelpDialog onClose={() => setShowHelp(false)} />}
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
    isRunning: PropTypes.bool.isRequired,
    onDeleteSelected: PropTypes.func,
    onUndo: PropTypes.func,
    hasSelection: PropTypes.bool,
    hasUndoHistory: PropTypes.bool
};

export default ControlToolbar;
