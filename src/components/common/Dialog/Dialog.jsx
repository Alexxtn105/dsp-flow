import { useEffect, useCallback, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import './Dialog.css';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
    const dialogRef = useRef(null);
    const previousFocusRef = useRef(null);
    const rafIdRef = useRef(null);
    const titleId = useId();

    // Обработчик нажатия клавиш (Escape + focus trap)
    const handleKeyDown = useCallback((e) => {
        if (closeOnEscape && e.key === 'Escape') {
            onClose();
            return;
        }

        // Focus trap
        if (e.key === 'Tab' && dialogRef.current) {
            const focusable = dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
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

        // Сохраняем текущий фокус для восстановления при закрытии
        previousFocusRef.current = document.activeElement;

        // Блокируем скролл body
        document.body.classList.add('dialog-open');

        // Добавляем обработчик клавиатуры
        document.addEventListener('keydown', handleKeyDown);

        // Автофокус на первый интерактивный элемент
        rafIdRef.current = requestAnimationFrame(() => {
            if (dialogRef.current) {
                const focusable = dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
                if (focusable.length > 0) {
                    focusable[0].focus();
                } else {
                    dialogRef.current.focus();
                }
            }
        });

        return () => {
            document.body.classList.remove('dialog-open');
            document.removeEventListener('keydown', handleKeyDown);

            // Отменяем requestAnimationFrame при cleanup
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }

            // Возвращаем фокус на предыдущий элемент (безопасно)
            const prevEl = previousFocusRef.current;
            if (prevEl && typeof prevEl.focus === 'function' && document.contains(prevEl)) {
                prevEl.focus();
            }
            previousFocusRef.current = null;
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return createPortal(
        <div className="dialog-overlay" onClick={handleOverlayClick}>
            <div
                ref={dialogRef}
                className={`dialog ${className}`}
                onClick={handleDialogClick}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                tabIndex={-1}
            >
                {title && <h3 className="dialog-title" id={titleId}>{title}</h3>}
                <div className="dialog-content">
                    {children}
                </div>
            </div>
        </div>,
        document.body
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
