import {memo, useCallback, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {Handle, Position} from '@xyflow/react';
import Icon from '../../common/Icons/Icon.jsx';
import ParamsEditor from '../ParamsEditor';

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

function BlockNode({data, selected, id}) {
    const [showParamsEditor, setShowParamsEditor] = useState(false);
    const signalConfig = getBlockSignalConfig(data.blockType);
    const hasInput = !isGeneratorBlock(data.blockType);
    const hasOutput = !isVisualizationBlock(data.blockType);
    const iconName = getBlockIcon(data.blockType);
    const description = getBlockDescription(data.blockType);
    const isVisualization = isVisualizationBlock(data.blockType);

    const [nodeSize, setNodeSize] = useState({ width: 180, height: 'auto' });
    const nodeRef = useRef(null);

    // Обработчик начала изменения размера
    const handleResizeStart = useCallback((e) => {
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = nodeRef.current?.offsetWidth || 180;
        const startHeight = nodeRef.current?.offsetHeight || 120;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            const newWidth = Math.max(180, Math.min(400, startWidth + deltaX));
            const newHeight = Math.max(120, Math.min(300, startHeight + deltaY));

            setNodeSize({
                width: newWidth,
                height: newHeight
            });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);

    // Обработчик скрытия/показа редактирования параметров
    const handleParamsSave = (newParams) => {
        if (data.onParamsUpdate) {
            data.onParamsUpdate(newParams);
        }
        setShowParamsEditor(false);
    };

    const handleEditClick = (e) => {
        e.stopPropagation();
        setShowParamsEditor(true);
    };


    // Обработчик показа/скрытия окна визуализации
    const handleToggleVisualization = (e) => {
        e.stopPropagation();
        if (data.onToggleVisualization) {
            data.onToggleVisualization(id);
        }
    };


    return (
        <>
            {/*<div*/}
            {/*    ref={nodeRef}*/}
            {/*    className={`block-node ${selected ? 'selected' : ''}`}*/}
            {/*    style={{*/}
            {/*        width: `${nodeSize.width}px`,*/}
            {/*        height: typeof nodeSize.height === 'number' ? `${nodeSize.height}px` : nodeSize.height*/}
            {/*    }}*/}
            {/*>*/}
            <div
                ref={nodeRef}
                className={`block-node ${selected ? 'selected' : ''}`}
                style={{
                    width: `${nodeSize.width}px`,
                    height: typeof nodeSize.height === 'number' ? `${nodeSize.height}px` : nodeSize.height
                }}
            >
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

                <div className="block-header">
                    <div className="block-icon-title">
                 <span className="block-icon"
                       title={`${description}\nВход: ${getSignalTypeDescription(signalConfig.input)}\nВыход: ${getSignalTypeDescription(signalConfig.output)}`}>
                        <Icon name={iconName} size="medium"/>
                 </span>
                        <div className="block-title">
                            <div className="block-name">{data.label}</div>
                            <div className="block-type">{description} </div>
                        </div>
                    </div>

                    {/* Кнопка настроек */}
                    <button
                        className="block-edit-btn"
                        onClick={handleEditClick}
                        title="Редактировать параметры"
                    >
                        <Icon name="settings" size="small"/>
                    </button>

                    {/* Кнопка показа/скрытия визуализации для блоков визуализации */}
                    {isVisualization && (
                        <button
                            className="visualization-toggle-btn"
                            onClick={handleToggleVisualization}
                            title={data.visualizationVisible ? "Скрыть визуализацию" : "Показать визуализацию"}
                        >
                            <Icon
                                name={data.visualizationVisible ? "visibility" : "visibility_off"}
                                size="small"
                            />
                        </button>
                    )}
                </div>

                {data.params && Object.keys(data.params).length > 0 && (
                    <div className="block-params">
                        {Object.entries(data.params)
                            .filter(([key]) => key !== 'audioFile') // Не показываем audioFile в карточке
                            .slice(0, 3)
                            .map(([key, value]) => (
                                <div key={key} className="block-param">
                                    <span className="param-label">{formatParamName(key)}:</span>
                                    <span className="param-value">{formatParamValue(value)}</span>
                                </div>
                            ))}
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
                        {/* Показываем информацию о загруженном файле */}
                        {data.params.audioFile && (
                            <div className="block-param audio-file-indicator">
                                <span className="param-label">📁</span>
                                <span className="param-value">{data.params.audioFile.name}</span>
                            </div>
                        )}
                    </div>
                )}

                {hasOutput && (
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="output"
                        className={`block-handle ${getSignalTypeClass(signalConfig.output)}`}
                        data-signal-type={signalConfig.output}
                        title={`Выход: ${getSignalTypeDescription(signalConfig.output)} сигнал`}
                    />
                )}

                {/* Добавить маркер изменения размера */}
                <div
                    className="resize-handle"
                    onMouseDown={handleResizeStart}
                    title="Изменить размер"
                />
            </div>

            {/* Диалог редактирования параметров */}
            {showParamsEditor && (
                <div style={{ position: 'fixed', zIndex: 1000 }}>
                    <ParamsEditor
                        isOpen={showParamsEditor}
                        onClose={() => setShowParamsEditor(false)}
                        blockType={data.blockType}
                        currentParams={data.params}
                        onSave={handleParamsSave}
                        isDarkTheme={document.body.classList.contains('dark-theme')}
                    />
                </div>
            )}
        </>
    );
}

BlockNode.propTypes = {
    data: PropTypes.shape({
        label: PropTypes.string.isRequired,
        blockType: PropTypes.string.isRequired,
        params: PropTypes.object,
        visualizationVisible: PropTypes.bool,
        onToggleVisualization: PropTypes.func,
        onParamsUpdate: PropTypes.func
    }).isRequired,
    selected: PropTypes.bool.isRequired,
    id: PropTypes.string.isRequired
};

export default memo(BlockNode);
