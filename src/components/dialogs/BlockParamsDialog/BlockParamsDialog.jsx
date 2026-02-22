import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Dialog from '../../common/Dialog/Dialog.jsx';
import { getBlockDescription, formatParamName, getDefaultParams } from '../../../utils/helpers';
import registry from '../../../engine/PluginRegistry';
import './BlockParamsDialog.css';

/**
 * Диалог редактирования параметров блока
 */
function BlockParamsDialog({ isDarkTheme, onClose, node, onSave }) {
    // Debug: Ensure params are loaded correctly

    const [localParams, setLocalParams] = useState({});
    const [wavFileName, setWavFileName] = useState('');
    const [error, setError] = useState(null);
    const audioContextRef = useRef(null);
    const mountedRef = useRef(true);

    // Инициализация параметров при открытии диалога
    const nodeId = node?.id;
    useEffect(() => {
        if (!node?.data) return;
        const blockType = node.data.blockType;
        const defaultParams = getDefaultParams(blockType);
        const currentParams = node.data.params || {};
        setLocalParams({ ...defaultParams, ...currentParams });
        if (currentParams.wavFile) {
            setWavFileName(currentParams.wavFile.name || 'Файл выбран');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId]);

    // Cleanup AudioContext при размонтировании
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (audioContextRef.current) {
                try {
                    audioContextRef.current.close();
                } catch { /* already closed */ }
                audioContextRef.current = null;
            }
        };
    }, []);

    const blockType = node?.data?.blockType || 'Неизвестный блок';
    const isInputSignal = blockType === 'Audio File';

    const handleParamChange = (key, value, type = 'text') => {
        let parsedValue = value;

        if (type === 'number') {
            parsedValue = parseFloat(value) || 0;
        } else if (type === 'boolean') {
            parsedValue = value === 'true' || value === true;
        }

        setLocalParams(prev => ({
            ...prev,
            [key]: parsedValue
        }));
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Проверяем, что это WAV файл
        if (!file.name.toLowerCase().endsWith('.wav')) {
            setError('Пожалуйста, выберите WAV файл');
            return;
        }

        try {
            // Закрываем предыдущий AudioContext при повторном выборе файла
            if (audioContextRef.current) {
                try { audioContextRef.current.close(); } catch { /* ignore */ }
            }

            // Читаем файл и получаем AudioBuffer для извлечения sample rate
            const arrayBuffer = await file.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioContext;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            if (!mountedRef.current) return;

            setWavFileName(file.name);
            setLocalParams(prev => ({
                ...prev,
                wavFile: file,
                wavFileName: file.name,
                sourceType: 'file',
                // Автоматически извлекаем sample rate из файла
                detectedSampleRate: audioBuffer.sampleRate,
                duration: audioBuffer.duration,
                channels: audioBuffer.numberOfChannels,
                totalSamples: audioBuffer.length
            }));

            audioContext.close();
            audioContextRef.current = null;
        } catch (error) {
            console.error('Ошибка чтения WAV файла:', error);
            setError('Не удалось прочитать WAV файл');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(node.id, localParams);
        onClose();
    };

    const getInputType = (key, value) => {
        const paramOptions = registry.getParamOptions(key);
        if (paramOptions) return 'select-options';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'select';
        return 'text';
    };

    // Параметры, которые не показываем в редакторе (служебные)
    const hiddenParams = ['wavFile', 'signalConfig', 'nodeId', 'onOpenParams', 'onOpenVisualization'];

    const editableParams = Object.entries(localParams).filter(
        ([key]) => !hiddenParams.includes(key)
    );

    return (
        <Dialog
            isOpen={true}
            onClose={onClose}
            title={`Настройки: ${getBlockDescription(blockType)}`}
            className={isDarkTheme ? 'dark-theme' : ''}
        >
            <form onSubmit={handleSubmit} className="block-params-form">
                {/* Специальный UI для входного сигнала - выбор WAV файла */}
                {isInputSignal && (
                    <div className="param-section wav-section">
                        <label className="param-section-label">Источник сигнала</label>
                        <div className="wav-file-input">
                            <input
                                type="file"
                                accept=".wav"
                                onChange={handleFileSelect}
                                id="wav-file-input"
                                className="hidden-file-input"
                            />
                            <label htmlFor="wav-file-input" className="wav-file-btn">
                                {wavFileName || 'Выбрать WAV файл'}
                            </label>
                        </div>
                        {localParams.detectedSampleRate && (
                            <div className="wav-info">
                                <div className="wav-info-item">
                                    <span>Sample Rate:</span>
                                    <strong>{localParams.detectedSampleRate} Гц</strong>
                                </div>
                                <div className="wav-info-item">
                                    <span>Длительность:</span>
                                    <strong>{localParams.duration?.toFixed(2)} сек</strong>
                                </div>
                                <div className="wav-info-item">
                                    <span>Каналов:</span>
                                    <strong>{localParams.channels}</strong>
                                </div>
                                <div className="wav-info-item">
                                    <span>Отсчётов:</span>
                                    <strong>{localParams.totalSamples?.toLocaleString()}</strong>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Редактируемые параметры */}
                {editableParams.length > 0 && (
                    <div className="param-section">
                        <label className="param-section-label">Параметры</label>
                        {editableParams.map(([key, value]) => {
                            // Пропускаем служебные поля WAV
                            if (['detectedSampleRate', 'duration', 'channels', 'totalSamples', 'wavFileName', 'sourceType'].includes(key)) {
                                return null;
                            }

                            const inputType = getInputType(key, value);
                            const paramOptions = registry.getParamOptions(key);

                            return (
                                <div key={key} className="param-row">
                                    <label className="param-label">{formatParamName(key)}</label>
                                    {inputType === 'select-options' ? (
                                        <select
                                            value={value}
                                            onChange={(e) => handleParamChange(key, e.target.value, 'text')}
                                            className="param-input"
                                        >
                                            {paramOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    ) : inputType === 'select' ? (
                                        <select
                                            value={String(value)}
                                            onChange={(e) => handleParamChange(key, e.target.value, 'boolean')}
                                            className="param-input"
                                        >
                                            <option value="true">Да</option>
                                            <option value="false">Нет</option>
                                        </select>
                                    ) : (
                                        <input
                                            type={inputType}
                                            value={value}
                                            onChange={(e) => handleParamChange(key, e.target.value, inputType)}
                                            className="param-input"
                                            step={inputType === 'number' ? 'any' : undefined}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {error && (
                    <div className="error-message" role="alert">
                        {error}
                    </div>
                )}

                <div className="dialog-buttons">
                    <button type="submit">Применить</button>
                    <button type="button" onClick={onClose}>Отмена</button>
                </div>
            </form>
        </Dialog>
    );
}

BlockParamsDialog.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    node: PropTypes.object.isRequired,
    onSave: PropTypes.func.isRequired
};

export default BlockParamsDialog;
