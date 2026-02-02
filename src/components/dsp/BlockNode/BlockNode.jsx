import { memo } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position } from '@xyflow/react';
import { isGeneratorBlock, isVisualizationBlock } from '../../../utils/helpers';
import './BlockNode.css';

function BlockNode({ data }) {
    const hasInput = !isGeneratorBlock(data.blockType);
    const hasOutput = !isVisualizationBlock(data.blockType);

    return (
        <div className="block-node">
            {hasInput && (
                <Handle
                    type="target"
                    position={Position.Left}
                    id="input"
                    style={{ background: 'var(--accent-primary)' }}
                />
            )}

            <div className="block-header">
                {data.label}
            </div>

            <div className="block-params">
                {/* Параметры блока */}
                {Object.entries(data.params || {}).slice(0, 2).map(([key, value]) => (
                    <div key={key} className="block-param">
                        <span className="param-label">{key}:</span>
                        <span className="param-value">{String(value)}</span>
                    </div>
                ))}
            </div>

            {hasOutput && (
                <Handle
                    type="source"
                    position={Position.Right}
                    id="output"
                    style={{ background: 'var(--accent-primary)' }}
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
    }).isRequired
};

export default memo(BlockNode);
