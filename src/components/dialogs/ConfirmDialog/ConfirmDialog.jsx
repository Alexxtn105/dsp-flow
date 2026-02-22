import PropTypes from 'prop-types';
import Dialog from '../../common/Dialog/Dialog.jsx';

/**
 * Универсальный диалог подтверждения / информационного сообщения
 * mode='confirm' — OK + Отмена
 * mode='alert' — только OK
 */
function ConfirmDialog({ isDarkTheme, message, title, onConfirm, onClose, mode = 'confirm' }) {
    return (
        <Dialog
            isOpen
            onClose={onClose}
            title={title}
            className={isDarkTheme ? 'dark-theme' : ''}
        >
            <p style={{ margin: '0 0 16px', whiteSpace: 'pre-line', fontSize: '14px', lineHeight: 1.5 }}>
                {message}
            </p>
            <div className="dialog-buttons">
                {mode === 'confirm' ? (
                    <>
                        <button onClick={onConfirm}>OK</button>
                        <button onClick={onClose}>Отмена</button>
                    </>
                ) : (
                    <button onClick={onClose}>OK</button>
                )}
            </div>
        </Dialog>
    );
}

ConfirmDialog.propTypes = {
    isDarkTheme: PropTypes.bool,
    message: PropTypes.string.isRequired,
    title: PropTypes.string,
    onConfirm: PropTypes.func,
    onClose: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(['confirm', 'alert']),
};

export default ConfirmDialog;
