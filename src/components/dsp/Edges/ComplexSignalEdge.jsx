import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';

function ComplexSignalEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
    });

    return (
        <>
            {/* Две линии для эффекта двойной линии */}
            <BaseEdge
                id={`${id}-1`}
                path={edgePath}
                style={{
                    stroke: '#8b5cf6',
                    strokeWidth: 4,
                    strokeDasharray: '5',
                    opacity: 0.3
                }}
            />
            <BaseEdge
                id={`${id}-2`}
                path={edgePath}
                style={{
                    stroke: '#8b5cf6',
                    strokeWidth: 2,
                    strokeDasharray: '5',
                }}
            />
        </>
    );
}

export default ComplexSignalEdge;