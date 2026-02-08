import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './VisualizationWindow.css';

/**
 * Draggable модальное окно визуализации
 */
function VisualizationWindow({
    nodeId,
    title,
    isDarkTheme,
    onClose,
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

    // Drag handlers
    const handleMouseDown = useCallback((e) => {
        if (e.target === headerRef.current || headerRef.current?.contains(e.target)) {
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    }, [position]);

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        }
    }, [isDragging, dragOffset]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

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
        </div>
    );
}

VisualizationWindow.propTypes = {
    nodeId: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    isDarkTheme: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    children: PropTypes.node,
    initialPosition: PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number
    }),
    width: PropTypes.number,
    height: PropTypes.number
};

export default VisualizationWindow;
