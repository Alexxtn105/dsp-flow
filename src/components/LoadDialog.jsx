import { useState, useEffect } from 'react';
import './LoadDialog.css';

function LoadDialog({ isDarkTheme, onClose, onLoadSuccess }) {
    const [savedSchemes, setSavedSchemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [schemeToDelete, setSchemeToDelete] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        loadSchemes();

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const loadSchemes = () => {
        try {
            const schemes = window.dspEditorAPI?.getSavedSchemes() || [];
            // Сортируем схемы по дате (сначала новые)
            schemes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setSavedSchemes(schemes);
        } catch (err) {
            setError('Ошибка загрузки списка схем');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = async (schemeName) => {
        try {
            const result = await window.dspEditorAPI?.loadScheme(schemeName);

            if (result?.success) {
                // Передаем имя схемы в родительский компонент
                onLoadSuccess(schemeName);
            } else {
                setError(result?.error || 'Ошибка загрузки схемы');
            }
        } catch (err) {
            setError('Ошибка при загрузке схемы');
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!schemeToDelete) return;

        try {
            const result = await window.dspEditorAPI?.deleteScheme(schemeToDelete);

            if (result?.success) {
                loadSchemes();
            } else {
                setError(result?.error || 'Ошибка удаления схемы');
            }
        } catch (err) {
            setError('Ошибка при удалении схемы');
            console.error(err);
        } finally {
            setShowConfirm(false);
            setSchemeToDelete(null);
        }
    };

    const confirmDelete = (schemeName, e) => {
        e.stopPropagation();
        setSchemeToDelete(schemeName);
        setShowConfirm(true);
    };

    const cancelDelete = () => {
        setShowConfirm(false);
        setSchemeToDelete(null);
    };

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div
                className={`dialog load-dialog ${isDarkTheme ? 'dark-theme' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <h3>Загрузить схему</h3>

                {loading ? (
                    <div className="loading">Загрузка...</div>
                ) : savedSchemes.length === 0 ? (
                    <div className="empty-list">
                        Нет сохраненных схем
                    </div>
                ) : (
                    <div className="schemes-list">
                        {savedSchemes.map((scheme) => (
                            <div
                                key={scheme.name}
                                className="scheme-item"
                                onClick={() => handleLoad(scheme.name)}
                            >
                                <div className="scheme-header">
                                    <div className="scheme-name">{scheme.name}</div>
                                    <div className="scheme-date">
                                        {new Date(scheme.timestamp).toLocaleString('ru-RU')}
                                    </div>
                                </div>

                                {scheme.description && (
                                    <div className="scheme-description">
                                        {scheme.description}
                                    </div>
                                )}

                                <div className="scheme-actions">
                                    <button
                                        className="scheme-action-btn load-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleLoad(scheme.name);
                                        }}
                                    >
                                        Загрузить
                                    </button>
                                    <button
                                        className="scheme-action-btn delete-btn"
                                        onClick={(e) => confirmDelete(scheme.name, e)}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        ⚠️ {error}
                    </div>
                )}

                <div className="dialog-buttons">
                    <button onClick={onClose}>
                        Закрыть
                    </button>
                </div>
            </div>

            {/* Диалог подтверждения удаления */}
            {showConfirm && (
                <div className="confirm-overlay" onClick={cancelDelete}>
                    <div
                        className={`confirm-dialog ${isDarkTheme ? 'dark-theme' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>Удалить схему</h3>
                        <p>
                            Вы уверены, что хотите удалить схему "{schemeToDelete}"?<br />
                            Это действие нельзя отменить.
                        </p>
                        <div className="confirm-buttons">
                            <button
                                className="confirm-btn delete-confirm"
                                onClick={handleDelete}
                            >
                                Удалить
                            </button>
                            <button
                                className="confirm-btn cancel"
                                onClick={cancelDelete}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LoadDialog;