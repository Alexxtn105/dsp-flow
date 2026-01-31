import { useState, useEffect, useRef } from 'react';
import './SavePanel.css';

function SavePanel({ onSave, onLoad, savedSchemes, isDarkTheme, onSchemesUpdate }) {
    const [schemeName, setSchemeName] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const schemesListRef = useRef(null);

    useEffect(() => {
        // Управляем скроллом body при открытии/закрытии диалогов
        if (showSaveDialog || showLoadDialog) {
            document.body.classList.add('dialog-open');
            // Обновляем список схем при открытии диалога загрузки
            if (showLoadDialog && onSchemesUpdate) {
                onSchemesUpdate();
            }
        } else {
            document.body.classList.remove('dialog-open');
        }

        // Очистка при размонтировании
        return () => {
            document.body.classList.remove('dialog-open');
        };
    }, [showSaveDialog, showLoadDialog, onSchemesUpdate]);

    const handleSave = () => {
        if (schemeName.trim()) {
            onSave(schemeName.trim());
            setSchemeName('');
            setShowSaveDialog(false);
        }
    };

    const handleLoad = (name) => {
        onLoad(name);
        setShowLoadDialog(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setShowSaveDialog(false);
            setShowLoadDialog(false);
        }
    };

    // Функция для обновления списка при нажатии на кнопку "Загрузить"
    const handleLoadButtonClick = () => {
        if (onSchemesUpdate) {
            onSchemesUpdate();
        }
        setShowLoadDialog(true);
    };

    return (
        <div className="save-panel">
            <button
                className="panel-btn save-btn"
                onClick={() => setShowSaveDialog(true)}
            >
                💾 Сохранить
            </button>

            <button
                className="panel-btn load-btn"
                onClick={handleLoadButtonClick}
                disabled={savedSchemes.length === 0}
            >
                📂 Загрузить
            </button>

            {showSaveDialog && (
                <div className="dialog-overlay" onClick={() => setShowSaveDialog(false)}>
                    <div
                        className={`dialog ${isDarkTheme ? 'dark-theme' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={handleKeyDown}
                    >
                        <h3>Сохранить схему</h3>
                        <input
                            type="text"
                            placeholder="Введите название схемы..."
                            value={schemeName}
                            onChange={(e) => setSchemeName(e.target.value)}
                            autoFocus
                        />
                        <div className="dialog-buttons">
                            <button onClick={handleSave} disabled={!schemeName.trim()}>
                                Сохранить
                            </button>
                            <button onClick={() => setShowSaveDialog(false)}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showLoadDialog && (
                <div className="dialog-overlay" onClick={() => setShowLoadDialog(false)}>
                    <div
                        className={`dialog load-dialog ${isDarkTheme ? 'dark-theme' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={handleKeyDown}
                    >
                        <h3>Загрузить схему</h3>
                        <div
                            className="schemes-list"
                            ref={schemesListRef}
                        >
                            <div className="schemes-list-container">
                                {savedSchemes.map((scheme) => (
                                    <SchemeItem
                                        key={scheme.name}
                                        scheme={scheme}
                                        onClick={() => handleLoad(scheme.name)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="dialog-buttons">
                            <button onClick={() => setShowLoadDialog(false)}>
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Выносим SchemeItem в отдельный компонент для оптимизации анимаций
const SchemeItem = ({ scheme, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const itemRef = useRef(null);

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <div
            ref={itemRef}
            className={`scheme-item ${isHovered ? 'hovered' : ''}`}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            title={`${scheme.name}\nСохранено: ${new Date(scheme.timestamp).toLocaleString('ru-RU')}`}
        >
            <div className="scheme-name">{scheme.name}</div>
            <div className="scheme-date">
                {new Date(scheme.timestamp).toLocaleString('ru-RU')}
            </div>
        </div>
    );
};

export default SavePanel;