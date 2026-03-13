import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './VisualizationWindow.css';

/**
 * Draggable и Resizable модальное окно визуализации
 */
function VisualizationWindow({
    nodeId,
    title,
    onClose,
    onResize,
    children,
    initialPosition,
    width = 400,
    height = 300
}) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation();
    const windowRef = useRef(null);
    const headerRef = useRef(null);
    const [position, setPosition] = useState(initialPosition || { x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Resize state
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    // Extract clientX/clientY from mouse or touch event
    const getPointer = useCallback((e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }, []);

    // Drag handlers
    const handleDragStart = useCallback((e) => {
        const target = e.target;
        if (target === headerRef.current || headerRef.current?.contains(target)) {
            if (target.closest('.viz-window-close')) return;

            const pointer = getPointer(e);
            setIsDragging(true);
            setDragOffset({
                x: pointer.x - position.x,
                y: pointer.y - position.y
            });
            e.preventDefault();
        }
    }, [position, getPointer]);

    const handlePointerMove = useCallback((e) => {
        const pointer = getPointer(e);
        if (isDragging) {
            setPosition({
                x: pointer.x - dragOffset.x,
                y: pointer.y - dragOffset.y
            });
        } else if (isResizing) {
            const deltaX = pointer.x - resizeStart.x;
            const deltaY = pointer.y - resizeStart.y;
            const newWidth = resizeStart.width + deltaX;
            const newHeight = resizeStart.height + deltaY;
            if (onResize) {
                onResize(nodeId, newWidth, newHeight);
            }
        }
    }, [isDragging, dragOffset, isResizing, resizeStart, onResize, nodeId, getPointer]);

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
    }, []);

    // Resize handlers
    const handleResizeStart = useCallback((e) => {
        e.stopPropagation();
        const pointer = getPointer(e);
        setIsResizing(true);
        setResizeStart({
            x: pointer.x,
            y: pointer.y,
            width: width,
            height: height
        });
        e.preventDefault();
    }, [width, height, getPointer]);

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handlePointerMove);
            window.addEventListener('mouseup', handlePointerUp);
            window.addEventListener('touchmove', handlePointerMove, { passive: false });
            window.addEventListener('touchend', handlePointerUp);
        }

        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [isDragging, isResizing, handlePointerMove, handlePointerUp]);

    return (
        <div
            ref={windowRef}
            className={`visualization-window ${isDarkTheme ? 'dark-theme' : ''}`}
            style={{
                left: position.x,
                top: position.y,
                width,
                height
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
        >
            <div className="viz-window-header" ref={headerRef}>
                <span className="viz-window-title">{title}</span>
                <button
                    className="viz-window-close"
                    onClick={() => onClose(nodeId)}
                    aria-label={t('viz.closeWindow')}
                >
                    ✕
                </button>
            </div>
            <div className="viz-window-content">
                {children}
            </div>

            {/* Resize Handle */}
            <div
                className="viz-window-resize-handle"
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
                role="separator"
                aria-label={t('viz.resizeWindow')}
                tabIndex={0}
            />
        </div>
    );
}

VisualizationWindow.propTypes = {
    nodeId: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onResize: PropTypes.func, // New prop
    children: PropTypes.node,
    initialPosition: PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number
    }),
    width: PropTypes.number,
    height: PropTypes.number
};

export default VisualizationWindow;
