import { useState } from 'react';
import PropTypes from 'prop-types';
import Dialog from '../../common/Dialog/Dialog.jsx';
import { useDSPEditor } from '../../../contexts/DSPEditorContext';
import ValidationService from '../../../services/validationService';

function SaveDialog({ isDarkTheme, onClose, schemeName, onSaveSuccess, mode }) {
    const { saveScheme, reactFlowInstance } = useDSPEditor();
    const [formData, setFormData] = useState({
        name: mode === 'saveAs' ? '' : schemeName,
        description: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validation = ValidationService.validateSchemeName(formData.name);
        if (!validation.isValid) {
            setError(validation.errors.join(', '));
            return;
        }

        if (!reactFlowInstance) {
            setError('Редактор не готов');
            return;
        }

        try {
            const flow = reactFlowInstance.toObject();
            const schemeData = {
                name: formData.name,
                description: formData.description,
                nodes: flow.nodes,
                edges: flow.edges,
                viewport: flow.viewport
            };

            console.log('Сохранение схемы:', {
                name: schemeData.name,
                nodes: schemeData.nodes?.length,
                edges: schemeData.edges?.length
            });

            const result = await saveScheme(schemeData);

            if (result.success) {
                console.log('Схема успешно сохранена:', formData.name);
                onSaveSuccess(formData.name);
            } else {
                setError(result.errors?.join(', ') || result.message || 'Ошибка сохранения');
                console.error('Ошибка сохранения:', result);
            }
        } catch (err) {
            console.error('Ошибка при сохранении:', err);
            setError('Неожиданная ошибка при сохранении');
        }
    };

    return (
        <Dialog
            isOpen={true}
            onClose={onClose}
            title={mode === 'saveAs' ? 'Сохранить схему как' : 'Сохранить схему'}
            className={isDarkTheme ? 'dark-theme' : ''}
        >
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Название схемы"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={mode === 'save'}
                    autoFocus={mode === 'saveAs'}
                />
                <textarea
                    placeholder="Описание (необязательно)"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                />
                {error && <div className="error-message">⚠️ {error}</div>}
                <div className="dialog-buttons">
                    <button type="submit">{mode === 'saveAs' ? 'Сохранить' : 'Обновить'}</button>
                    <button type="button" onClick={onClose}>Отмена</button>
                </div>
            </form>
        </Dialog>
    );
}

SaveDialog.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    schemeName: PropTypes.string.isRequired,
    onSaveSuccess: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(['save', 'saveAs']).isRequired
};

export default SaveDialog;