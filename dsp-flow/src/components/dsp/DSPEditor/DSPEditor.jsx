import {useState, useCallback, useRef, useEffect} from 'react';
import PropTypes from 'prop-types';
import {observer} from 'mobx-react-lite';
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
import AudioFileNode from '../../nodes/AudioFileNode';
import BlockParamsModal from '../../common/BlockParamsModal';
import RealSignalEdge from '../edges/RealSignalEdge';
import ComplexSignalEdge from '../edges/ComplexSignalEdge';
import SignalLegend from './SignalLegend';
import {dspExecutionStore} from '../../../stores/DSPExecutionStore';

import {useAutoSave} from '../../../hooks/index.js';
import {
    generateNodeId,
    getDefaultParams,
    getBlockSignalConfig,
    areSignalsCompatible
} from '../../../utils/helpers';
import {useDSPEditor} from '../../../hooks/useDSPEditor';
import './DSPEditor.css';
import './ReactFlowTheme.css';
import FloatingWindowsManager from '../../visualization/FloatingWindowsManager';


const nodeTypes = {
    block: BlockNode,
    audioFile: AudioFileNode,
};

const edgeTypes = {
    real: RealSignalEdge,
    complex: ComplexSignalEdge,
};



const DSPEditor = observer(({
                                isDarkTheme,
                                currentScheme,
                                onSchemeUpdate,
                                onStatsUpdate,
                                onReactFlowInit
                               // isRunning
                            }) => {
    const isRunning = dspExecutionStore.isRunning;
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const hasLoadedExternalScheme = useRef(false);
    const [visualizationWindows, setVisualizationWindows] = useState([]);


    // Состояние для модального окна параметров
    const [paramsModal, setParamsModal] = useState({
        isOpen: false,
        nodeId: null,
        blockType: null,
        currentParams: {}
    });


    // Обработчик переключения видимости визуализации
    const handleToggleVisualization = useCallback((nodeId) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                const newVisible = !node.data.visualizationVisible;

                if (newVisible) {
                    // Показываем окно
                    const visData = dspExecutionStore.getVisualizationData(nodeId);
                    if (visData) {
                        setVisualizationWindows(windows => [
                            ...windows.filter(w => w.nodeId !== nodeId),
                            {
                                nodeId,
                                type: visData.type,
                                data: visData.data,
                                nodeLabel: node.data.label
                            }
                        ]);
                    }
                } else {
                    // Скрываем окно
                    setVisualizationWindows(windows =>
                        windows.filter(w => w.nodeId !== nodeId)
                    );
                }

                return {
                    ...node,
                    data: {
                        ...node.data,
                        visualizationVisible: newVisible
                    }
                };
            }
            return node;
        }));
    }, [setNodes]);

    // Обработчик закрытия окна
    const handleCloseVisualizationWindow = useCallback((nodeId) => {
        handleToggleVisualization(nodeId);
    }, [handleToggleVisualization]);

    // Получаем контекст
    const {loadedSchemeData, setLoadedSchemeData} = useDSPEditor();

    // Автосохранение
    const {loadAutoSave, clearAutoSave} = useAutoSave(
        nodes,
        edges,
        reactFlowInstance,
        {
            enabled: true,
            //skipWhen: () => hasLoadedExternalScheme.current
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
            clearAutoSave();
            setNodes(loadedSchemeData.nodes || []);
            setEdges(loadedSchemeData.edges || []);
            hasLoadedExternalScheme.current = true;
            setLoadedSchemeData(null);
        }
    }, [loadedSchemeData, setNodes, setEdges, clearAutoSave, setLoadedSchemeData]);

    // Компиляция графа при изменении узлов или рёбер
    useEffect(() => {
        if (nodes.length === 0) {
            dspExecutionStore.cleanup();
            return;
        }

        // Компилируем граф
        const result = dspExecutionStore.compile(nodes, edges);

        if (!result.success) {
            console.error('Compilation errors:', result.errors);
        }
    }, [nodes, edges]);

    // Обновление статистики
    useEffect(() => {
        if (onStatsUpdate) {
            onStatsUpdate({
                nodesCount: nodes.length,
                connectionsCount: edges.length
            });
        }
    }, [nodes, edges, onStatsUpdate]);


    // Обработчик двойного клика по узлу
    const handleNodeDoubleClick = useCallback((nodeId, blockType, currentParams) => {
        console.log('Opening params modal:', { nodeId, blockType, currentParams });
        setParamsModal({
            isOpen: true,
            nodeId,
            blockType,
            currentParams: currentParams || {}
        });
    }, []);

    // Обработчик сохранения параметров
    const handleParamsSave = useCallback((newParams) => {
        if (!paramsModal.nodeId) return;

        setNodes(nds => nds.map(node => {
            if (node.id === paramsModal.nodeId) {
                const updatedData = {
                    ...node.data,
                    params: {
                        ...node.data.params,
                        ...newParams
                    }
                };

                // Для аудиофайла сохраняем аудиофайл отдельно
                if (paramsModal.blockType === 'Аудио файл') {
                    if (newParams.audioFile) {
                        updatedData.audioFile = newParams.audioFile;
                    } else {
                        updatedData.audioFile = null;
                    }
                }

                return {
                    ...node,
                    data: updatedData
                };
            }
            return node;
        }));

        // Помечаем схему как несохранённую
        if (currentScheme.isSaved && currentScheme.name !== 'not_saved') {
            onSchemeUpdate(currentScheme.name, false);
        }

        setParamsModal({
            isOpen: false,
            nodeId: null,
            blockType: null,
            currentParams: {}
        });
    }, [paramsModal.nodeId, paramsModal.blockType, setNodes, currentScheme, onSchemeUpdate]);


    // Обработчик загрузки аудиофайла
    const handleAudioFileLoad = useCallback((nodeId, fileInfo) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        audioFile: fileInfo
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

    // Передаём ReactFlow instance наверх
    const handleInit = useCallback((instance) => {
        setReactFlowInstance(instance);
        if (onReactFlowInit) {
            onReactFlowInit(instance);
        }
    }, [onReactFlowInit]);

    //Проверка допустимости соединения
    const isValidConnection = useCallback((connection) => {
        const sourceNode = nodes.find(node => node.id === connection.source);
        const targetNode = nodes.find(node => node.id === connection.target);

        if (!sourceNode || !targetNode) return false;

        // Запрещаем соединение узла с самим собой
        if (sourceNode.id === targetNode.id) return false;

        // Проверяем, не подключено ли уже что-то ко входу целевого узла
        const existingEdgeToTarget = edges.find(edge =>
            edge.target === connection.target && edge.targetHandle === connection.targetHandle
        );

        // Уже есть соединение на этот вход
        if (existingEdgeToTarget) return false;


        // Проверяем типы сигналов
        const sourceSignalType = sourceNode.data?.signalConfig?.output;
        const targetSignalType = targetNode.data?.signalConfig?.input;

        // Если у источника нет выхода или у цели нет входа
        if (!sourceSignalType || !targetSignalType) return false;

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
            // Такое соединение уже существует
            if (connectionExists) return;

            // Получаем тип сигнала от источника
            const signalType = sourceNode.data?.signalConfig?.output || 'real';

            // Создаём ребро с информацией о типе сигнала
            const edge = {
                ...params,
                animated: isRunning,
                type: signalType === 'complex' ? 'complex' : 'real',
                data: {
                    signalType: signalType,
                    isRunning: isRunning
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

            // const newNode = {
            //     id: generateNodeId(), // Теперь гарантированно уникальный
            //     type: 'block',
            //     position,
            //     data: {
            //         label: blockType,
            //         blockType,
            //         params: getDefaultParams(blockType),
            //         signalConfig: signalConfig,
            //         visualizationVisible: false,
            //         onToggleVisualization: handleToggleVisualization  // ✨ ДОБАВИТЬ
            //     },
            // };
            // Определяем тип узла
            const nodeType = blockType === 'Аудио файл' ? 'audioFile' : 'block';

            const newNode = {
                id: generateNodeId(),
                type: nodeType,
                position,
                data: {
                    label: blockType,
                    blockType,
                    params: getDefaultParams(blockType),
                    signalConfig: signalConfig,
                    visualizationVisible: false,
                    onNodeDoubleClick: handleNodeDoubleClick,
                    onFileLoad: blockType === 'Аудио файл' ? handleAudioFileLoad : undefined,
                    onToggleVisualization: handleToggleVisualization
                },
            };

            setNodes((nds) => nds.concat(newNode));

            // Помечаем схему как несохранённую при добавлении узла
            if (currentScheme.isSaved && currentScheme.name !== 'not_saved') {
                onSchemeUpdate(currentScheme.name, false);
            }
        },
        [reactFlowInstance, setNodes, currentScheme, onSchemeUpdate, reactFlowWrapper, handleNodeDoubleClick, handleAudioFileLoad, handleToggleVisualization]
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
    }, [isRunning, setEdges]); // Исправлено на isRunning

    // Обновление данных визуализации при выполнении
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            setVisualizationWindows(windows =>
                windows.map(window => {
                    const visData = dspExecutionStore.getVisualizationData(window.nodeId);
                    if (visData) {
                        return {
                            ...window,
                            data: visData.data
                        };
                    }
                    return window;
                })
            );
        }, 100); // Обновляем каждые 100мс

        return () => clearInterval(interval);
    }, [isRunning]);

    return (
        <>
        <div className={`dsp-editor ${isDarkTheme ? 'dark-theme' : ''}`}>
            <Toolbar isDarkTheme={isDarkTheme}/>
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
                        showInteractive={false} // Можно скрыть кнопку переключения интерактивности, если не нужна
                    />
                    <MiniMap
                        pannable={true}
                        position={"bottom-right"}
                        className={isDarkTheme ? 'dark-theme-minimap' : ''}
                        nodeStrokeColor={(node) => {
                            if (node.selected) return '#4F46E5';
                            return isDarkTheme ? '#4b5563' : '#d1d5db';
                        }}
                        // nodeColor={(node) => {
                        //     return isDarkTheme ? '#374151' : '#f3f4f6';
                        // }}
                        maskColor={isDarkTheme ? 'rgba(86, 204, 242, 0.1)' : 'rgba(240, 240, 240, 0.6)'}
                    />
                </ReactFlow>
                <SignalLegend isDarkTheme={isDarkTheme}/>
            </div>
        </div>

            {/*{showVisualization && (*/}
            {/*    <VisualizationPanel isDarkTheme={isDarkTheme} />*/}
            {/*)}*/}

            {/* Плавающие окна визуализации */}
            {/*{showVisualization && (*/}
            <FloatingWindowsManager
                visualizationWindows={visualizationWindows}
                onCloseWindow={handleCloseVisualizationWindow}
                isDarkTheme={isDarkTheme}
            />

            {/* Модальное окно для редактирования параметров */}
            <BlockParamsModal
                isOpen={paramsModal.isOpen}
                onClose={() => setParamsModal({
                    isOpen: false,
                    nodeId: null,
                    blockType: null,
                    currentParams: {}
                })}
                onSave={handleParamsSave}
                blockType={paramsModal.blockType}
                currentParams={paramsModal.currentParams}
                isDarkTheme={isDarkTheme}
            />


    </>
    );
});

DSPEditor.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    currentScheme: PropTypes.object.isRequired,
    onSchemeUpdate: PropTypes.func.isRequired,
    onStatsUpdate: PropTypes.func.isRequired,
    onReactFlowInit: PropTypes.func//,
    //isRunning: PropTypes.bool.isRequired
};

export default DSPEditor;