import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icons/Icon';
import './FloatingWindow.css';

function FloatingWindow({
                            title,
                            children,
                            onClose,
                            initialPosition = { x: 100, y: 100 },
                            initialSize = { width: 800, height: 600 },
                            minWidth = 400,
                            minHeight = 300,
                            isDarkTheme = false
                        }) {
    const [position, setPosition] = useState(initialPosition);
    const [size, setSize] = useState(initialSize);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const windowRef = useRef(null);

    // Обработчик начала перемещения
    const handleMouseDownDrag = useCallback((e) => {
        if (e.target.closest('.window-controls')) return;

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    }, [position]);

    // Обработчик начала изменения размера
    const handleMouseDownResize = useCallback((e) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height
        });
    }, [size]);

    // Обработчик движения мыши
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;

                // Ограничиваем позицию в пределах экрана
                const maxX = window.innerWidth - size.width;
                const maxY = window.innerHeight - size.height;

                setPosition({
                    x: Math.max(0, Math.min(newX, maxX)),
                    y: Math.max(0, Math.min(newY, maxY))
                });
            }

            if (isResizing) {
                const deltaX = e.clientX - resizeStart.x;
                const deltaY = e.clientY - resizeStart.y;

                const newWidth = Math.max(minWidth, resizeStart.width + deltaX);
                const newHeight = Math.max(minHeight, resizeStart.height + deltaY);

                // Ограничиваем размер в пределах экрана
                const maxWidth = window.innerWidth - position.x;
                const maxHeight = window.innerHeight - position.y;

                setSize({
                    width: Math.min(newWidth, maxWidth),
                    height: Math.min(newHeight, maxHeight)
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, dragOffset, position, size, resizeStart, minWidth, minHeight]);

    return (
        <div
            ref={windowRef}
            className={`floating-window ${isDarkTheme ? 'dark-theme' : ''}`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`
            }}
        >
            <div
                className="window-header"
                onMouseDown={handleMouseDownDrag}
            >
                <span className="window-title">{title}</span>
                <div className="window-controls">
                    <button
                        className="window-control-btn close-btn"
                        onClick={onClose}
                        title="Закрыть"
                    >
                        <Icon name="close" size="small" />
                    </button>
                </div>
            </div>

            <div className="window-content">
                {children}
            </div>

            <div
                className="resize-handle"
                onMouseDown={handleMouseDownResize}
            >
                <Icon name="drag_indicator" size="small" />
            </div>
        </div>
    );
}

FloatingWindow.propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    onClose: PropTypes.func.isRequired,
    initialPosition: PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number
    }),
    initialSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    minWidth: PropTypes.number,
    minHeight: PropTypes.number,
    isDarkTheme: PropTypes.bool
};

export default FloatingWindow;