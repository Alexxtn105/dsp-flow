import { useState, useCallback, useRef, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Toolbar from './components/Toolbar';
import BlockNode from './components/BlockNode';
import SavePanel from './components/SavePanel';
import './DSPEditor.css';

const nodeTypes = {
    block: BlockNode,
};

let nodeId = 0;
const getNodeId = () => `node_${nodeId++}`;

function DSPEditor({ isDarkTheme }) {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [savedSchemes, setSavedSchemes] = useState([]);

    // Загружаем схемы при монтировании
    useEffect(() => {
        updateSavedSchemes();
    }, []);

    // Функция для обновления списка сохраненных схем
    const updateSavedSchemes = useCallback(() => {
        try {
            const schemes = JSON.parse(localStorage.getItem('dsp-schemes') || '[]');
            setSavedSchemes(schemes);
        } catch {
            setSavedSchemes([]);
        }
    }, []);

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode = {
                id: getNodeId(),
                type: 'block',
                position,
                data: {
                    label: type,
                    blockType: type,
                    params: getDefaultParams(type)
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const getDefaultParams = (blockType) => {
        switch (blockType) {
            case 'КИХ-Фильтр':
                return {
                    order: 64,
                    cutoff: 1000,
                    filterType: 'lowpass',
                };
            case 'Входной сигнал':
                return {
                    frequency: 1000,
                    amplitude: 1.0,
                    signalType: 'sine',
                };
            case 'Осциллограф':
                return {
                    timeWindow: 10,
                    samplingRate: 48000,
                };
            default:
                return {};
        }
    };

    const onSave = useCallback(async (schemeData) => {
        if (!reactFlowInstance) return;

        const flow = reactFlowInstance.toObject();
        const fullSchemeData = {
            ...schemeData,
            nodes: flow.nodes,
            edges: flow.edges,
            viewport: flow.viewport,
            timestamp: new Date().toISOString(),
        };

        try {
            const savedSchemes = JSON.parse(localStorage.getItem('dsp-schemes') || '[]');
            const existingIndex = savedSchemes.findIndex(s => s.name === schemeData.name);

            if (existingIndex >= 0) {
                savedSchemes[existingIndex] = fullSchemeData;
            } else {
                savedSchemes.push(fullSchemeData);
            }

            localStorage.setItem('dsp-schemes', JSON.stringify(savedSchemes));

            // Обновляем список схем после сохранения
            updateSavedSchemes();

            alert(`Схема "${schemeData.name}" успешно сохранена!`);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения схемы:', error);
            alert('Ошибка при сохранении схемы');
            return false;
        }
    }, [reactFlowInstance, updateSavedSchemes]);

    const onLoad = useCallback((schemeName) => {
        try {
            const savedSchemes = JSON.parse(localStorage.getItem('dsp-schemes') || '[]');
            const scheme = savedSchemes.find(s => s.name === schemeName);

            if (scheme) {
                setNodes(scheme.nodes || []);
                setEdges(scheme.edges || []);
                if (scheme.viewport && reactFlowInstance) {
                    reactFlowInstance.setViewport(scheme.viewport);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Ошибка загрузки схемы:', error);
            alert('Ошибка при загрузке схемы');
            return false;
        }
    }, [reactFlowInstance, setNodes, setEdges]);

    const onDelete = useCallback((schemeName) => {
        try {
            const savedSchemes = JSON.parse(localStorage.getItem('dsp-schemes') || '[]');
            const filteredSchemes = savedSchemes.filter(s => s.name !== schemeName);

            localStorage.setItem('dsp-schemes', JSON.stringify(filteredSchemes));
            updateSavedSchemes();

            alert(`Схема "${schemeName}" успешно удалена!`);
            return true;
        } catch (error) {
            console.error('Ошибка удаления схемы:', error);
            alert('Ошибка при удалении схемы');
            return false;
        }
    }, [updateSavedSchemes]);

    return (
        <div className={`dsp-editor ${isDarkTheme ? 'dark-theme' : ''}`}>
            <Toolbar isDarkTheme={isDarkTheme} />
            <div className="reactflow-wrapper" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background
                        variant="dots"
                        gap={16}
                        size={1}
                        color={isDarkTheme ? '#374151' : '#e5e7eb'}
                    />
                    <Controls />
                    <MiniMap
                        style={{
                            backgroundColor: isDarkTheme ? '#1f2937' : 'white'
                        }}
                    />
                    <SavePanel
                        onSave={onSave}
                        onLoad={onLoad}
                        onDelete={onDelete}
                        savedSchemes={savedSchemes}
                        isDarkTheme={isDarkTheme}
                        onSchemesUpdate={updateSavedSchemes}
                    />
                </ReactFlow>
            </div>
        </div>
    );
}

export default DSPEditor;