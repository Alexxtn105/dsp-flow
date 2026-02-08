import { memo } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position } from '@xyflow/react';
import Icon from '../../common/Icons/Icon.jsx';

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

function BlockNode({ data, selected }) {
    const signalConfig = getBlockSignalConfig(data.blockType);
    const hasInput = !isGeneratorBlock(data.blockType);
    const hasOutput = !isVisualizationBlock(data.blockType);
    const iconName = getBlockIcon(data.blockType);
    const description = getBlockDescription(data.blockType);
    const canVisualize = isVisualizationBlock(data.blockType);
    const isAudioFile = data.blockType === 'Audio File';
    const isMuted = data.params?.muted || false;

    const handleToggleMute = (e) => {
        e.stopPropagation();
        if (data.onParamUpdate) {
            data.onParamUpdate(data.nodeId, 'muted', !isMuted);
        }
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

    return (
        <div className={`block-node ${selected ? 'selected' : ''}`}>
            {hasInput && (
                <Handle
                    type="target"
                    position={Position.Left}
                    id="input"
                    className={`block-handle ${getSignalTypeClass(signalConfig.input)}`}
                    data-signal-type={signalConfig.input}
                    title={`Вход: ${getSignalTypeDescription(signalConfig.input)} сигнал`}
                />
            )}

            {/* Кнопки управления блоком */}
            <div className="block-actions">
                <button
                    className="block-action-btn params-btn"
                    onClick={handleOpenParams}
                    title="Настройки блока"
                >
                    <Icon name="tune" size="small" />
                </button>
                {canVisualize && (
                    <button
                        className="block-action-btn visualization-btn"
                        onClick={handleOpenVisualization}
                        title="Открыть визуализацию"
                    >
                        <Icon name="visibility" size="small" />
                    </button>
                )}
                {isAudioFile && (
                    <button
                        className="block-action-btn mute-btn"
                        onClick={handleToggleMute}
                        title={isMuted ? "Включить звук" : "Выключить звук"}
                    >
                        <Icon name={isMuted ? "volume_off" : "volume_up"} size="small" />
                    </button>
                )}
            </div>

            <div className="block-header">
                <div className="block-icon-title">
                    <span
                        className="block-icon"
                        title={`${description}\nВход: ${getSignalTypeDescription(signalConfig.input)}\nВыход: ${getSignalTypeDescription(signalConfig.output)}`}
                    >
                        <Icon name={iconName} size="medium" />
                    </span>
                    <div className="block-title">
                        <div className="block-name">{data.label}</div>
                        <div className="block-type">{description}</div>
                    </div>
                </div>
            </div>

            {
                data.params && Object.keys(data.params).length > 0 && (
                    <div className="block-params">
                        {Object.entries(data.params).slice(0, 3).map(([key, value]) => (
                            <div key={key} className="block-param">
                                <span className="param-label">{formatParamName(key)}:</span>
                                <span className="param-value">{formatParamValue(value)}</span>
                            </div>
                        ))}
                        {Object.keys(data.params).length > 3 && (
                            <div className="block-param">
                                <span className="param-label">...</span>
                                <span className="param-value">
                                    еще {Object.keys(data.params).length - 3}
                                </span>
                            </div>
                        )}
                    </div>
                )
            }

            {
                hasOutput && (
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="output"
                        className={`block-handle ${getSignalTypeClass(signalConfig.output)}`}
                        data-signal-type={signalConfig.output}
                        title={`Выход: ${getSignalTypeDescription(signalConfig.output)} сигнал`}
                    />
                )
            }
        </div >
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