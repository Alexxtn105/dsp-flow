import { BaseEdge, getBezierPath } from '@xyflow/react';

function ComplexSignalEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition: 'right',
        targetX,
        targetY,
        targetPosition: 'left',
    });

    return (
        <>
            {/* Две пунктирные линии для эффекта двойной линии */}
            <BaseEdge
                id={`${id}-1`}
                path={edgePath}
                style={{
                    stroke: '#8b5cf6',
                    strokeWidth: 4,
                    strokeDasharray: '5,5',
                    opacity: 0.5,
                    fill: 'none',
                    animation: data?.isRunning ? 'dashdraw 0.5s linear infinite' : 'none'
                }}
            />
            <BaseEdge
                id={`${id}-2`}
                path={edgePath}
                style={{
                    stroke: '#8b5cf6',
                    strokeWidth: 2,
                    strokeDasharray: '5,5',
                    fill: 'none',
                    animation: data?.isRunning ? 'dashdraw 0.5s linear infinite' : 'none'
                }}
            />
        </>
    );
}

export default ComplexSignalEdge;