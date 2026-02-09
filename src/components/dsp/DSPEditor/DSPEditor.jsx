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

import Toolbar from '../../layout/Toolbar/Toolbar.jsx';
import BlockNode from '../BlockNode';
import RealSignalEdge from '../edges/RealSignalEdge';
import ComplexSignalEdge from '../edges/ComplexSignalEdge';
import SignalLegend from './SignalLegend';
import BlockParamsDialog from '../../dialogs/BlockParamsDialog';
import { useAutoSave } from '../../../hooks/index.js';
import {
    generateNodeId,
    getDefaultParams,
    getBlockSignalConfig,
    areSignalsCompatible
} from '../../../utils/helpers';
import { useDSPEditor } from '../../../contexts/DSPEditorContext';
import './DSPEditor.css';
import './ReactFlowTheme.css';

const nodeTypes = {
    block: BlockNode,
};

const edgeTypes = {
    real: RealSignalEdge,
    complex: ComplexSignalEdge,
};

function DSPEditor({
    isDarkTheme,
    currentScheme,
    onSchemeUpdate,
    onStatsUpdate,
    onReactFlowInit,
    isRunning,
    onOpenVisualization
}) {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const hasLoadedExternalScheme = useRef(false);

    // Состояние диалога параметров
    const [paramsDialogNode, setParamsDialogNode] = useState(null);

    // Получаем контекст
    const { loadedSchemeData, setLoadedSchemeData } = useDSPEditor();

    // Автосохранение
    const { loadAutoSave, clearAutoSave } = useAutoSave(
        nodes,
        edges,
        reactFlowInstance,
        {
            enabled: true,
            skipWhen: () => hasLoadedExternalScheme.current
        }
    );

    // Обработчик открытия диалога параметров
    // Обработчик открытия диалога параметров
    const handleOpenParams = useCallback((nodeId) => {
        if (!reactFlowInstance) return;
        const node = reactFlowInstance.getNode(nodeId);
        if (node) {
            setParamsDialogNode(node);
        }
    }, [reactFlowInstance]);

    // Обработчик открытия визуализации
    const handleOpenVisualization = useCallback((nodeId) => {
        if (onOpenVisualization) {
            onOpenVisualization(nodeId);
        }
    }, [onOpenVisualization]);

    // Обработчик сохранения параметров
    const handleSaveParams = useCallback((nodeId, newParams) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        params: newParams
                    }
                };
            }
            return node;
        }));

        // Помечаем схему как несохранённую
        if (currentScheme.isSaved && currentScheme.name !== 'not_saved') {
            onSchemeUpdate(currentScheme.name, false);
        }
    }, [setNodes, currentScheme, onSchemeUpdate]);

    // Обработчик обновления одного параметра (для быстрого переключения)
    const handleParamUpdate = useCallback((nodeId, paramName, paramValue) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        params: {
                            ...node.data.params,
                            [paramName]: paramValue
                        }
                    }
                };
            }
            return node;
        }));

        // Помечаем схему как несохранённую
        if (currentScheme.isSaved && currentScheme.name !== 'not_saved') {
            onSchemeUpdate(currentScheme.name, false);
        }
    }, [setNodes, currentScheme, onSchemeUpdate]);

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
            clearAutoSave();
            setNodes(loadedSchemeData.nodes || []);
            setEdges(loadedSchemeData.edges || []);
            hasLoadedExternalScheme.current = true;
            setLoadedSchemeData(null);
        }
    }, [loadedSchemeData, setNodes, setEdges, clearAutoSave, setLoadedSchemeData]);

    // Добавляем обработчики к узлам
    useEffect(() => {
        setNodes(nds => nds.map(node => ({
            ...node,
            data: {
                ...node.data,
                nodeId: node.id,
                onOpenParams: handleOpenParams,
                onOpenVisualization: handleOpenVisualization,
                onParamUpdate: handleParamUpdate
            }
        })));
    }, [handleOpenParams, handleOpenVisualization, handleParamUpdate, setNodes]);

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

    /**
     * Проверка допустимости соединения
     */
    const isValidConnection = useCallback((connection) => {
        const sourceNode = nodes.find(node => node.id === connection.source);
        const targetNode = nodes.find(node => node.id === connection.target);

        if (!sourceNode || !targetNode) return false;

        // Запрещаем соединение узла с самим собой
        if (sourceNode.id === targetNode.id) {
            return false;
        }

        // Проверяем, не подключено ли уже что-то ко входу целевого узла
        const existingEdgeToTarget = edges.find(edge =>
            edge.target === connection.target && edge.targetHandle === connection.targetHandle
        );

        if (existingEdgeToTarget) {
            return false; // Уже есть соединение на этот вход
        }

        // Проверяем типы сигналов
        const sourceSignalType = sourceNode.data?.signalConfig?.output;
        const targetSignalType = targetNode.data?.signalConfig?.input;

        // Если у источника нет выхода или у цели нет входа
        if (!sourceSignalType || !targetSignalType) {
            return false;
        }

        // Проверяем совместимость типов сигналов
        return areSignalsCompatible(sourceSignalType, targetSignalType);
    }, [nodes, edges]);

    const onConnect = useCallback(
        (params) => {
            const sourceNode = nodes.find(node => node.id === params.source);
            const targetNode = nodes.find(node => node.id === params.target);

            if (!sourceNode || !targetNode) return;

            // Проверяем, не существует ли уже такого соединения
            const connectionExists = edges.some(edge =>
                edge.source === params.source &&
                edge.target === params.target &&
                edge.sourceHandle === params.sourceHandle &&
                edge.targetHandle === params.targetHandle
            );

            if (connectionExists) {
                return; // Такое соединение уже существует
            }

            // Получаем тип сигнала от источника
            const signalType = sourceNode.data?.signalConfig?.output || 'real';

            // Создаём ребро с информацией о типе сигнала
            const edge = {
                ...params,
                animated: isRunning,
                type: signalType === 'complex' ? 'complex' : 'real',
                data: {
                    signalType: signalType
                }
            };

            setEdges((eds) => addEdge(edge, eds));

            // Помечаем схему как несохранённую при изменении
            if (currentScheme.isSaved && currentScheme.name !== 'not_saved') {
                onSchemeUpdate(currentScheme.name, false);
            }
        },
        [setEdges, currentScheme, onSchemeUpdate, nodes, isRunning, edges]
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

            // Получаем позицию относительно React Flow wrapper
            const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
            if (!reactFlowBounds || !reactFlowInstance) return;

            // Вычисляем позицию относительно React Flow
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            if (!position) return;

            const signalConfig = getBlockSignalConfig(blockType);
            const nodeId = generateNodeId();

            const newNode = {
                id: nodeId,
                type: 'block',
                position,
                data: {
                    label: blockType,
                    blockType,
                    params: getDefaultParams(blockType),
                    signalConfig: signalConfig,
                    nodeId: nodeId,
                    onOpenParams: handleOpenParams,
                    onOpenVisualization: handleOpenVisualization,
                    onParamUpdate: handleParamUpdate
                },
            };

            setNodes((nds) => nds.concat(newNode));

            // Помечаем схему как несохранённую при добавлении узла
            if (currentScheme.isSaved && currentScheme.name !== 'not_saved') {
                onSchemeUpdate(currentScheme.name, false);
            }
        },
        [reactFlowInstance, setNodes, currentScheme, onSchemeUpdate, handleOpenParams, handleOpenVisualization, handleParamUpdate]
    );

    // Обновляем анимацию существующих соединений при изменении состояния симуляции
    useEffect(() => {
        setEdges(eds => eds.map(edge => ({
            ...edge,
            animated: isRunning,
            data: {
                ...edge.data,
                isRunning: isRunning
            }
        })));
    }, [isRunning, setEdges]);

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
                    edgeTypes={edgeTypes}
                    isValidConnection={isValidConnection}
                    fitView
                >
                    <Background
                        color={isDarkTheme ? '#374151' : '#e5e7eb'}
                        gap={16}
                        size={1}
                    />
                    <Controls
                        className={isDarkTheme ? 'dark-theme-controls' : ''}
                        showInteractive={false}
                    />
                    {/*<MiniMap*/}
                    {/*    className={isDarkTheme ? 'dark-theme-minimap' : ''}*/}
                    {/*    nodeStrokeColor={(node) => {*/}
                    {/*        if (node.selected) return '#4F46E5';*/}
                    {/*        return isDarkTheme ? '#4b5563' : '#d1d5db';*/}
                    {/*    }}*/}
                    {/*    nodeColor={() => {*/}
                    {/*        return isDarkTheme ? '#374151' : '#f3f4f6';*/}
                    {/*    }}*/}
                    {/*    maskColor={isDarkTheme ? 'rgba(86, 204, 242, 0.1)' : 'rgba(240, 240, 240, 0.6)'}*/}
                    {/*/>*/}
                </ReactFlow>
                <SignalLegend isDarkTheme={isDarkTheme} />
            </div>

            {/* Диалог редактирования параметров блока */}
            {paramsDialogNode && (
                <BlockParamsDialog
                    isDarkTheme={isDarkTheme}
                    onClose={() => setParamsDialogNode(null)}
                    node={paramsDialogNode}
                    onSave={handleSaveParams}
                />
            )}
        </div>
    );
}

DSPEditor.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    currentScheme: PropTypes.object.isRequired,
    onSchemeUpdate: PropTypes.func.isRequired,
    onStatsUpdate: PropTypes.func.isRequired,
    onReactFlowInit: PropTypes.func,
    isRunning: PropTypes.bool.isRequired,
    onOpenVisualization: PropTypes.func
};

export default DSPEditor;