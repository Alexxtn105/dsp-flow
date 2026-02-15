import { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './Dialog.css';

/**
 * Общий компонент диалога
 * Устраняет дублирование кода в SaveDialog и LoadDialog
 */
function Dialog({
    isOpen,
    onClose,
    title,
    children,
    className = '',
    closeOnEscape = true,
    closeOnOverlay = true
}) {
    // Обработчик нажатия Escape
    const handleKeyDown = useCallback((e) => {
        if (closeOnEscape && e.key === 'Escape') {
            onClose();
        }
    }, [closeOnEscape, onClose]);

    // Обработчик клика по overlay
    const handleOverlayClick = useCallback(() => {
        if (closeOnOverlay) {
            onClose();
        }
    }, [closeOnOverlay, onClose]);

    // Предотвращаем клик по содержимому диалога
    const handleDialogClick = useCallback((e) => {
        e.stopPropagation();
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        // Блокируем скролл body
        document.body.classList.add('dialog-open');

        // Добавляем обработчик клавиатуры
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.classList.remove('dialog-open');
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="dialog-overlay" onClick={handleOverlayClick}>
            <div
                className={`dialog ${className}`}
                onClick={handleDialogClick}
            >
                {title && <h3 className="dialog-title">{title}</h3>}
                <div className="dialog-content">
                    {children}
                </div>
            </div>
        </div>
    );
}

Dialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    closeOnEscape: PropTypes.bool,
    closeOnOverlay: PropTypes.bool
};

export default Dialog;
