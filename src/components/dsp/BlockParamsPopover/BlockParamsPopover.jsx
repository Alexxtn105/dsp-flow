import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { getBlockDescription, formatParamName, getDefaultParams } from '../../../utils/helpers';
import registry from '../../../engine/PluginRegistry';
import { HIDDEN_PARAMS } from '../../../utils/constants';
import FileStorageService from '../../../services/fileStorageService';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './BlockParamsPopover.css';

const POPOVER_WIDTH = 340;
const POPOVER_GAP = 12;
const VIEWPORT_PADDING = 8;

function computePosition(nodeRect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x, y;

    // Try right
    if (nodeRect.right + POPOVER_GAP + POPOVER_WIDTH + VIEWPORT_PADDING <= vw) {
        x = nodeRect.right + POPOVER_GAP;
    }
    // Try left
    else if (nodeRect.left - POPOVER_GAP - POPOVER_WIDTH - VIEWPORT_PADDING >= 0) {
        x = nodeRect.left - POPOVER_GAP - POPOVER_WIDTH;
    }
    // Fallback: align to right edge of viewport
    else {
        x = Math.max(VIEWPORT_PADDING, vw - POPOVER_WIDTH - VIEWPORT_PADDING);
    }

    // Vertical: align top of popover with top of node, clamped to viewport
    y = Math.max(VIEWPORT_PADDING, Math.min(nodeRect.top, vh - 400 - VIEWPORT_PADDING));

    return { x, y };
}

/**
 * Поповер редактирования параметров блока
 */
