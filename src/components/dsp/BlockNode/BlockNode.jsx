import {memo} from 'react';
import PropTypes from 'prop-types';
import {Handle, Position} from '@xyflow/react';
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

function BlockNode({data, selected}) {
    const signalConfig = getBlockSignalConfig(data.blockType);
    const hasInput = !isGeneratorBlock(data.blockType);
    const hasOutput = !isVisualizationBlock(data.blockType);
    const iconName = getBlockIcon(data.blockType);
    const description = getBlockDescription(data.blockType);


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
                    {/*<div>*/}
                    {/*    /!*БЛОК ТИПОВ СИГНАЛОВ*!/*/}
                    {/*    {signalConfig.input && signalConfig.output && (*/}
                    {/*        <div className="block-signal-types">*/}
                    {/*            <span className={`signal-type-badge ${getSignalTypeClass(signalConfig.input)}`}>*/}
                    {/*                {signalConfig.input === 'complex' ? 'Cplx' : 'Re'}→*/}
                    {/*            </span>*/}
                    {/*            <span className={`signal-type-badge ${getSignalTypeClass(signalConfig.output)}`}>*/}
                    {/*                →{signalConfig.output === 'complex' ? 'Cplx' : 'Re'}*/}
                    {/*            </span>*/}
                    {/*        </div>*/}
                    {/*    )}*/}
                    {/*</div>*/}
                </div>


            </div>

            {data.params && Object.keys(data.params).length > 0 && (
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
        </div>
    );
}

BlockNode.propTypes = {
    data: PropTypes.shape({
        label: PropTypes.string.isRequired,
        blockType: PropTypes.string.isRequired,
        params: PropTypes.object
    }).isRequired,
    selected: PropTypes.bool.isRequired
};

export default memo(BlockNode);