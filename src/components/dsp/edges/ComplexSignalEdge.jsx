import { getBezierPath } from '@xyflow/react';

const OFFSET = 2.5;

function ComplexSignalEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition: 'right',
        targetX,
        targetY,
        targetPosition: 'left',
    });

    const isRunning = data?.isRunning;
    const animation = isRunning ? 'dashdraw 0.5s linear infinite' : 'none';

    return (
        <>
            {/* Невидимая широкая область для клика */}
            <path
                className="react-flow__edge-interaction"
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
            />
            {/* Верхняя пунктирная линия */}
            <g transform={`translate(0, -${OFFSET})`}>
                <path
                    id={id}
                    className="react-flow__edge-path"
                    d={edgePath}
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    style={{ stroke: 'var(--signal-complex)', animation }}
                />
            </g>
            {/* Нижняя пунктирная линия */}
            <g transform={`translate(0, ${OFFSET})`}>
                <path
                    className="react-flow__edge-path"
                    d={edgePath}
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    style={{ stroke: 'var(--signal-complex)', animation }}
                />
            </g>
        </>
    );
}

export default ComplexSignalEdge;
