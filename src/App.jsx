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
    const [compilationErrors, setCompilationErrors] = useState([]);

    // Nodes для визуализации
    const [nodes, setNodes] = useState([]);

    const handleSchemeUpdate = useCallback((schemeName, isSaved = true) => {
        setCurrentScheme({
            name: schemeName,
            isSaved
        });
    }, []);

    const handleStatsUpdate = useCallback((newStats) => {
        setStats(newStats);
    }, []);

    const handleNewScheme = useCallback(() => {
        if (!currentScheme.isSaved) {
            const confirmed = window.confirm(
                'Текущая схема не сохранена. Создать новую схему?'
            );
            if (!confirmed) return;
        }

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

        console.log('Создана новая схема');
    }, [currentScheme.isSaved, reactFlowInstance, isRunning]);

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

    const handleStartSimulation = useCallback(() => {
        if (!reactFlowInstance) return;

        if (stats.nodesCount === 0) {
            alert('Добавьте хотя бы один узел для запуска симуляции');
            return;
        }

        const currentNodes = reactFlowInstance.getNodes();
        const edges = reactFlowInstance.getEdges();
        setNodes(currentNodes);

        const inputNode = currentNodes.find(n => n.data.blockType === 'Входной сигнал');
        if (!inputNode) {
            alert('Добавьте блок "Входной сигнал" для запуска');
            return;
        }

        const wavFile = inputNode.data.params?.wavFile;
        if (!wavFile) {
            alert('Выберите WAV файл в блоке "Входной сигнал"');
            return;
        }

        const compilationResult = GraphCompiler.compile(currentNodes, edges);

        if (!compilationResult.success) {
            setCompilationErrors(compilationResult.errors);
            const errorMessages = compilationResult.errors.map(e => e.message).join('\n');
            alert(`Ошибки компиляции:\n${errorMessages}`);
            return;
        }

        setCompilationErrors([]);

        WavFileService.loadFile(wavFile).then((fileInfo) => {
            setSampleRate(fileInfo.sampleRate);
            DSPProcessor.initialize(currentNodes, edges);

            DSPProcessor.onProgress = (progress) => {
                setProcessingProgress(progress);
            };

            DSPProcessor.onBlockOutput = (nodeId, output, blockType) => {
                if (visualizationManagerRef.current) {
                    visualizationManagerRef.current.updateData(nodeId, output);
                }
            };

            DSPProcessor.onComplete = () => {
                setIsRunning(false);
                console.log('Обработка завершена');
            };

            DSPProcessor.onError = (error) => {
                setIsRunning(false);
                alert(`Ошибка обработки: ${error.message}`);
            };

            DSPProcessor.start();
            setIsRunning(true);
            console.log('Запуск обработки. Sample rate:', fileInfo.sampleRate);
        }).catch(error => {
            alert(`Ошибка загрузки WAV файла: ${error.message}`);
        });
    }, [reactFlowInstance, stats.nodesCount]);

    const handleStopSimulation = useCallback(() => {
        DSPProcessor.stop();
        setIsRunning(false);
        console.log('Обработка остановлена');
    }, []);

    const handleSampleRateChange = useCallback((newRate) => {
        setSampleRate(newRate);
        console.log('Частота дискретизации изменена на:', newRate, 'Гц');
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

    useEffect(() => {
        return () => {
            DSPProcessor.stop();
            WavFileService.close();
        };
    }, []);

    const isSaveEnabled = true;
    const isSaveAsEnabled = true;

    return (
        <DSPEditorProvider reactFlowInstance={reactFlowInstance}>
            <div className={`app ${isDarkTheme ? 'dark-theme' : ''}`}>
                <Header currentScheme={currentScheme} />

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
                        isSaveEnabled={isSaveEnabled}
                        isSaveAsEnabled={isSaveAsEnabled}
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
                />

                {/* Менеджер окон визуализации */}
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
            </div>
        </DSPEditorProvider>
    );
}

export default App;