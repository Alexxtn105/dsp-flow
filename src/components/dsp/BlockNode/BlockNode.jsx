import { memo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Handle, Position } from '@xyflow/react';
import Icon from '../../common/Icons/Icon.jsx';
import registry from '../../../engine/PluginRegistry';
import { HIDDEN_PARAMS } from '../../../utils/constants';

import {
    getBlockIcon,
    getBlockDescription,
    formatParamName,
    formatParamValue,
    getBlockSignalConfig,
    getSignalTypeClass,
    getSignalTypeDescription,
    isGeneratorBlock,
    isVisualizationBlock,
} from '../../../utils/helpers';
import './BlockNode.css';

const MAX_VISIBLE_PARAMS = 3;

/**
 * Определяет тип inline-редактора для параметра
 */
function getParamType(key, value) {
    const options = registry.getParamOptions(key);
    if (options) return { type: 'select', options };
    if (typeof value === 'boolean') return { type: 'boolean' };
    if (typeof value === 'number') return { type: 'number' };
    return { type: 'text' };
}

function BlockNode({ data, selected }) {
    const { t } = useTranslation(['params', 'blocks']);
    const signalConfig = getBlockSignalConfig(data.blockType);
    const hasInput = !isGeneratorBlock(data.blockType);
    const hasOutput = !isVisualizationBlock(data.blockType);
    const inputsCount = data.params?.numInputs || signalConfig.inputsCount || 1;
    const iconName = getBlockIcon(data.blockType);
    const description = getBlockDescription(data.blockType);
    const canVisualize = isVisualizationBlock(data.blockType);
    const isAudioFile = data.blockType === 'audio-file';
    const displayName = t(data.blockType, { ns: 'blocks' });
    const tp = (key, opts) => t(key, { ns: 'params', ...opts });

    // Inline editing state
    const [editingParam, setEditingParam] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);

    // Autofocus on editor when editing starts
    useEffect(() => {
        if (editingParam && inputRef.current) {
            inputRef.current.focus();
            if (inputRef.current.select) {
                inputRef.current.select();
            }
        }
    }, [editingParam]);

    // Filter editable params: exclude hidden and array params
    const editableParams = data.params
        ? Object.entries(data.params).filter(
            ([key, value]) => !HIDDEN_PARAMS.includes(key) && !Array.isArray(value)
        )
        : [];

    const visibleParams = editableParams.slice(0, MAX_VISIBLE_PARAMS);
    const hiddenCount = editableParams.length - visibleParams.length;

    const enterEditMode = (e, key, value) => {
        e.stopPropagation();
        setEditingParam(key);
        setEditValue(typeof value === 'boolean' ? String(value) : String(value));
    };

    const commitEdit = (key, rawValue) => {
        if (!data.onParamUpdate) return;
        const currentValue = data.params[key];
        const paramType = getParamType(key, currentValue);
        let parsed;

        if (paramType.type === 'number') {
            parsed = parseFloat(rawValue);
            if (isNaN(parsed)) parsed = currentValue;
        } else if (paramType.type === 'boolean') {
            parsed = rawValue === 'true';
        } else if (paramType.type === 'select') {
            // Preserve original type (number stays number)
            if (typeof currentValue === 'number') {
                parsed = parseFloat(rawValue);
                if (isNaN(parsed)) parsed = rawValue;
            } else {
                parsed = rawValue;
            }
        } else {
            parsed = rawValue;
        }

        data.onParamUpdate(data.nodeId, key, parsed);
        setEditingParam(null);
    };

    const cancelEdit = () => {
        setEditingParam(null);
    };

    const handleKeyDown = (e, key) => {
        // Stop propagation to prevent React Flow from handling keys (Backspace deletes nodes!)
        e.stopPropagation();
        if (e.key === 'Enter') {
            commitEdit(key, editValue);
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    };

    const stopPropagation = (e) => {
        e.stopPropagation();
    };

    const handleOpenParams = (e) => {
        e.stopPropagation();
        if (data.onOpenParams) {
            data.onOpenParams(data.nodeId);
        }
    };

    const handleOpenVisualization = (e) => {
        e.stopPropagation();
        if (data.onOpenVisualization) {
            data.onOpenVisualization(data.nodeId);
        }
    };

    const renderParamValue = (key, value) => {
        if (editingParam === key) {
            const paramType = getParamType(key, value);

            if (paramType.type === 'select') {
                return (
                    <select
                        ref={inputRef}
                        className="inline-edit-select nopan nodrag"
                        value={editValue}
                        onChange={(e) => {
                            e.stopPropagation();
                            commitEdit(key, e.target.value);
                        }}
                        onBlur={() => cancelEdit()}
                        onKeyDown={(e) => handleKeyDown(e, key)}
                        onMouseDown={stopPropagation}
                    >
                        {paramType.options.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.labelKey ? t(opt.labelKey, { ns: 'params' }) : opt.label}
                            </option>
                        ))}
                    </select>
                );
            }

            if (paramType.type === 'boolean') {
                return (
                    <select
                        ref={inputRef}
                        className="inline-edit-select nopan nodrag"
                        value={editValue}
                        onChange={(e) => {
                            e.stopPropagation();
                            commitEdit(key, e.target.value);
                        }}
                        onBlur={() => cancelEdit()}
                        onKeyDown={(e) => handleKeyDown(e, key)}
                        onMouseDown={stopPropagation}
                    >
                        <option value="true">{tp('booleanTrue')}</option>
                        <option value="false">{tp('booleanFalse')}</option>
                    </select>
                );
            }

            return (
                <input
                    ref={inputRef}
                    type={paramType.type}
                    className="inline-edit-input nopan nodrag"
                    value={editValue}
                    onChange={(e) => {
                        e.stopPropagation();
                        setEditValue(e.target.value);
                    }}
                    onBlur={() => commitEdit(key, editValue)}
                    onKeyDown={(e) => handleKeyDown(e, key)}
                    onMouseDown={stopPropagation}
                    step={paramType.type === 'number' ? 'any' : undefined}
                />
            );
        }

        return (
            <span
                className="param-value param-value-editable"
                onDoubleClick={(e) => enterEditMode(e, key, value)}
                title={tp('blockNode.editHint')}
            >
                {formatParamValue(value)}
            </span>
        );
    };

    return (
        <div className={`block-node ${selected ? 'selected' : ''}`}>
            {hasInput && (
                inputsCount > 1 ? (
                    // Multiple inputs
                    Array.from({ length: inputsCount }).map((_, i) => (
                        <Handle
                            key={`input-${i}`}
                            type="target"
                            position={Position.Left}
                            id={`input-${i}`}
                            className={`block-handle ${getSignalTypeClass(signalConfig.input)}`}
                            style={{ top: `${((i + 1) * 100) / (inputsCount + 1)}%` }}
                            data-signal-type={signalConfig.input}
                            title={signalConfig.inputLabels?.[i] ?? tp('blockNode.input', { index: i + 1 })}
                        />
                    ))
                ) : (
                    // Single input (default)
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="input"
                        className={`block-handle ${getSignalTypeClass(signalConfig.input)}`}
                        data-signal-type={signalConfig.input}
                        title={tp('blockNode.inputSignal', { type: getSignalTypeDescription(signalConfig.input) })}
                    />
                )
            )}

            {/* Кнопки управления блоком */}
            <div className="block-actions">
                <button
                    className="block-action-btn params-btn"
                    onClick={handleOpenParams}
                    title={tp('blockNode.blockSettings')}
                >
                    <Icon name="tune" size="small" />
                </button>
                {canVisualize && (
                    <button
                        className="block-action-btn visualization-btn"
                        onClick={handleOpenVisualization}
                        title={tp('blockNode.openVisualization')}
                    >
                        <Icon name="visibility" size="small" />
                    </button>
                )}
            </div>

            <div className="block-header">
                <div className="block-icon-title">
                    <span
                        className="block-icon"
                        title={`${description}\n${tp('blockNode.inputSignal', { type: getSignalTypeDescription(signalConfig.input) })}\n${tp('blockNode.outputSignal', { type: getSignalTypeDescription(signalConfig.output) })}`}
                    >
                        <Icon name={iconName} size="medium" />
                    </span>
                    <div className="block-title">
                        <div className="block-name">{displayName}</div>
                        <div className="block-type">{description}</div>
                    </div>
                </div>
            </div>

            {isAudioFile ? (
                <div className="audio-file-info">
                    {data.params?.wavFileName ? (
                        <>
                            <div className="audio-file-name" title={data.params.wavFileName}>
                                <Icon name="audio_file" size="small" />
                                <span>{data.params.wavFileName}</span>
                            </div>
                            <div className="audio-file-meta">
                                {data.params.detectedSampleRate && (
                                    <span>{(data.params.detectedSampleRate / 1000).toFixed(1)} kHz</span>
                                )}
                                {data.params.duration != null && (
                                    <span>{data.params.duration.toFixed(1)}s</span>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="audio-file-empty">{tp('blockNode.fileNotSelected')}</div>
                    )}
                </div>
            ) : editableParams.length > 0 ? (
                <div className="block-params">
                    {visibleParams.map(([key, value]) => (
                        <div key={key} className="block-param">
                            <span className="param-label">{formatParamName(key)}:</span>
                            {renderParamValue(key, value)}
                        </div>
                    ))}
                    {hiddenCount > 0 && (
                        <div className="block-param block-param-more" onClick={handleOpenParams}>
                            <span className="param-label">...</span>
                            <span className="param-value param-value-more">
                                {tp('blockNode.more', { count: hiddenCount })}
                            </span>
                        </div>
                    )}
                </div>
            ) : null}

            {hasOutput && (
                (signalConfig.outputsCount > 1) ? (
                    Array.from({ length: signalConfig.outputsCount }).map((_, i) => {
                        const outType = signalConfig.outputTypes?.[i] ?? signalConfig.output;
                        return (
                            <Handle
                                key={`output-${i}`}
                                type="source"
                                position={Position.Right}
                                id={`output-${i}`}
                                className={`block-handle ${getSignalTypeClass(outType)}`}
                                style={{ top: `${((i + 1) * 100) / (signalConfig.outputsCount + 1)}%` }}
                                data-signal-type={outType}
                                title={signalConfig.outputLabels?.[i] ?? tp('blockNode.output', { index: i + 1 })}
                            />
                        );
                    })
                ) : (
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="output"
                        className={`block-handle ${getSignalTypeClass(signalConfig.output)}`}
                        data-signal-type={signalConfig.output}
                        title={tp('blockNode.outputSignal', { type: getSignalTypeDescription(signalConfig.output) })}
                    />
                )
            )}
        </div>
    );
}

BlockNode.propTypes = {
    data: PropTypes.shape({
        label: PropTypes.string.isRequired,
        blockType: PropTypes.string.isRequired,
        params: PropTypes.object,
        nodeId: PropTypes.string,
        onOpenParams: PropTypes.func,
        onOpenVisualization: PropTypes.func,
        onParamUpdate: PropTypes.func
    }).isRequired,
    selected: PropTypes.bool.isRequired
};

export default memo(BlockNode);
