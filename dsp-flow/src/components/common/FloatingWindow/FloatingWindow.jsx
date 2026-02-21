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

    const windowRef = useRef(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
    const sizeRef = useRef(size);
    const positionRef = useRef(position);

    // Синхронизация refs с state
    useEffect(() => {
        sizeRef.current = size;
        positionRef.current = position;
    }, [size, position]);

    // Обработчик начала перемещения
    const handleMouseDownDrag = useCallback((e) => {
        if (e.target.closest('.window-controls')) return;

        setIsDragging(true);
        dragOffsetRef.current = {
            x: e.clientX - positionRef.current.x,
            y: e.clientY - positionRef.current.y
        };
    }, []);

    // Обработчик начала изменения размера
    const handleMouseDownResize = useCallback((e) => {
        e.stopPropagation();
        setIsResizing(true);
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: sizeRef.current.width,
            height: sizeRef.current.height
        };
    }, []);

    // Обработчик движения мыши — listeners добавляются только при начале drag/resize
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                const newX = e.clientX - dragOffsetRef.current.x;
                const newY = e.clientY - dragOffsetRef.current.y;

                const curSize = sizeRef.current;
                const maxX = window.innerWidth - curSize.width;
                const maxY = window.innerHeight - curSize.height;

                setPosition({
                    x: Math.max(0, Math.min(newX, maxX)),
                    y: Math.max(0, Math.min(newY, maxY))
                });
            }

            if (isResizing) {
                const start = resizeStartRef.current;
                const curPos = positionRef.current;
                const deltaX = e.clientX - start.x;
                const deltaY = e.clientY - start.y;

                const newWidth = Math.max(minWidth, start.width + deltaX);
                const newHeight = Math.max(minHeight, start.height + deltaY);

                const maxWidth = window.innerWidth - curPos.x;
                const maxHeight = window.innerHeight - curPos.y;

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
    }, [isDragging, isResizing, minWidth, minHeight]);

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