function BlockParamsPopover({ onClose, node, onSave, onSampleRateChange }) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation('params');

    const [localParams, setLocalParams] = useState({});
    const [wavFileName, setWavFileName] = useState('');
    const [error, setError] = useState(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const audioContextRef = useRef(null);
    const mountedRef = useRef(true);
    const popoverRef = useRef(null);

    // Вычислить позицию на основе DOM-элемента блока
    const updatePosition = useCallback(() => {
        const el = document.querySelector(`[data-id="${node.id}"]`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setPosition(computePosition(rect));
    }, [node.id]);

    // Инициализация параметров при открытии
    const nodeId = node?.id;
    useEffect(() => {
        if (!node?.data) return;
        const blockType = node.data.blockType;
        const defaultParams = getDefaultParams(blockType);
        const currentParams = node.data.params || {};
        setLocalParams({ ...defaultParams, ...currentParams });
        if (currentParams.wavFile) {
            setWavFileName(currentParams.wavFile.name || currentParams.wavFileName || 'Файл выбран');
        } else if (currentParams.wavFileName) {
            setWavFileName(currentParams.wavFileName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId]);

    // Позиционирование + репозиционирование при pan/zoom/resize
    useEffect(() => {
        updatePosition();

        const handleResize = () => updatePosition();
        window.addEventListener('resize', handleResize);

        // MutationObserver на viewport для отслеживания pan/zoom
        const viewport = document.querySelector('.react-flow__viewport');
        let observer;
        if (viewport) {
            observer = new MutationObserver(() => updatePosition());
            observer.observe(viewport, { attributes: true, attributeFilter: ['style'] });
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (observer) observer.disconnect();
        };
    }, [updatePosition]);

    // Cleanup AudioContext при размонтировании
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (audioContextRef.current) {
                try { audioContextRef.current.close(); } catch { /* already closed */ }
                audioContextRef.current = null;
            }
        };
    }, []);

    // Click-outside закрытие
    useEffect(() => {
        const handleMouseDown = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [onClose]);

    // Escape закрытие
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const blockType = node?.data?.blockType || 'Неизвестный блок';
    const isInputSignal = blockType === 'audio-file';

    const handleParamChange = (key, value, type = 'text') => {
        let parsedValue = value;

        if (type === 'number') {
            parsedValue = parseFloat(value) || 0;
        } else if (type === 'boolean') {
            parsedValue = value === 'true' || value === true;
        } else if (type === 'select-options') {
            const originalValue = localParams[key];
            if (typeof originalValue === 'number') {
                parsedValue = parseFloat(value);
                if (isNaN(parsedValue)) parsedValue = value;
            }
        } else if (type === 'array') {
            parsedValue = value.split(',').map(s => {
                const num = parseFloat(s.trim());
                return isNaN(num) ? 0 : num;
            });
        }

        setLocalParams(prev => ({
            ...prev,
            [key]: parsedValue
        }));
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const name = file.name.toLowerCase();
        const validExtensions = name.endsWith('.wav') || name.endsWith('.mp3');
        const validMime = file.type === 'audio/wav' || file.type === 'audio/x-wav' ||
                          file.type === 'audio/mpeg' || file.type === 'audio/mp3';
        if (!validExtensions && !validMime) {
            setError('Пожалуйста, выберите WAV или MP3 файл');
            return;
        }

        try {
            if (audioContextRef.current) {
                try { audioContextRef.current.close(); } catch { /* ignore */ }
            }

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
                detectedSampleRate: audioBuffer.sampleRate,
                duration: audioBuffer.duration,
                channels: audioBuffer.numberOfChannels,
                totalSamples: audioBuffer.length
            }));

            if (onSampleRateChange && audioBuffer.sampleRate) {
                onSampleRateChange(audioBuffer.sampleRate);
            }

            audioContext.close();
            audioContextRef.current = null;
        } catch (err) {
            console.error('Ошибка чтения аудиофайла:', err);
            setError('Не удалось прочитать аудиофайл');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Сохраняем аудиофайл в IndexedDB для восстановления при загрузке схемы
        if (localParams.wavFile instanceof File) {
            FileStorageService.saveFile(node.id, localParams.wavFile);
        }

        onSave(node.id, localParams);
        onClose();
    };

    // Изоляция клавиатуры — предотвращаем Backspace/Delete удаление блоков React Flow
    const handlePopoverKeyDown = (e) => {
        e.stopPropagation();
    };

    const getInputType = (key, value) => {
        const paramOptions = registry.getParamOptions(key);
        if (paramOptions) return 'select-options';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'select';
        return 'text';
    };

    const editableParams = Object.entries(localParams).filter(
        ([key]) => !HIDDEN_PARAMS.includes(key)
    );

    return createPortal(
        <div
            ref={popoverRef}
            className={`block-params-popover ${isDarkTheme ? 'dark-theme' : ''}`}
            style={{ left: position.x, top: position.y }}
            onKeyDown={handlePopoverKeyDown}
        >
            <div className="popover-header">
                <span className="popover-title">{getBlockDescription(blockType)}</span>
                <button className="popover-close-btn" onClick={onClose} type="button">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="popover-body">
                {/* WAV-секция для Audio File */}
                {isInputSignal && (
                    <div className="param-section wav-section">
                        <label className="param-section-label">Источник сигнала</label>
                        <div className="wav-file-input">
                            <input
                                type="file"
                                accept=".wav,.mp3"
                                onChange={handleFileSelect}
                                id="wav-file-input-popover"
                                className="hidden-file-input"
                            />
                            <label htmlFor="wav-file-input-popover" className="wav-file-btn">
                                {wavFileName || 'Выбрать аудиофайл'}
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
                                            onChange={(e) => handleParamChange(key, e.target.value, 'select-options')}
                                            className="param-input"
                                        >
                                            {paramOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.labelKey ? t(opt.labelKey) : opt.label}
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
                                    ) : inputType === 'array' ? (
                                        <input
                                            type="text"
                                            value={Array.isArray(value) ? value.join(', ') : value}
                                            onChange={(e) => handleParamChange(key, e.target.value, 'array')}
                                            className="param-input"
                                            placeholder="1.0, 1.0, ..."
                                        />
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

                <div className="popover-actions">
                    <button type="submit" className="popover-btn popover-btn-primary">Применить</button>
                    <button type="button" className="popover-btn popover-btn-secondary" onClick={onClose}>Отмена</button>
                </div>
            </form>
        </div>,
        document.body
    );
}

BlockParamsPopover.propTypes = {
    onClose: PropTypes.func.isRequired,
    node: PropTypes.object.isRequired,
    onSave: PropTypes.func.isRequired,
    onSampleRateChange: PropTypes.func
};

export default BlockParamsPopover;
