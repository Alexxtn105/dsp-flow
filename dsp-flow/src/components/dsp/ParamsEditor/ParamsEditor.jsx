import { useState } from 'react';
import PropTypes from 'prop-types';
import Dialog from '../../common/Dialog/Dialog';
import ValidationService from '../../../services/validationService';
import registry from '../../../plugins/index';
import './ParamsEditor.css';

/**
 * ParamsEditor - компонент для редактирования параметров блока
 */
function ParamsEditor({ isOpen, onClose, blockType, currentParams, onSave, isDarkTheme }) {
    const [params, setParams] = useState(currentParams || {});
    const [errors, setErrors] = useState([]);
    const [audioFileName, setAudioFileName] = useState('');
    const [prevDeps, setPrevDeps] = useState({ currentParams, isOpen });

    if (prevDeps.currentParams !== currentParams || prevDeps.isOpen !== isOpen) {
        setPrevDeps({ currentParams, isOpen });
        if (isOpen) {
            setParams(currentParams || {});
            setErrors([]);
        }
    }

    const handleParamChange = (paramName, value) => {
        setParams(prev => ({
            ...prev,
            [paramName]: value
        }));
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Проверяем, что это WAV файл
        if (!file.name.toLowerCase().endsWith('.wav')) {
            setErrors(['Пожалуйста, выберите WAV файл']);
            return;
        }

        try {
            // Читаем файл как ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Здесь можно добавить парсинг WAV файла
            // Для простоты сейчас просто сохраняем имя и данные
            setAudioFileName(file.name);
            handleParamChange('audioFile', {
                name: file.name,
                data: arrayBuffer,
                size: file.size
            });
            setErrors([]);
        } catch (error) {
            console.error('Error reading audio file:', error);
            setErrors(['Ошибка чтения файла']);
        }
    };

    const handleSave = () => {
        // Валидация параметров
        const validation = ValidationService.validateBlockParams(blockType, params);
        
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        onSave(params);
        onClose();
    };

    const renderParamInput = (paramName, paramValue, config) => {
        const { type, min, max, step, label, options } = config;

        switch (type) {
            case 'number':
                return (
                    <div key={paramName} className="param-input-group">
                        <label className="param-label">{label || paramName}</label>
                        <input
                            type="number"
                            className="param-input"
                            value={paramValue || 0}
                            min={min}
                            max={max}
                            step={step || 1}
                            onChange={(e) => handleParamChange(paramName, parseFloat(e.target.value))}
                        />
                    </div>
                );

            case 'select':
                return (
                    <div key={paramName} className="param-input-group">
                        <label className="param-label">{label || paramName}</label>
                        <select
                            className="param-input"
                            value={paramValue || options[0]}
                            onChange={(e) => handleParamChange(paramName, e.target.value)}
                        >
                            {options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                );

            case 'file':
                return (
                    <div key={paramName} className="param-input-group">
                        <label className="param-label">{label || paramName}</label>
                        <div className="file-input-wrapper">
                            <input
                                type="file"
                                accept=".wav"
                                className="param-input-file"
                                onChange={handleFileSelect}
                                id={`file-${paramName}`}
                            />
                            <label htmlFor={`file-${paramName}`} className="file-input-label">
                                {audioFileName || 'Выбрать WAV файл'}
                            </label>
                        </div>
                        {audioFileName && (
                            <div className="file-info">
                                <span className="file-name">📁 {audioFileName}</span>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    const getParamConfig = () => registry.getParamFields(blockType);

    const paramConfigs = getParamConfig();

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={`Параметры: ${blockType}`}
            className={`params-editor ${isDarkTheme ? 'dark-theme' : ''}`}
            style={{ width: '600px', maxWidth: '100vw' }} // Добавлено
        >
            <div className="params-editor-content">
                {paramConfigs.length === 0 ? (
                    <p className="no-params">Нет настраиваемых параметров для этого блока</p>
                ) : (
                    <div className="params-form">
                        {paramConfigs.map(config => 
                            renderParamInput(config.name, params[config.name], config)
                        )}
                    </div>
                )}

                {errors.length > 0 && (
                    <div className="error-message">
                        ⚠️ {errors.join(', ')}
                    </div>
                )}

                <div className="dialog-buttons">
                    <button onClick={handleSave}>Применить</button>
                    <button onClick={onClose}>Отмена</button>
                </div>
            </div>
        </Dialog>
    );
}

ParamsEditor.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    blockType: PropTypes.string.isRequired,
    currentParams: PropTypes.object,
    onSave: PropTypes.func.isRequired,
    isDarkTheme: PropTypes.bool.isRequired
};

export default ParamsEditor;
