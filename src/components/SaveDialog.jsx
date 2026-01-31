import { useState, useEffect } from 'react';
import './SaveDialog.css';

function SaveDialog({ isDarkTheme, onClose, schemeName, onSaveSuccess, mode = 'save' }) {
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingSchemes, setExistingSchemes] = useState([]);

    useEffect(() => {
        // Загружаем список существующих схем для проверки дубликатов
        try {
            const schemes = window.dspEditorAPI?.getSavedSchemes() || [];
            setExistingSchemes(schemes);

            // Для режима "save" загружаем существующее описание схемы
            if (mode === 'save' && schemeName && schemeName !== 'not_saved') {
                const existingScheme = schemes.find(s => s.name === schemeName);
                if (existingScheme) {
                    setFormData({
                        name: schemeName,
                        description: existingScheme.description || ''
                    });
                } else {
                    setFormData({
                        name: schemeName,
                        description: ''
                    });
                }
            } else {
                // Для режима "saveAs" оставляем пустое описание или используем текущее имя
                setFormData({
                    name: mode === 'saveAs' ? '' : schemeName,
                    description: ''
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки списка схем:', error);
            setFormData({
                name: mode === 'saveAs' ? '' : schemeName,
                description: ''
            });
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, schemeName, mode]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Введите название схемы');
            return;
        }

        // Для режима "Сохранить как" проверяем, нет ли схемы с таким именем
        if (mode === 'saveAs') {
            const exists = existingSchemes.some(scheme =>
                scheme.name.toLowerCase() === formData.name.trim().toLowerCase()
            );
            if (exists) {
                setError('Схема с таким именем уже существует');
                return;
            }
        }

        setIsSubmitting(true);
        setError('');

        try {
            const result = await window.dspEditorAPI?.saveScheme(formData);

            if (result?.success) {
                onSaveSuccess(formData.name);
            } else {
                setError(result?.error || 'Ошибка при сохранении');
            }
        } catch (err) {
            setError('Ошибка при сохранении схемы');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        if (error) setError('');
    };

    const title = mode === 'saveAs' ? 'Сохранить схему как' : 'Сохранить схему';
    const buttonText = mode === 'saveAs' ? 'Сохранить' : 'Обновить';
    const placeholder = mode === 'saveAs' ? 'Введите новое название схемы...' : 'Название схемы';

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div
                className={`dialog save-dialog ${isDarkTheme ? 'dark-theme' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <h3>{title}</h3>

                <form onSubmit={handleSubmit} className="save-form">
                    <div className="form-field">
                        <label htmlFor="scheme-name">
                            Название схемы <span className="required">*</span>
                        </label>
                        <input
                            id="scheme-name"
                            type="text"
                            placeholder={placeholder}
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            autoFocus={mode === 'saveAs'}
                            maxLength={100}
                            disabled={isSubmitting || mode === 'save'}
                            readOnly={mode === 'save'}
                        />
                        {mode === 'save' && (
                            <div className="form-hint">
                                Для изменения названия используйте "Сохранить как"
                            </div>
                        )}
                    </div>

                    <div className="form-field">
                        <label htmlFor="scheme-description">Описание (необязательно)</label>
                        <textarea
                            id="scheme-description"
                            placeholder="Опишите назначение схемы, её особенности..."
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            rows={4}
                            maxLength={500}
                            disabled={isSubmitting}
                        />
                        <div className="form-hint">
                            Максимум 500 символов. Осталось: {500 - formData.description.length}
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="dialog-buttons">
                        <button
                            type="submit"
                            disabled={!formData.name.trim() || isSubmitting}
                            className="save-submit-btn"
                        >
                            {isSubmitting ? 'Сохранение...' : buttonText}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SaveDialog;