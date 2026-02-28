import { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    ReactFlow,
    Background,
    Controls,
    addEdge,
    useNodesState,
    useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Toolbar from '../../layout/Toolbar/Toolbar.jsx';
import BlockNode from '../BlockNode';
import RealSignalEdge from '../edges/RealSignalEdge';
import ComplexSignalEdge from '../edges/ComplexSignalEdge';

import BlockParamsPopover from '../BlockParamsPopover';
import { useAutoSave } from '../../../hooks/index.js';
import {
    generateNodeId,
    getDefaultParams,
    getBlockSignalConfig,
    areSignalsCompatible
} from '../../../utils/helpers';
import { useDSPEditor } from '../../../contexts/DSPEditorContext';
import { useThemeContext } from '../../../contexts/ThemeContext';
import FileStorageService from '../../../services/fileStorageService';
import './DSPEditor.css';
import './ReactFlowTheme.css';

/**
 * Восстановить аудиофайлы из IndexedDB для узлов AudioFile.
 * Если файл не найден — очистить метаданные.
 */
async function restoreAudioFiles(nodes) {
    const hasAudioFiles = nodes.some(
        n => n.data.blockType === 'Audio File' && n.data.params?.wavFileName
    );
    if (!hasAudioFiles) return nodes;

    return Promise.all(nodes.map(async (node) => {
        if (node.data.blockType !== 'Audio File' || !node.data.params?.wavFileName) {
            return node;
        }

        try {
            const file = await FileStorageService.getFile(node.id);
            if (file) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        params: { ...node.data.params, wavFile: file }
                    }
                };
            }
        } catch (err) {
            console.warn('Не удалось восстановить аудиофайл для узла', node.id, err);
        }

        // Файл не найден — очищаем метаданные
        return {
            ...node,
            data: {
                ...node.data,
                params: {
                    ...node.data.params,
                    wavFile: null,
                    wavFileName: null,
                    sourceType: null,
                    detectedSampleRate: null,
                    duration: null,
                    channels: null,
                    totalSamples: null
                }
            }
        };
    }));
}

const nodeTypes = {
    block: BlockNode,
};

const edgeTypes = {
    real: RealSignalEdge,
    complex: ComplexSignalEdge,
};

