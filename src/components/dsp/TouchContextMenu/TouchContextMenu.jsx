import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Icon from '../../common/Icons/Icon.jsx';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { isVisualizationBlock } from '../../../utils/helpers';
import './TouchContextMenu.css';

function TouchContextMenu({ node, nodeElement, onOpenParams, onDelete, onDuplicate, onOpenVisualization, onClose }) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation();
    const menuRef = useRef(null);
    const canVisualize = isVisualizationBlock(node.data.blockType);

    const updatePosition = useCallback(() => {
        if (!nodeElement || !menuRef.current) return;
        const rect = nodeElement.getBoundingClientRect();
        const menu = menuRef.current;
        const menuRect = menu.getBoundingClientRect();

        // Position above the node, centered horizontally
        let left = rect.left + rect.width / 2;
        let top = rect.top - menuRect.height - 8;

        // If not enough space above, show below
        if (top < 8) {
            top = rect.bottom + 8;
        }

        // Clamp horizontally
        const halfWidth = menuRect.width / 2;
        if (left - halfWidth < 8) left = halfWidth + 8;
        if (left + halfWidth > window.innerWidth - 8) left = window.innerWidth - halfWidth - 8;

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.transform = 'translateX(-50%)';
    }, [nodeElement]);

    useEffect(() => {
        updatePosition();

        // Reposition on scroll/resize (RAF-throttled)
        const viewport = document.querySelector('.react-flow__viewport');
        let observer;
        let rafId = null;
        if (viewport) {
            observer = new MutationObserver(() => {
                if (rafId !== null) return;
                rafId = requestAnimationFrame(() => {
                    updatePosition();
                    rafId = null;
                });
            });
            observer.observe(viewport, { attributes: true, attributeFilter: ['style'] });
        }

        return () => {
            if (observer) observer.disconnect();
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [updatePosition]);

    // Close on tap outside
    useEffect(() => {
        const handlePointerDown = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        // Delay to avoid catching the same tap that opened the menu
        const timer = setTimeout(() => {
            document.addEventListener('pointerdown', handlePointerDown);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [onClose]);

    const handleAction = (action) => {
        action();
        onClose();
    };

    return createPortal(
        <div
            ref={menuRef}
            className={`touch-context-menu ${isDarkTheme ? 'dark-theme' : ''}`}
            style={{ position: 'fixed' }}
        >
            <button
                className="touch-context-menu-btn touch-context-menu-btn-settings"
                onClick={() => handleAction(() => onOpenParams(node.id))}
                title={t('touchMenu.settings')}
                aria-label={t('touchMenu.settings')}
            >
                <Icon name="tune" size="medium" />
            </button>
            {canVisualize && (
                <button
                    className="touch-context-menu-btn touch-context-menu-btn-visualize"
                    onClick={() => handleAction(() => onOpenVisualization(node.id))}
                    title={t('touchMenu.visualize')}
                    aria-label={t('touchMenu.visualize')}
                >
                    <Icon name="visibility" size="medium" />
                </button>
            )}
            <button
                className="touch-context-menu-btn touch-context-menu-btn-duplicate"
                onClick={() => handleAction(() => onDuplicate(node.id))}
                title={t('touchMenu.duplicate')}
                aria-label={t('touchMenu.duplicate')}
            >
                <Icon name="content_copy" size="medium" />
            </button>
            <button
                className="touch-context-menu-btn touch-context-menu-btn-delete"
                onClick={() => handleAction(() => onDelete(node.id))}
                title={t('touchMenu.delete')}
                aria-label={t('touchMenu.delete')}
            >
                <Icon name="delete" size="medium" />
            </button>
        </div>,
        document.body
    );
}

TouchContextMenu.propTypes = {
    node: PropTypes.object.isRequired,
    nodeElement: PropTypes.instanceOf(Element),
    onOpenParams: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onDuplicate: PropTypes.func.isRequired,
    onOpenVisualization: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default TouchContextMenu;
