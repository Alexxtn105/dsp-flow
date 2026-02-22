import { useState, useCallback, useRef, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { DSPEditorProvider } from './contexts/DSPEditorContext';
import Header from './components/layout/Header';
import ControlToolbar from './components/layout/ControlToolbar/ControlToolbar.jsx';
import DSPEditor from './components/dsp/DSPEditor';
import Footer from './components/layout/Footer';
import SaveDialog from './components/dialogs/SaveDialog';
import LoadDialog from './components/dialogs/LoadDialog';
import SettingsDialog from './components/dialogs/SettingsDialog';
import ConfirmDialog from './components/dialogs/ConfirmDialog/ConfirmDialog.jsx';
import { VisualizationManager } from './components/visualization';
import { GraphCompiler, DSPProcessor, WavFileService } from './engine';
import './App.css';

function App() {
    const { isDarkTheme, toggleTheme } = useTheme();
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const visualizationManagerRef = useRef(null);

    // Состояние текущей схемы
    const [currentScheme, setCurrentScheme] = useState({
        name: 'not_saved',
        isSaved: true
    });

    // Состояния диалогов
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);

    // Диалог подтверждения/сообщения (замена alert/confirm)
    const [dialogState, setDialogState] = useState(null);

    const showAlert = useCallback((message, title) => {
        setDialogState({ mode: 'alert', message, title });
    }, []);

    const showConfirm = useCallback((message, title, onConfirm) => {
        setDialogState({ mode: 'confirm', message, title, onConfirm });
    }, []);

    const closeDialog = useCallback(() => {
        setDialogState(null);
    }, []);

    // Частота дискретизации
    const [sampleRate, setSampleRate] = useState(48000);

    // Статистика схемы
    const [stats, setStats] = useState({
        nodesCount: 0,
        connectionsCount: 0
    });

    // Состояние симуляции
    const [isRunning, setIsRunning] = useState(false);

    // Прогресс обработки
    const [processingProgress, setProcessingProgress] = useState({
        currentSample: 0,
        totalSamples: 0,
        progress: 0
    });

    // Ошибки компиляции
    const [, setCompilationErrors] = useState([]);

    // Nodes для визуализации
    const [nodes, setNodes] = useState([]);

    // Manual Mode State
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualStepSize, setManualStepSize] = useState(1024);

    // Debounce timer ref для onProgress
    const progressTimerRef = useRef(null);
    const lastProgressRef = useRef(null);

    const handleSchemeUpdate = useCallback((schemeName, isSaved = true) => {
        setCurrentScheme({
            name: schemeName,
            isSaved
        });
    }, []);

    const handleStatsUpdate = useCallback((newStats) => {
        setStats(newStats);
    }, []);

    const doCreateNewScheme = useCallback(() => {
        if (isRunning) {
            DSPProcessor.stop();
            setIsRunning(false);
        }

        if (reactFlowInstance) {
            reactFlowInstance.setNodes([]);
            reactFlowInstance.setEdges([]);
            reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
        }

        setCurrentScheme({
            name: 'not_saved',
            isSaved: true
        });
        setProcessingProgress({ currentSample: 0, totalSamples: 0, progress: 0 });
        setCompilationErrors([]);
        setNodes([]);
    }, [reactFlowInstance, isRunning]);

    const handleNewScheme = useCallback(() => {
        if (!currentScheme.isSaved) {
            showConfirm(
                'Текущая схема не сохранена. Создать новую схему?',
                'Новая схема',
                doCreateNewScheme
            );
            return;
        }
        doCreateNewScheme();
    }, [currentScheme.isSaved, doCreateNewScheme, showConfirm]);

    const handleSave = useCallback(() => {
        if (currentScheme.name === 'not_saved') {
            setShowSaveAsDialog(true);
        } else {
            setShowSaveDialog(true);
        }
    }, [currentScheme.name]);

    const handleSaveSuccess = useCallback((schemeName) => {
        handleSchemeUpdate(schemeName, true);
        setShowSaveDialog(false);
        setShowSaveAsDialog(false);
    }, [handleSchemeUpdate]);

    const handleLoadSuccess = useCallback((schemeName) => {
        handleSchemeUpdate(schemeName, true);
        setShowLoadDialog(false);
    }, [handleSchemeUpdate]);

    const handleToggleManualMode = useCallback((enabled) => {
        setIsManualMode(enabled);
        DSPProcessor.setManualMode(enabled);
    }, []);

    const handleStartSimulation = useCallback(() => {
        if (!reactFlowInstance) return;

        if (stats.nodesCount === 0) {
            showAlert('Добавьте хотя бы один узел для запуска симуляции', 'Запуск');
            return;
        }

        const currentNodes = reactFlowInstance.getNodes();
        const edges = reactFlowInstance.getEdges();
        setNodes(currentNodes);

        const inputNode = currentNodes.find(n => n.data.blockType === 'Audio File');

        const hasGenerators = currentNodes.some(n =>
            ['Синусный генератор', 'Косинусный генератор', 'Референсный синусный генератор', 'Референсный косинусный генератор'].includes(n.data.blockType) ||
            n.data.blockType === 'Audio File'
        );

        if (!hasGenerators) {
            showAlert('Добавьте хотя бы один источник сигнала (Audio File или Генератор) для запуска', 'Запуск');
            return;
        }

        const wavFile = inputNode?.data?.params?.wavFile;
        if (inputNode && !wavFile) {
            showAlert('Выберите WAV файл в блоке "Audio File"', 'Запуск');
            return;
        }

        const compilationResult = GraphCompiler.compile(currentNodes, edges);

        if (!compilationResult.success) {
            setCompilationErrors(compilationResult.errors);
            const errorMessages = compilationResult.errors.map(e => e.message).join('\n');
            showAlert(`Ошибки компиляции:\n${errorMessages}`, 'Ошибка компиляции');
            return;
        }

        setCompilationErrors([]);

        const startProcessing = (fileSampleRate = null) => {
            const rate = fileSampleRate || sampleRate;

            if (fileSampleRate) {
                setSampleRate(fileSampleRate);
            }

            DSPProcessor.setSampleRate(rate);
            DSPProcessor.setFileMode(!!fileSampleRate);
            DSPProcessor.setManualMode(isManualMode);

            DSPProcessor.initialize(currentNodes, edges);

            DSPProcessor.onProgress = (progress) => {
                lastProgressRef.current = progress;
                if (progressTimerRef.current) {
                    clearTimeout(progressTimerRef.current);
                }
                progressTimerRef.current = setTimeout(() => {
                    progressTimerRef.current = null;
                    if (lastProgressRef.current) {
                        setProcessingProgress(lastProgressRef.current);
                    }
                }, 100);
            };

            DSPProcessor.onBlockOutput = (nodeId, output) => {
                if (visualizationManagerRef.current) {
                    visualizationManagerRef.current.updateData(nodeId, output);
                }
            };

            DSPProcessor.onComplete = () => {
                setIsRunning(false);
                setProcessingProgress({ currentSample: 0, totalSamples: 0, progress: 0 });
            };

            DSPProcessor.onError = (error) => {
                setIsRunning(false);
                showAlert(`Ошибка обработки: ${error.message}`, 'Ошибка');
            };

            DSPProcessor.start();
            setIsRunning(true);
        };

        if (wavFile) {
            WavFileService.loadFile(wavFile).then((fileInfo) => {
                startProcessing(fileInfo.sampleRate);
            }).catch(error => {
                showAlert(`Ошибка загрузки WAV файла: ${error.message}`, 'Ошибка');
            });
        } else {
            startProcessing(null);
        }
    }, [reactFlowInstance, stats.nodesCount, sampleRate, isManualMode, showAlert]);

    const handleManualStep = useCallback(() => {
        if (!isRunning) {
            handleStartSimulation();
        } else {
            DSPProcessor.step(manualStepSize);
        }
    }, [isRunning, manualStepSize, handleStartSimulation]);

    const handleStopSimulation = useCallback(() => {
        DSPProcessor.stop();
        setIsRunning(false);
    }, []);

    const handleSampleRateChange = useCallback((newRate) => {
        setSampleRate(newRate);
        setCurrentScheme(prev => ({
            ...prev,
            isSaved: false
        }));
    }, []);

    const handleOpenVisualization = useCallback((nodeId) => {
        if (visualizationManagerRef.current && reactFlowInstance) {
            const currentNodes = reactFlowInstance.getNodes();
            setNodes(currentNodes);
            visualizationManagerRef.current.openWindow(nodeId);
        }
    }, [reactFlowInstance]);

    // Синхронизация nodes для VisualizationManager при изменении графа
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (reactFlowInstance) setNodes(reactFlowInstance.getNodes());
    }, [stats.nodesCount, reactFlowInstance]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        return () => {
            DSPProcessor.stop();
            WavFileService.close();
            if (progressTimerRef.current) {
                clearTimeout(progressTimerRef.current);
            }
        };
    }, []);

    return (
        <DSPEditorProvider reactFlowInstance={reactFlowInstance}>
            <div className={`app ${isDarkTheme ? 'dark-theme' : ''}`}>
                <Header currentScheme={currentScheme} isDarkTheme={isDarkTheme} />

                <div className="app-content">
                    <ControlToolbar
                        isDarkTheme={isDarkTheme}
                        toggleTheme={toggleTheme}
                        onSave={handleSave}
                        onSaveAs={() => setShowSaveAsDialog(true)}
                        onLoad={() => setShowLoadDialog(true)}
                        onNewScheme={handleNewScheme}
                        onSettings={() => setShowSettingsDialog(true)}
                        onStart={handleStartSimulation}
                        onStop={handleStopSimulation}
                        isSaveEnabled
                        isSaveAsEnabled
                        isRunning={isRunning}
                    />

                    <DSPEditor
                        isDarkTheme={isDarkTheme}
                        currentScheme={currentScheme}
                        onSchemeUpdate={handleSchemeUpdate}
                        onStatsUpdate={handleStatsUpdate}
                        onReactFlowInit={setReactFlowInstance}
                        isRunning={isRunning}
                        onOpenVisualization={handleOpenVisualization}
                    />
                </div>

                <Footer
                    isDarkTheme={isDarkTheme}
                    isRunning={isRunning}
                    nodesCount={stats.nodesCount}
                    connectionsCount={stats.connectionsCount}
                    sampleRate={sampleRate}
                    progress={processingProgress.progress}
                    isManualMode={isManualMode}
                    manualStepSize={manualStepSize}
                    currentSample={processingProgress.currentSample}
                    totalSamples={processingProgress.totalSamples}
                    onToggleManual={handleToggleManualMode}
                    onStep={handleManualStep}
                    onStepSizeChange={setManualStepSize}
                />

                <VisualizationManager
                    ref={visualizationManagerRef}
                    isDarkTheme={isDarkTheme}
                    sampleRate={sampleRate}
                    nodes={nodes}
                />

                {showSaveDialog && (
                    <SaveDialog
                        isDarkTheme={isDarkTheme}
                        onClose={() => setShowSaveDialog(false)}
                        schemeName={currentScheme.name}
                        onSaveSuccess={handleSaveSuccess}
                        mode="save"
                    />
                )}

                {showSaveAsDialog && (
                    <SaveDialog
                        isDarkTheme={isDarkTheme}
                        onClose={() => setShowSaveAsDialog(false)}
                        schemeName={currentScheme.name}
                        onSaveSuccess={handleSaveSuccess}
                        mode="saveAs"
                    />
                )}

                {showLoadDialog && (
                    <LoadDialog
                        isDarkTheme={isDarkTheme}
                        onClose={() => setShowLoadDialog(false)}
                        onLoadSuccess={handleLoadSuccess}
                        showConfirm={showConfirm}
                        showAlert={showAlert}
                    />
                )}

                {showSettingsDialog && (
                    <SettingsDialog
                        isDarkTheme={isDarkTheme}
                        onClose={() => setShowSettingsDialog(false)}
                        sampleRate={sampleRate}
                        onSampleRateChange={handleSampleRateChange}
                    />
                )}

                {dialogState && (
                    <ConfirmDialog
                        isDarkTheme={isDarkTheme}
                        message={dialogState.message}
                        title={dialogState.title}
                        mode={dialogState.mode}
                        onConfirm={() => {
                            if (dialogState.onConfirm) dialogState.onConfirm();
                            closeDialog();
                        }}
                        onClose={closeDialog}
                    />
                )}
            </div>
        </DSPEditorProvider>
    );
}

export default App;
