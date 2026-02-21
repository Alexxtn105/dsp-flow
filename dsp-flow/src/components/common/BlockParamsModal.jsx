import {useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import Icon from './Icons/Icon.jsx';
import ValidationService from '../../services/validationService';
import './BlockParamsModal.css';

function BlockParamsModal({
                              isOpen,
                              onClose,
                              onSave,
                              blockType,
                              currentParams,
                              isDarkTheme
                          }) {
    console.log('BlockParamsModal props:', {isOpen, blockType, currentParams});


    const [params, setParams] = useState(currentParams || {});
    const [errors, setErrors] = useState({});
    const [fileInfo, setFileInfo] = useState(currentParams?.audioFile || null);


    useEffect(() => {
        setParams(currentParams || {});
        setFileInfo(currentParams?.audioFile || null);
        setErrors({});
    }, [currentParams, isOpen]);

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validExtensions = ['.wav', '.wave'];
        const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

        if (!validExtensions.includes(fileExt)) {
            setErrors({file: 'Только WAV файлы'});
            return;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            setErrors({file: 'Файл слишком большой (макс. 10MB)'});
            return;
        }

        // Используем FileReader для простоты
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            await audioContext.close();

            const info = {
                fileName: file.name,
                sampleRate: audioBuffer.sampleRate,
                duration: audioBuffer.duration,
                channels: audioBuffer.numberOfChannels,
                samples: new Float32Array(audioBuffer.getChannelData(0)),
                fileSize: file.size
            };

            setFileInfo(info);
            setErrors(prev => ({...prev, file: null}));

            // Обновляем параметры
            setParams(prev => ({
                ...prev,
                audioFile: info, // Это критически важно!
                fileName: info.fileName,
                loop: prev.loop || false // Значение по умолчанию
            }));
        } catch (err) {
            console.error('Ошибка загрузки файла:', err);
            setErrors({file: 'Ошибка загрузки. Убедитесь, что это валидный WAV файл.'});
        }
    };

    const handleClearFile = () => {
        setFileInfo(null);
        setParams(prev => ({
            ...prev,
            audioFile: null,
            fileName: ''
        }));
    };

    const getParamFields = () => {
        const fields = {
            // Генераторы
            'Входной сигнал': [
                {
                    name: 'frequency',
                    label: 'Частота (Гц)',
                    type: 'number',
                    min: 1,
                    max: 20000,
                    step: 10,
                    defaultValue: 1000
                },
                {
                    name: 'amplitude',
                    label: 'Амплитуда',
                    type: 'number',
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    defaultValue: 1.0
                },
                {
                    name: 'signalType',
                    label: 'Тип сигнала',
                    type: 'select',
                    options: [
                        {value: 'sine', label: 'Синус'},
                        {value: 'cosine', label: 'Косинус'}
                    ],
                    defaultValue: 'sine'
                }
            ],
            'Референсный синусный генератор': [
                {
                    name: 'frequency',
                    label: 'Частота (Гц)',
                    type: 'number',
                    min: 1,
                    max: 20000,
                    step: 10,
                    defaultValue: 1000
                },
                {
                    name: 'amplitude',
                    label: 'Амплитуда',
                    type: 'number',
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    defaultValue: 1.0
                },
                {
                    name: 'phase',
                    label: 'Фаза (рад)',
                    type: 'number',
                    min: 0,
                    max: 6.28,
                    step: 0.01,
                    defaultValue: 0
                }
            ],
            'Референсный косинусный генератор': [
                {
                    name: 'frequency',
                    label: 'Частота (Гц)',
                    type: 'number',
                    min: 1,
                    max: 20000,
                    step: 10,
                    defaultValue: 1000
                },
                {
                    name: 'amplitude',
                    label: 'Амплитуда',
                    type: 'number',
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    defaultValue: 1.0
                },
                {
                    name: 'phase',
                    label: 'Фаза (рад)',
                    type: 'number',
                    min: 0,
                    max: 6.28,
                    step: 0.01,
                    defaultValue: 0
                }
            ],
            // Фильтры
            'КИХ-Фильтр': [
                {
                    name: 'order',
                    label: 'Порядок фильтра',
                    type: 'number',
                    min: 1,
                    max: 1024,
                    step: 1,
                    defaultValue: 64
                },
                {
                    name: 'cutoff',
                    label: 'Частота среза (Гц)',
                    type: 'number',
                    min: 1,
                    max: 24000,
                    step: 10,
                    defaultValue: 1000
                },
                {
                    name: 'filterType',
                    label: 'Тип фильтра',
                    type: 'select',
                    options: [
                        {value: 'lowpass', label: 'ФНЧ'},
                        {value: 'highpass', label: 'ФВЧ'}
                    ],
                    defaultValue: 'lowpass'
                }
            ],
            'Полосовой КИХ-фильтр': [
                {
                    name: 'order',
                    label: 'Порядок фильтра',
                    type: 'number',
                    min: 1,
                    max: 1024,
                    step: 1,
                    defaultValue: 64
                },
                {
                    name: 'lowCutoff',
                    label: 'Нижняя частота среза (Гц)',
                    type: 'number',
                    min: 1,
                    max: 24000,
                    step: 10,
                    defaultValue: 1000
                },
                {
                    name: 'highCutoff',
                    label: 'Верхняя частота среза (Гц)',
                    type: 'number',
                    min: 1,
                    max: 24000,
                    step: 10,
                    defaultValue: 3000
                }
            ],
            'ФВЧ КИХ-фильтр': [
                {
                    name: 'order',
                    label: 'Порядок фильтра',
                    type: 'number',
                    min: 1,
                    max: 1024,
                    step: 1,
                    defaultValue: 64
                },
                {
                    name: 'cutoff',
                    label: 'Частота среза (Гц)',
                    type: 'number',
                    min: 1,
                    max: 24000,
                    step: 10,
                    defaultValue: 1000
                }
            ],
            'ФНЧ КИХ-фильтр': [
                {
                    name: 'order',
                    label: 'Порядок фильтра',
                    type: 'number',
                    min: 1,
                    max: 1024,
                    step: 1,
                    defaultValue: 64
                },
                {
                    name: 'cutoff',
                    label: 'Частота среза (Гц)',
                    type: 'number',
                    min: 1,
                    max: 24000,
                    step: 10,
                    defaultValue: 1000
                }
            ],
            'Преобразователь Гильберта': [
                {
                    name: 'order',
                    label: 'Порядок преобразователя',
                    type: 'number',
                    min: 1,
                    max: 1024,
                    step: 1,
                    defaultValue: 64
                }
            ],
            // Аудио файл
            'Аудио-файл': [
                {
                    name: 'loop',
                    label: 'Зациклить воспроизведение',
                    type: 'checkbox',
                    defaultValue: false
                }
            ]
        };

        return fields[blockType] || [];
    };

    const handleParamChange = (paramName, value) => {
        setParams(prev => ({
            ...prev,
            [paramName]: value
        }));

        // Валидация
        const validation = ValidationService.validateBlockParams(blockType, {
            ...params,
            [paramName]: value
        });

        if (!validation.isValid) {
            const paramErrors = {};
            validation.errors.forEach(error => {
                // Пытаемся извлечь имя параметра из сообщения об ошибке
                if (error.includes('частота') || error.includes('Частота')) {
                    paramErrors.frequency = error;
                } else if (error.includes('порядок') || error.includes('Порядок')) {
                    paramErrors.order = error;
                } else if (error.includes('амплитуда') || error.includes('Амплитуда')) {
                    paramErrors.amplitude = error;
                } else {
                    paramErrors.general = paramErrors.general ?
                        [...paramErrors.general, error] : [error];
                }
            });
            setErrors(paramErrors);
        } else {
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[paramName];
                return newErrors;
            });
        }
    };

    const handleSave = () => {
        console.log('💾 Сохранение параметров:', {blockType, params, fileInfo});

        // Для аудиофайла проверяем, что файл выбран
        if (blockType === 'Аудио-файл') {
            if (!fileInfo) {
                setErrors({file: 'Необходимо выбрать WAV файл'});
                return;
            }

            // Готовим параметры для сохранения
            const saveParams = {
                ...params,
                audioFile: fileInfo,
                fileName: fileInfo.fileName
            };

            console.log('📁 Параметры для сохранения:', saveParams);
            onSave(saveParams);
            return;
        }

        // Для остальных блоков стандартная валидация
        const validation = ValidationService.validateBlockParams(blockType, params);

        if (validation.isValid) {
            onSave(params);
        } else {
            setErrors({general: validation.errors});
        }
    };

    if (!isOpen) return null;

    const paramFields = getParamFields();
    const isAudioFile = blockType === 'Аудио-файл';
    const hasErrors = Object.values(errors).filter(e => e != null).length > 0;
    const hasAudioFile = isAudioFile && params.audioFile;


    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' Б';
        else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
        else return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    };

    console.log('🔍 BlockParamsModal состояние:', {
        isOpen,
        blockType,
        fileInfo,
        params,
        errors,
        hasErrors: Object.keys(errors).length > 0,
        isAudioFile: blockType === 'Аудио-файл',
        disabledCondition: hasErrors || (blockType === 'Аудио-файл' && !fileInfo)
    });


    return (
        <div className={`modal-overlay ${isDarkTheme ? 'dark-theme' : ''}`}>
            <div className={`block-params-modal ${isAudioFile ? 'wide' : ''}`}>
                <div className="modal-header">
                    <h3>Настройки: {blockType}</h3>
                    <button
                        className="close-btn"
                        onClick={onClose}
                        title="Закрыть"
                    >
                        <Icon name="close" size="small"/>
                    </button>
                </div>

                <div className="modal-content">
                    {isAudioFile && (
                        <div className="file-upload-section">
                            <h4>Аудио-файл</h4>

                            {!fileInfo ? (
                                <div className="file-upload-area">
                                    <div className="file-upload-placeholder">
                                        <Icon name="audio_file" size="large"/>
                                        <span className="upload-hint">Выберите WAV файл</span>
                                        <span className="upload-subhint">Максимальный размер: 10MB</span>
                                    </div>
                                    <div className="file-upload-controls">
                                        <input
                                            type="file"
                                            id="audio-file-input"
                                            accept=".wav,.wave,audio/wav,audio/wave"
                                            onChange={handleFileSelect}
                                            style={{display: 'none'}}
                                        />
                                        <label htmlFor="audio-file-input" className="file-upload-btn">
                                            <Icon name="upload" size="small"/>
                                            <span>Выбрать файл</span>
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="file-preview">
                                    <div className="file-info-header">
                                        <Icon name="audio_file" size="medium"/>
                                        <div className="file-info-main">
                                            <div className="file-name" title={fileInfo.fileName}>
                                                {fileInfo.fileName}
                                            </div>
                                            <div className="file-details">
                                                <span className="file-detail">{formatDuration(fileInfo.duration)}</span>
                                                <span className="file-detail">{fileInfo.channels} канал</span>
                                                <span
                                                    className="file-detail">{Math.round(fileInfo.sampleRate / 1000)} кГц</span>
                                                <span className="file-detail">{formatFileSize(fileInfo.fileSize)}</span>
                                            </div>
                                        </div>
                                        <button
                                            className="clear-file-btn"
                                            onClick={handleClearFile}
                                            title="Удалить файл"
                                        >
                                            <Icon name="close" size="xsmall"/>
                                        </button>
                                    </div>
                                    <div className="file-upload-controls">
                                        <input
                                            type="file"
                                            id="audio-file-input"
                                            accept=".wav,.wave,audio/wav,audio/wave"
                                            onChange={handleFileSelect}
                                            style={{display: 'none'}}
                                        />
                                        <label htmlFor="audio-file-input" className="file-change-btn">
                                            <Icon name="swap_horiz" size="small"/>
                                            <span>Заменить файл</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {errors.file && (
                                <div className="file-error">
                                    <Icon name="error" size="small"/>
                                    <span>{errors.file}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {paramFields.length > 0 && (
                        <div className="params-section">
                            <h4>{isAudioFile ? 'Параметры воспроизведения' : 'Параметры'}</h4>
                            {paramFields.map(field => (
                                <div key={field.name} className="param-field">
                                    <label className="param-label">
                                        {field.label}
                                        {errors[field.name] && (
                                            <span className="error-text"> ({errors[field.name]})</span>
                                        )}
                                    </label>

                                    {field.type === 'select' ? (
                                        <select
                                            value={params[field.name] !== undefined ? params[field.name] : (field.defaultValue || '')}
                                            onChange={(e) => handleParamChange(field.name, e.target.value)}
                                            className="param-input"
                                        >
                                            {field.options.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    ) : field.type === 'checkbox' ? (
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={params[field.name] || field.defaultValue || false}
                                                onChange={(e) => handleParamChange(field.name, e.target.checked)}
                                                className="checkbox-input"
                                            />
                                            <span className="checkbox-custom"></span>
                                        </label>
                                    ) : (
                                        <input
                                            type={field.type}
                                            value={params[field.name] !== undefined ? params[field.name] : (field.defaultValue || '')}
                                            onChange={(e) => {
                                                const value = field.type === 'number'
                                                    ? parseFloat(e.target.value) || 0
                                                    : e.target.value;
                                                handleParamChange(field.name, value);
                                            }}
                                            min={field.min}
                                            max={field.max}
                                            step={field.step}
                                            className="param-input"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {errors.general && (
                        <div className="general-errors">
                            {Array.isArray(errors.general) ? errors.general.map((error, idx) => (
                                <div key={idx} className="general-error">
                                    <Icon name="error" size="xsmall"/>
                                    <span>{error}</span>
                                </div>
                            )) : (
                                <div className="general-error">
                                    <Icon name="error" size="xsmall"/>
                                    <span>{errors.general}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="cancel-btn"
                        onClick={onClose}
                    >
                        Отмена
                    </button>


                    <button
                        className="save-btn"
                        onClick={handleSave}
                        disabled={hasErrors || (isAudioFile && !hasAudioFile)}
                        title={isAudioFile && !hasAudioFile ? "Выберите аудиофайл" : ""}
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}

BlockParamsModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    blockType: PropTypes.string.isRequired,
    currentParams: PropTypes.object,
    isDarkTheme: PropTypes.bool.isRequired
};

export default BlockParamsModal;