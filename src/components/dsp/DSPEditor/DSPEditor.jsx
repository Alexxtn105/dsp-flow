import { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Toolbar from "../../layout/Toolbar/Toolbar.jsx";
import BlockNode from '../BlockNode';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { generateNodeId, getDefaultParams } from '../../../utils/helpers';
import { useDSPEditor } from '../../../contexts/DSPEditorContext';
import './DSPEditor.css';

const nodeTypes = {
    block: BlockNode,
};

function DSPEditor({
                       isDarkTheme,
                       currentScheme,
                       onSchemeUpdate,
                       onStatsUpdate,
                       onReactFlowInit
                   }) {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const hasLoadedExternalScheme = useRef(false);

    // Получаем контекст
    const { loadedSchemeData, setLoadedSchemeData } = useDSPEditor();

    // Автосохранение с исправленным race condition
    const { loadAutoSave, clearAutoSave } = useAutoSave(
        nodes,
        edges,
        reactFlowInstance,
        {
            enabled: true,
            skipWhen: () => hasLoadedExternalScheme.current
        }
    );

    // Загрузка автосохранённой схемы при старте
    useEffect(() => {
        if (!hasLoadedExternalScheme.current) {
            const autoSaved = loadAutoSave();
            if (autoSaved) {
                setNodes(autoSaved.nodes || []);
                setEdges(autoSaved.edges || []);
                hasLoadedExternalScheme.current = true;
            }
        }
    }, [loadAutoSave, setNodes, setEdges]);

    // Обработка загруженной схемы из контекста
    useEffect(() => {
        if (loadedSchemeData && loadedSchemeData.nodes) {
            // Очищаем автосохранение
            clearAutoSave();

            // Сбрасываем текущие узлы и соединения
            setNodes(loadedSchemeData.nodes || []);
            setEdges(loadedSchemeData.edges || []);

            // Устанавливаем флаг загрузки внешней схемы
            hasLoadedExternalScheme.current = true;

            // Очищаем данные загрузки в контексте
            setLoadedSchemeData(null);

            console.log('Схема загружена из контекста:', {
                nodes: loadedSchemeData.nodes?.length || 0,
                edges: loadedSchemeData.edges?.length || 0
            });
        }
    }, [loadedSchemeData, setNodes, setEdges, clearAutoSave, setLoadedSchemeData]);

    // Обновление статистики
    useEffect(() => {
        if (onStatsUpdate) {
            onStatsUpdate({
                nodesCount: nodes.length,
                connectionsCount: edges.length
            });
        }
    }, [nodes, edges, onStatsUpdate]);

    // Передаём ReactFlow instance наверх
    const handleInit = useCallback((instance) => {
        setReactFlowInstance(instance);
        if (onReactFlowInit) {
            onReactFlowInit(instance);
        }
    }, [onReactFlowInit]);

    const onConnect = useCallback(
        (params) => {
            setEdges((eds) => addEdge({ ...params, animated: true }, eds));
            // Помечаем схему как несохранённую при изменении
            if (currentScheme.isSaved && currentScheme.name !== 'not_saved') {
                onSchemeUpdate(currentScheme.name, false);
            }
        },
        [setEdges, currentScheme, onSchemeUpdate]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const blockType = event.dataTransfer.getData('application/reactflow');
            if (!blockType) return;

            const position = reactFlowInstance?.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            if (!position) return;

            const newNode = {
                id: generateNodeId(),
                type: 'block',
                position,
                data: {
                    label: blockType,
                    blockType,
                    params: getDefaultParams(blockType)
                },
            };

            setNodes((nds) => nds.concat(newNode));

            // Помечаем схему как несохранённую при добавлении узла
            if (currentScheme.isSaved && currentScheme.name !== 'not_saved') {
                onSchemeUpdate(currentScheme.name, false);
            }
        },
        [reactFlowInstance, setNodes, currentScheme, onSchemeUpdate]
    );

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
                    onInit={handleInit}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background color={isDarkTheme ? '#374151' : '#e5e7eb'} />
                    <Controls />
                    <MiniMap />
                </ReactFlow>
            </div>
        </div>
    );
}

DSPEditor.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    currentScheme: PropTypes.object.isRequired,
    onSchemeUpdate: PropTypes.func.isRequired,
    onStatsUpdate: PropTypes.func.isRequired,
    onReactFlowInit: PropTypes.func
};

export default DSPEditor;