import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Dialog from '../../common/Dialog/Dialog.jsx';
import { useDSPEditor } from '../../../contexts/DSPEditorContext';
import { useThemeContext } from '../../../contexts/ThemeContext';
import ValidationService from '../../../services/validationService';

function SaveDialog({ onClose, schemeName, onSaveSuccess, mode }) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation();
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
            setError(t('saveDialog.editorNotReady'));
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
                setError(result.errors?.join(', ') || result.message || t('saveDialog.saveError'));
                console.error('Ошибка сохранения:', result);
            }
        } catch (err) {
            console.error('Ошибка при сохранении:', err);
            setError(t('saveDialog.unexpectedError'));
        }
    };

    return (
        <Dialog
            isOpen={true}
            onClose={onClose}
            title={mode === 'saveAs' ? t('saveDialog.saveSchemeAs') : t('saveDialog.saveScheme')}
            className={isDarkTheme ? 'dark-theme' : ''}
        >
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder={t('saveDialog.schemeName')}
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={mode === 'save'}
                    autoFocus={mode === 'saveAs'}
                />
                <textarea
                    placeholder={t('saveDialog.descriptionOptional')}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                />
                {error && <div className="error-message" role="alert">⚠️ {error}</div>}
                <div className="dialog-buttons">
                    <button type="submit">{mode === 'saveAs' ? t('saveDialog.saveButton') : t('saveDialog.updateButton')}</button>
                    <button type="button" onClick={onClose}>{t('saveDialog.cancel')}</button>
                </div>
            </form>
        </Dialog>
    );
}

SaveDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    schemeName: PropTypes.string.isRequired,
    onSaveSuccess: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(['save', 'saveAs']).isRequired
};

export default SaveDialog;
