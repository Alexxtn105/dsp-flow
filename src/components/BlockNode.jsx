import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function BlockNode({ data }) {
    const hasInput = data.blockType !== 'Входной сигнал';
    const hasOutput = data.blockType !== 'Осциллограф';

    const renderParams = () => {
        const params = data.params || {};
        
        switch (data.blockType) {
            case 'КИХ-Фильтр':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Порядок:</span>
                            <span className="block-param-value">{params.order}</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Частота среза:</span>
                            <span className="block-param-value">{params.cutoff} Гц</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Тип:</span>
                            <span className="block-param-value">{params.filterType}</span>
                        </div>
                    </>
                );
            case 'Входной сигнал':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Частота:</span>
                            <span className="block-param-value">{params.frequency} Гц</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Амплитуда:</span>
                            <span className="block-param-value">{params.amplitude}</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Тип:</span>
                            <span className="block-param-value">{params.signalType}</span>
                        </div>
                    </>
                );
            case 'Осциллограф':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Временное окно:</span>
                            <span className="block-param-value">{params.timeWindow} мс</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Частота дискр.:</span>
                            <span className="block-param-value">{params.samplingRate} Гц</span>
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="block-node">
            {hasInput && (
                <Handle
                    type="target"
                    position={Position.Left}
                    id="input"
                    style={{ background: '#4F46E5' }}
                />
            )}
            
            <div className="block-header">
                {data.label}
            </div>
            
            <div className="block-params">
                {renderParams()}
            </div>

            {hasOutput && (
                <Handle
                    type="source"
                    position={Position.Right}
                    id="output"
                    style={{ background: '#4F46E5' }}
                />
            )}
        </div>
    );
}

export default memo(BlockNode);
