import { useState, useEffect } from 'react';
import './SavePanel.css';

function SavePanel({ onSave, onLoad, savedSchemes, isDarkTheme }) {
    const [schemeName, setSchemeName] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);

    useEffect(() => {
        // Управляем скроллом body при открытии/закрытии диалогов
        if (showSaveDialog || showLoadDialog) {
            document.body.classList.add('dialog-open');
        } else {
            document.body.classList.remove('dialog-open');
        }

        // Очистка при размонтировании
        return () => {
            document.body.classList.remove('dialog-open');
        };
    }, [showSaveDialog, showLoadDialog]);

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
                onClick={() => setShowLoadDialog(true)}
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
                        <div className="schemes-list">
                            {savedSchemes.map((scheme) => (
                                <div
                                    key={scheme.name}
                                    className="scheme-item"
                                    onClick={() => handleLoad(scheme.name)}
                                >
                                    <div className="scheme-name">{scheme.name}</div>
                                    <div className="scheme-date">
                                        {new Date(scheme.timestamp).toLocaleString('ru-RU')}
                                    </div>
                                </div>
                            ))}
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

export default SavePanel;