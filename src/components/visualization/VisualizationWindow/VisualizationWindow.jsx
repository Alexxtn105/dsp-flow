import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './VisualizationWindow.css';

/**
 * Draggable и Resizable модальное окно визуализации
 */
function VisualizationWindow({
    nodeId,
    title,
    isDarkTheme,
    onClose,
    onResize,
    children,
    initialPosition,
    width = 400,
    height = 300
}) {
    const windowRef = useRef(null);
    const headerRef = useRef(null);
    const [position, setPosition] = useState(initialPosition || { x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Resize state
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    // Drag handlers
    const handleMouseDown = useCallback((e) => {
        if (e.target === headerRef.current || headerRef.current?.contains(e.target)) {
            // Prevent dragging if clicking close button
            if (e.target.closest('.viz-window-close')) return;

            setIsDragging(true);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
            e.preventDefault(); // Prevent text selection
        }
    }, [position]);

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        } else if (isResizing) {
            const deltaX = e.clientX - resizeStart.x;
            const deltaY = e.clientY - resizeStart.y;

            // Calculate new size
            const newWidth = resizeStart.width + deltaX;
            const newHeight = resizeStart.height + deltaY;

            // Constraints handled by VisualizationManager callback, but good to have local feedback?
            // Actually, we should call onResize here
            if (onResize) {
                onResize(nodeId, newWidth, newHeight);
            }
        }
    }, [isDragging, dragOffset, isResizing, resizeStart, onResize, nodeId]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
    }, []);

    // Resize handlers
    const handleResizeMouseDown = useCallback((e) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: width,
            height: height
        });
        e.preventDefault();
    }, [width, height]);

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

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
            onMouseDown={handleMouseDown}
        >
            <div className="viz-window-header" ref={headerRef}>
                <span className="viz-window-title">{title}</span>
                <button className="viz-window-close" onClick={() => onClose(nodeId)}>
                    ✕
                </button>
            </div>
            <div className="viz-window-content">
                {children}
            </div>

            {/* Resize Handle */}
            <div
                className="viz-window-resize-handle"
                onMouseDown={handleResizeMouseDown}
            />
        </div>
    );
}

VisualizationWindow.propTypes = {
    nodeId: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    isDarkTheme: PropTypes.bool.isRequired,
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
