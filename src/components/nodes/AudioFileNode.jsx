import { memo } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position } from '@xyflow/react';
import Icon from '../common/Icons/Icon.jsx';
import {
    getBlockSignalConfig,
    getSignalTypeClass,
    getSignalTypeDescription,
} from '../../utils/helpers';
import './AudioFileNode.css';

function AudioFileNode({ data, selected, id }) {
    const signalConfig = getBlockSignalConfig(data.blockType);
    const hasAudioFile = !!data.audioFile;

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        if (data.onNodeDoubleClick) {
            data.onNodeDoubleClick(id, data.blockType, {
                ...data.params,
                audioFile: data.audioFile // Передаем текущий файл в модальное окно
            });
        }
    };

    return (
        <div
            className={`audio-file-node ${selected ? 'selected' : ''}`}
            onDoubleClick={handleDoubleClick}
        >
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                className={`block-handle ${getSignalTypeClass(signalConfig.output)}`}
                data-signal-type={signalConfig.output}
                title={`Выход: ${getSignalTypeDescription(signalConfig.output)} сигнал`}
            />

            <div className="audio-file-node-header">
                <div className="node-icon-title">
                    <span className="node-icon">
                        <Icon name="audio_file" size="medium"/>
                    </span>
                    <div className="node-title">
                        <div className="node-name">{data.label}</div>
                        <div className="node-type">Аудио файл</div>
                    </div>
                </div>
            </div>

            <div className="audio-file-content">
                <div className="file-status">
                    <Icon
                        name={hasAudioFile ? "check_circle" : "warning"}
                        size="small"
                        className={hasAudioFile ? "file-status-icon loaded" : "file-status-icon empty"}
                    />
                    <span className="file-status-text">
                        {hasAudioFile ? 'Файл загружен' : 'Нет файла'}
                    </span>
                </div>
                {hasAudioFile && (
                    <div className="file-details-compact">
                        <div className="file-name-compact" title={data.audioFile.fileName}>
                            {data.audioFile.fileName}
                        </div>
                        <div className="file-info-compact">
                            <span>{Math.round(data.audioFile.duration * 1000)}ms</span>
                            <span>·</span>
                            <span>{Math.round(data.audioFile.sampleRate / 1000)}kHz</span>
                            <span>·</span>
                            <span>{data.audioFile.channels}ch</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="node-hint">
                <span className="hint-text">Двойной клик для настройки</span>
            </div>
        </div>
    );
}

AudioFileNode.propTypes = {
    data: PropTypes.shape({
        label: PropTypes.string.isRequired,
        blockType: PropTypes.string.isRequired,
        audioFile: PropTypes.object,
        params: PropTypes.object,
        onNodeDoubleClick: PropTypes.func
    }).isRequired,
    selected: PropTypes.bool.isRequired,
    id: PropTypes.string.isRequired
};

export default memo(AudioFileNode);