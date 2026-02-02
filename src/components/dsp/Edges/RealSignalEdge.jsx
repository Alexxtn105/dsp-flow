import { BaseEdge, getBezierPath } from '@xyflow/react';

function RealSignalEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition: 'right',
        targetX,
        targetY,
        targetPosition: 'left',
    });

    return (
        <BaseEdge
            id={id}
            path={edgePath}
            style={{
                stroke: '#3b82f6',
                strokeWidth: 2,
                strokeDasharray: '5,5',
                fill: 'none',
            }}
        />
    );
}

export default RealSignalEdge;