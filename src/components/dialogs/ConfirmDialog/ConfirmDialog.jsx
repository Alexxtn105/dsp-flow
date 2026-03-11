import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Dialog from '../../common/Dialog/Dialog.jsx';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './ConfirmDialog.css';

/**
 * Универсальный диалог подтверждения / информационного сообщения
 * mode='confirm' — OK + Отмена
 * mode='alert' — только OK
 */
function ConfirmDialog({ message, title, onConfirm, onClose, mode = 'confirm' }) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation();
    return (
        <Dialog
            isOpen
            onClose={onClose}
            title={title}
            className={isDarkTheme ? 'dark-theme' : ''}
        >
            <p className="confirm-dialog-message">
                {message}
            </p>
            <div className="dialog-buttons">
                {mode === 'confirm' ? (
                    <>
                        <button onClick={onConfirm}>OK</button>
                        <button onClick={onClose}>{t('confirmDialog.cancel')}</button>
                    </>
                ) : (
                    <button onClick={onClose}>OK</button>
                )}
            </div>
        </Dialog>
    );
}

ConfirmDialog.propTypes = {
    message: PropTypes.string.isRequired,
    title: PropTypes.string,
    onConfirm: PropTypes.func,
    onClose: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(['confirm', 'alert']),
};

export default ConfirmDialog;
