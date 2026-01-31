import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import './DSPEditor.css';

const nodeTypes = {
    block: BlockNode,
};

let nodeId = 0;
const getNodeId = () => `node_${nodeId++}`;

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

function DSPEditor({ isDarkTheme, currentScheme, onSchemeUpdate, onNodesUpdate }) {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const lastSavedState = useRef(null);
    const autoSaveTimeout = useRef(null);

    // Отслеживаем наличие узлов для кнопки "Сохранить как"
    useEffect(() => {
        if (onNodesUpdate) {
            onNodesUpdate(nodes.length > 0);
        }
    }, [nodes, onNodesUpdate]);

    // Загружаем автосохраненную схему при монтировании
    useEffect(() => {
        const loadAutoSavedScheme = () => {
            try {
                const autoSaved = localStorage.getItem('dsp-autosave');
                if (autoSaved) {
                    const { nodes: savedNodes, edges: savedEdges, timestamp } = JSON.parse(autoSaved);

                    // Проверяем, не слишком ли старое автосохранение (больше 1 дня)
                    const saveDate = new Date(timestamp);
                    const now = new Date();
                    const diffDays = (now - saveDate) / (1000 * 60 * 60 * 24);

                    if (diffDays < 1) { // Сохранено менее 1 дня назад
                        setNodes(savedNodes || []);
                        setEdges(savedEdges || []);
                        console.log('Автосохраненная схема загружена');
                    } else {
                        localStorage.removeItem('dsp-autosave');
                    }
                }
            } catch (error) {
                console.error('Ошибка загрузки автосохраненной схемы:', error);
            }
        };

        loadAutoSavedScheme();
    }, [setNodes, setEdges]);

    // Функция автосохранения
    const autoSave = useCallback(() => {
        if (!reactFlowInstance || nodes.length === 0) return;

        const flow = reactFlowInstance.toObject();
        const autoSaveData = {
            nodes: flow.nodes,
            edges: flow.edges,
            viewport: flow.viewport,
            timestamp: new Date().toISOString(),
        };

        try {
            localStorage.setItem('dsp-autosave', JSON.stringify(autoSaveData));
            lastSavedState.current = JSON.stringify(autoSaveData);

            // Если текущая схема не сохранена, отмечаем это
            if (currentScheme.name === 'not_saved' && !currentScheme.isSaved) {
                onSchemeUpdate('not_saved', false);
            }
        } catch (error) {
            console.error('Ошибка автосохранения:', error);
        }
    }, [reactFlowInstance, nodes, currentScheme, onSchemeUpdate]);

    // Автосохранение при изменении схемы
    useEffect(() => {
        if (autoSaveTimeout.current) {
            clearTimeout(autoSaveTimeout.current);
        }

        autoSaveTimeout.current = setTimeout(() => {
            autoSave();
        }, 2000); // Автосохранение через 2 секунды после изменений

        return () => {
            if (autoSaveTimeout.current) {
                clearTimeout(autoSaveTimeout.current);
            }
        };
    }, [nodes, edges, autoSave]);

    // Автосохранение при размонтировании
    useEffect(() => {
        return () => {
            autoSave();
        };
    }, [autoSave]);

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

            const position = reactFlowInstance?.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            if (!position) return;

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

    // Функция сохранения схемы
    const saveScheme = useCallback(async (schemeData) => {
        if (!reactFlowInstance) return false;

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

            // Очищаем автосохранение после успешного сохранения
            localStorage.removeItem('dsp-autosave');
            lastSavedState.current = null;

            return { success: true, data: fullSchemeData };
        } catch (error) {
            console.error('Ошибка сохранения схемы:', error);
            return { success: false, error: 'Ошибка при сохранении схемы' };
        }
    }, [reactFlowInstance]);

    // Функция загрузки схемы
    const loadScheme = useCallback((schemeName) => {
        try {
            const savedSchemes = JSON.parse(localStorage.getItem('dsp-schemes') || '[]');
            const scheme = savedSchemes.find(s => s.name === schemeName);

            if (scheme) {
                setNodes(scheme.nodes || []);
                setEdges(scheme.edges || []);
                if (scheme.viewport && reactFlowInstance) {
                    reactFlowInstance.setViewport(scheme.viewport);
                }

                // Очищаем автосохранение после загрузки
                localStorage.removeItem('dsp-autosave');
                lastSavedState.current = null;

                return { success: true, data: scheme };
            }
            return { success: false, error: 'Схема не найдена' };
        } catch (error) {
            console.error('Ошибка загрузки схемы:', error);
            return { success: false, error: 'Ошибка при загрузке схемы' };
        }
    }, [reactFlowInstance, setNodes, setEdges]);

    // Функция удаления схемы
    const deleteScheme = useCallback((schemeName) => {
        try {
            const savedSchemes = JSON.parse(localStorage.getItem('dsp-schemes') || '[]');
            const filteredSchemes = savedSchemes.filter(s => s.name !== schemeName);

            localStorage.setItem('dsp-schemes', JSON.stringify(filteredSchemes));

            return { success: true };
        } catch (error) {
            console.error('Ошибка удаления схемы:', error);
            return { success: false, error: 'Ошибка при удалении схемы' };
        }
    }, []);

    // Экспортируем функции для использования в диалогах
    const editorAPI = useMemo(() => ({
        saveScheme,
        loadScheme,
        deleteScheme,
        getSavedSchemes: () => {
            try {
                return JSON.parse(localStorage.getItem('dsp-schemes') || '[]');
            } catch {
                return [];
            }
        }
    }), [saveScheme, loadScheme, deleteScheme]);

    // Передаем API в глобальную область для доступа из диалогов
    useEffect(() => {
        window.dspEditorAPI = editorAPI;
    }, [editorAPI]);

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            delete window.dspEditorAPI;
        };
    }, []);

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
                    <Controls
                        position="bottom-left"
                        style={{
                            backgroundColor: isDarkTheme ? '#1f2937' : 'white',
                            borderColor: isDarkTheme ? '#4b5563' : '#e5e7eb',
                        }}
                    />
                    <MiniMap
                        style={{
                            backgroundColor: isDarkTheme ? '#1f2937' : 'white',
                            border: isDarkTheme ? '1px solid #4b5563' : '1px solid #e5e7eb',
                        }}
                    />
                </ReactFlow>
            </div>
        </div>
    );
}

export default DSPEditor;