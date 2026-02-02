import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';

function RealSignalEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
    });

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                style={{
                    stroke: '#3b82f6',
                    strokeWidth: 2,
                    strokeDasharray: '5',
                }}
            />
        </>
    );
}

export default RealSignalEdge;