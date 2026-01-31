import { useState, useEffect } from 'react';
import './SaveDialog.css';

function SaveDialog({ isDarkTheme, onClose, schemeName, onSaveSuccess, mode = 'save' }) {
    const [formData, setFormData] = useState({
        name: mode === 'saveAs' ? '' : schemeName,
        description: ''
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Введите название схемы');
            return;
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

    const title = mode === 'saveAs' ? 'Сохранить как' : 'Сохранить схему';
    const buttonText = mode === 'saveAs' ? 'Сохранить' : 'Обновить';

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
                            placeholder="Введите название схемы..."
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            autoFocus
                            maxLength={100}
                            disabled={isSubmitting}
                        />
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