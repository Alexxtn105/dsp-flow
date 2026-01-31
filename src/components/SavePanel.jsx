import { useState, useEffect } from 'react';
import './SavePanel.css';

function SavePanel({ onSave, onLoad, onDelete, savedSchemes, isDarkTheme, onSchemesUpdate }) {
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [schemeToDelete, setSchemeToDelete] = useState(null);
    const [saveForm, setSaveForm] = useState({
        name: '',
        description: ''
    });

    useEffect(() => {
        if (showSaveDialog || showLoadDialog || showConfirmDialog) {
            document.body.classList.add('dialog-open');
            if (showLoadDialog && onSchemesUpdate) {
                onSchemesUpdate();
            }
        } else {
            document.body.classList.remove('dialog-open');
        }

        return () => {
            document.body.classList.remove('dialog-open');
        };
    }, [showSaveDialog, showLoadDialog, showConfirmDialog, onSchemesUpdate]);

    const handleSave = async () => {
        if (!saveForm.name.trim()) {
            alert('Введите название схемы');
            return;
        }

        const success = await onSave(saveForm);
        if (success) {
            setSaveForm({ name: '', description: '' });
            setShowSaveDialog(false);
        }
    };

    const handleLoad = async (schemeName) => {
        const success = await onLoad(schemeName);
        if (success) {
            setShowLoadDialog(false);
        }
    };

    const handleDeleteClick = (schemeName, e) => {
        e.stopPropagation();
        setSchemeToDelete(schemeName);
        setShowConfirmDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (schemeToDelete) {
            const success = await onDelete(schemeToDelete);
            if (success) {
                setShowConfirmDialog(false);
                setSchemeToDelete(null);
            }
        }
    };

    const handleCancelDelete = () => {
        setShowConfirmDialog(false);
        setSchemeToDelete(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && showSaveDialog) {
            handleSave();
        } else if (e.key === 'Escape') {
            if (showSaveDialog) setShowSaveDialog(false);
            if (showLoadDialog) setShowLoadDialog(false);
            if (showConfirmDialog) handleCancelDelete();
        }
    };

    const handleLoadButtonClick = () => {
        if (onSchemesUpdate) {
            onSchemesUpdate();
        }
        setShowLoadDialog(true);
    };

    const handleSaveButtonClick = () => {
        setSaveForm({ name: '', description: '' });
        setShowSaveDialog(true);
    };

    const handleFormChange = (field, value) => {
        setSaveForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="save-panel">
            <button
                className="panel-btn save-btn"
                onClick={handleSaveButtonClick}
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

            {/* Диалог сохранения */}
            {showSaveDialog && (
                <div className="dialog-overlay" onClick={() => setShowSaveDialog(false)}>
                    <div
                        className={`dialog ${isDarkTheme ? 'dark-theme' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={handleKeyDown}
                    >
                        <h3>Сохранить схему</h3>
                        <div className="save-form">
                            <div className="form-field">
                                <label htmlFor="scheme-name">
                                    Название схемы <span className="required">*</span>
                                </label>
                                <input
                                    id="scheme-name"
                                    type="text"
                                    placeholder="Введите название схемы..."
                                    value={saveForm.name}
                                    onChange={(e) => handleFormChange('name', e.target.value)}
                                    autoFocus
                                    maxLength={100}
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="scheme-description">Описание (необязательно)</label>
                                <textarea
                                    id="scheme-description"
                                    placeholder="Опишите назначение схемы, её особенности..."
                                    value={saveForm.description}
                                    onChange={(e) => handleFormChange('description', e.target.value)}
                                    rows={4}
                                    maxLength={500}
                                />
                                <div className="form-hint">
                                    Максимум 500 символов. Осталось: {500 - saveForm.description.length}
                                </div>
                            </div>
                        </div>
                        <div className="dialog-buttons">
                            <button onClick={handleSave} disabled={!saveForm.name.trim()}>
                                Сохранить
                            </button>
                            <button onClick={() => setShowSaveDialog(false)}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Диалог загрузки */}
            {showLoadDialog && (
                <div className="dialog-overlay" onClick={() => setShowLoadDialog(false)}>
                    <div
                        className={`dialog load-dialog ${isDarkTheme ? 'dark-theme' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={handleKeyDown}
                    >
                        <h3>Загрузить схему</h3>
                        <div className="schemes-list">
                            <div className="schemes-list-container">
                                {savedSchemes.length === 0 ? (
                                    <div className="scheme-item" style={{ cursor: 'default', textAlign: 'center' }}>
                                        <div className="scheme-name" style={{ color: '#6b7280' }}>
                                            Нет сохраненных схем
                                        </div>
                                    </div>
                                ) : (
                                    savedSchemes.map((scheme) => (
                                        <SchemeItem
                                            key={scheme.name}
                                            scheme={scheme}
                                            onLoad={() => handleLoad(scheme.name)}
                                            onDelete={(e) => handleDeleteClick(scheme.name, e)}
                                            isDarkTheme={isDarkTheme}
                                        />
                                    ))
                                )}
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

            {/* Диалог подтверждения удаления */}
            {showConfirmDialog && (
                <div className="dialog-overlay" onClick={handleCancelDelete}>
                    <div
                        className={`dialog confirm-dialog ${isDarkTheme ? 'dark-theme' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={handleKeyDown}
                    >
                        <h3>Удалить схему</h3>
                        <p>
                            Вы уверены, что хотите удалить схему "{schemeToDelete}"?<br />
                            Это действие нельзя отменить.
                        </p>
                        <div className="confirm-buttons">
                            <button className="confirm-btn confirm-delete" onClick={handleConfirmDelete}>
                                Удалить
                            </button>
                            <button className="confirm-btn confirm-cancel" onClick={handleCancelDelete}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Компонент для отображения схемы
const SchemeItem = ({ scheme, onLoad, onDelete}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`scheme-item ${isHovered ? 'hovered' : ''}`}
            onClick={onLoad}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title={scheme.description ?
                `${scheme.name}\n${scheme.description}\n\nСохранено: ${new Date(scheme.timestamp).toLocaleString('ru-RU')}` :
                `${scheme.name}\n\nСохранено: ${new Date(scheme.timestamp).toLocaleString('ru-RU')}`
            }
        >
            <div className="scheme-name">{scheme.name}</div>
            {scheme.description && (
                <div className="scheme-description">{scheme.description}</div>
            )}
            <div className="scheme-date">
                {new Date(scheme.timestamp).toLocaleString('ru-RU')}
            </div>
            <div className="scheme-actions">
                <button
                    className="scheme-action-btn load-btn-action"
                    onClick={onLoad}
                >
                    Загрузить
                </button>
                <button
                    className="scheme-action-btn delete-btn-action"
                    onClick={onDelete}
                >
                    Удалить
                </button>
            </div>
        </div>
    );
};

export default SavePanel;