function DSPEditor({
    currentScheme,
    onSchemeUpdate,
    onStatsUpdate,
    onReactFlowInit,
    isRunning,
    onOpenVisualization,
    onSampleRateChange
}) {
    const { isDarkTheme } = useThemeContext();
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const hasLoadedExternalScheme = useRef(false);
    const processedSchemeRef = useRef(null);

    // Refs для callback-ов — стабильные ссылки, не вызывают ре-рендер всех узлов
    const callbacksRef = useRef({});

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
                const updatedData = {
                    ...node.data,
                    params: newParams
                };

                // Если изменился numInputs — обновляем signalConfig.inputsCount
                if (newParams.numInputs !== undefined && node.data.signalConfig) {
                    updatedData.signalConfig = {
                        ...node.data.signalConfig,
                        inputsCount: newParams.numInputs
                    };
                }

                return { ...node, data: updatedData };
            }
            return node;
        }));

        // Удаляем edges к хэндлам, которых больше нет
        const newNumInputs = newParams.numInputs;
        if (newNumInputs !== undefined) {
            setEdges(eds => eds.filter(edge => {
                if (edge.target !== nodeId) return true;
                const handle = edge.targetHandle;
                if (!handle) return true;
                // Хэндлы имеют вид "input-0", "input-1", ...
                const match = handle.match(/^input-(\d+)$/);
                if (!match) return true; // "input" (одиночный) — оставляем
                const idx = parseInt(match[1], 10);
                return idx < newNumInputs;
            }));
        }

        // Помечаем схему как несохранённую
        if (currentScheme.isSaved && currentScheme.name !== 'not_saved') {
            onSchemeUpdate(currentScheme.name, false);
        }
    }, [setNodes, setEdges, currentScheme, onSchemeUpdate]);

    // Обработчик обновления одного параметра (для быстрого переключения и inline-редактирования)
    const handleParamUpdate = useCallback((nodeId, paramName, paramValue) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                const updatedData = {
                    ...node.data,
                    params: {
                        ...node.data.params,
                        [paramName]: paramValue
                    }
                };

                // Если изменился numInputs — обновляем signalConfig.inputsCount
                if (paramName === 'numInputs' && node.data.signalConfig) {
                    updatedData.signalConfig = {
                        ...node.data.signalConfig,
                        inputsCount: paramValue
                    };
                }

                return { ...node, data: updatedData };
            }
            return node;
        }));

        // Удаляем edges к хэндлам, которых больше нет
        if (paramName === 'numInputs') {
            setEdges(eds => eds.filter(edge => {
                if (edge.target !== nodeId) return true;
                const handle = edge.targetHandle;
                if (!handle) return true;
                const match = handle.match(/^input-(\d+)$/);
                if (!match) return true;
                const idx = parseInt(match[1], 10);
                return idx < paramValue;
            }));
        }

        // Помечаем схему как несохранённую
        if (currentScheme.isSaved && currentScheme.name !== 'not_saved') {
            onSchemeUpdate(currentScheme.name, false);
        }
    }, [setNodes, setEdges, currentScheme, onSchemeUpdate]);

    // Обновляем refs через effect (без ре-рендеров узлов)
    useEffect(() => {
        callbacksRef.current = { handleOpenParams, handleOpenVisualization, handleParamUpdate };
    });

    // Стабильные обёртки для передачи в node.data — не меняют ссылку
    const stableCallbacks = useRef({
        onOpenParams: (nodeId) => callbacksRef.current.handleOpenParams(nodeId),
        onOpenVisualization: (nodeId) => callbacksRef.current.handleOpenVisualization(nodeId),
        onParamUpdate: (nodeId, paramName, paramValue) => callbacksRef.current.handleParamUpdate(nodeId, paramName, paramValue),
    });

    // Вспомогательная функция: инъекция стабильных колбэков в массив нод
    const injectCallbacks = useCallback((rawNodes) => {
        const cbs = stableCallbacks.current;
        return rawNodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                nodeId: node.id,
                onOpenParams: cbs.onOpenParams,
                onOpenVisualization: cbs.onOpenVisualization,
                onParamUpdate: cbs.onParamUpdate
            }
        }));
    }, []);

    // Загрузка автосохранённой схемы при старте
    useEffect(() => {
        const loadAuto = async () => {
            if (!hasLoadedExternalScheme.current) {
                const autoSaved = loadAutoSave();
                if (autoSaved) {
                    const nodesWithCallbacks = injectCallbacks(autoSaved.nodes || []);
                    const restoredNodes = await restoreAudioFiles(nodesWithCallbacks);
                    setNodes(restoredNodes);
                    setEdges(autoSaved.edges || []);
                    hasLoadedExternalScheme.current = true;
                }
            }
        };
        loadAuto();
    }, [loadAutoSave, setNodes, setEdges, injectCallbacks]);

    // Обработка загруженной схемы из контекста (с защитой от двойного вызова в Strict Mode)
    useEffect(() => {
        const loadScheme = async () => {
            if (loadedSchemeData && loadedSchemeData.nodes && loadedSchemeData !== processedSchemeRef.current) {
                processedSchemeRef.current = loadedSchemeData;
                clearAutoSave();
                const nodesWithCallbacks = injectCallbacks(loadedSchemeData.nodes || []);
                const restoredNodes = await restoreAudioFiles(nodesWithCallbacks);
                setNodes(restoredNodes);
                setEdges(loadedSchemeData.edges || []);
                hasLoadedExternalScheme.current = true;
                setLoadedSchemeData(null);
            }
        };
        loadScheme();
    }, [loadedSchemeData, setNodes, setEdges, clearAutoSave, setLoadedSchemeData, injectCallbacks]);

    // Сброс флага при создании новой схемы (граф очищен)
    useEffect(() => {
        if (nodes.length === 0 && edges.length === 0) {
            hasLoadedExternalScheme.current = false;
        }
    }, [nodes.length, edges.length]);

    // Инъекция стабильных callback-ов в узлы при загрузке/добавлении
    // Не зависит от handleOpenParams и т.д. — используются стабильные обёртки через ref
    useEffect(() => {
        setNodes(nds => {
            const cbs = stableCallbacks.current;
            let changed = false;
            const updated = nds.map(node => {
                if (node.data.onOpenParams === cbs.onOpenParams) return node;
                changed = true;
                return {
                    ...node,
                    data: {
                        ...node.data,
                        nodeId: node.id,
                        onOpenParams: cbs.onOpenParams,
                        onOpenVisualization: cbs.onOpenVisualization,
                        onParamUpdate: cbs.onParamUpdate
                    }
                };
            });
            return changed ? updated : nds;
        });
    }, [setNodes]);

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

            if (!reactFlowInstance) return;

            // screenToFlowPosition принимает экранные координаты (clientX/clientY)
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
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
                    onOpenParams: stableCallbacks.current.onOpenParams,
                    onOpenVisualization: stableCallbacks.current.onOpenVisualization,
                    onParamUpdate: stableCallbacks.current.onParamUpdate
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
            <Toolbar />
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
                </ReactFlow>

            </div>

            {/* Поповер редактирования параметров блока */}
            {paramsDialogNode && (
                <BlockParamsPopover
                    onClose={() => setParamsDialogNode(null)}
                    node={paramsDialogNode}
                    onSave={handleSaveParams}
                    onSampleRateChange={onSampleRateChange}
                />
            )}
        </div>
    );
}

DSPEditor.propTypes = {
    currentScheme: PropTypes.object.isRequired,
    onSchemeUpdate: PropTypes.func.isRequired,
    onStatsUpdate: PropTypes.func.isRequired,
    onReactFlowInit: PropTypes.func,
    isRunning: PropTypes.bool.isRequired,
    onOpenVisualization: PropTypes.func,
    onSampleRateChange: PropTypes.func
};

export default DSPEditor;