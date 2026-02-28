import { useState, useCallback, useRef, useEffect } from 'react';
import { useThemeContext } from './contexts/ThemeContext';
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
import { ErrorBoundary } from './components/common';
import { useDialogManager } from './hooks/useDialogManager';
import { useDSPSimulation } from './hooks/useDSPSimulation';
import { DSPProcessor } from './engine';
import './App.css';

function App() {
    const { isDarkTheme } = useThemeContext();
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const visualizationManagerRef = useRef(null);

    // Состояние текущей схемы
    const [currentScheme, setCurrentScheme] = useState({
        name: 'not_saved',
        isSaved: true
    });

    // Частота дискретизации
    const [sampleRate, setSampleRate] = useState(48000);

    // Статистика схемы
    const [stats, setStats] = useState({
        nodesCount: 0,
        connectionsCount: 0
    });

    // Диалоги
    const dialogs = useDialogManager();

    // DSP-симуляция
    const simulation = useDSPSimulation({
        reactFlowInstance,
        sampleRate,
        setSampleRate,
        showAlert: dialogs.showAlert,
        visualizationManagerRef,
    });

    const handleSchemeUpdate = useCallback((schemeName, isSaved = true) => {
        setCurrentScheme({ name: schemeName, isSaved });
    }, []);

    const handleStatsUpdate = useCallback((newStats) => {
        setStats(newStats);
    }, []);

    const doCreateNewScheme = useCallback(() => {
        if (simulation.isRunning || simulation.isPaused) {
            DSPProcessor.reset();
            simulation.setIsRunning(false);
            simulation.setIsPaused(false);
        }

        if (reactFlowInstance) {
            reactFlowInstance.setNodes([]);
            reactFlowInstance.setEdges([]);
            reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
        }

        setCurrentScheme({ name: 'not_saved', isSaved: true });
        simulation.setNodes([]);
    }, [reactFlowInstance, simulation]);

    const handleNewScheme = useCallback(() => {
        if (!currentScheme.isSaved) {
            dialogs.showConfirm(
                'Текущая схема не сохранена. Создать новую схему?',
                'Новая схема',
                doCreateNewScheme
            );
            return;
        }
        doCreateNewScheme();
    }, [currentScheme.isSaved, doCreateNewScheme, dialogs]);

    const handleSave = useCallback(() => {
        if (currentScheme.name === 'not_saved') {
            dialogs.setShowSaveAsDialog(true);
        } else {
            dialogs.setShowSaveDialog(true);
        }
    }, [currentScheme.name, dialogs]);

    const handleSaveSuccess = useCallback((schemeName) => {
        handleSchemeUpdate(schemeName, true);
        dialogs.setShowSaveDialog(false);
        dialogs.setShowSaveAsDialog(false);
    }, [handleSchemeUpdate, dialogs]);

    const handleLoadSuccess = useCallback((schemeName) => {
        handleSchemeUpdate(schemeName, true);
        dialogs.setShowLoadDialog(false);
    }, [handleSchemeUpdate, dialogs]);

    const handleSampleRateChange = useCallback((newRate) => {
        setSampleRate(newRate);
        setCurrentScheme(prev => ({ ...prev, isSaved: false }));
    }, []);

    const handleOpenVisualization = useCallback((nodeId) => {
        if (visualizationManagerRef.current && reactFlowInstance) {
            const currentNodes = reactFlowInstance.getNodes();
            simulation.setNodes(currentNodes);
            visualizationManagerRef.current.openWindow(nodeId);
        }
    }, [reactFlowInstance, simulation]);

    // Синхронизация nodes для VisualizationManager при изменении графа
    useEffect(() => {
        if (reactFlowInstance) simulation.setNodes(reactFlowInstance.getNodes());
    }, [stats.nodesCount, reactFlowInstance, simulation]);

    return (
        <DSPEditorProvider reactFlowInstance={reactFlowInstance}>
            <div className={`app ${isDarkTheme ? 'dark-theme' : ''}`}>
                <Header currentScheme={currentScheme} />

                <div className="app-content">
                    <ControlToolbar
                        onSave={handleSave}
                        onSaveAs={() => dialogs.setShowSaveAsDialog(true)}
                        onLoad={() => dialogs.setShowLoadDialog(true)}
                        onNewScheme={handleNewScheme}
                        onSettings={() => dialogs.setShowSettingsDialog(true)}
                        isSaveEnabled
                        isSaveAsEnabled
                        isRunning={simulation.isRunning}
                    />

                    <ErrorBoundary fallbackMessage="Ошибка редактора графа">
                        <DSPEditor
                            currentScheme={currentScheme}
                            onSchemeUpdate={handleSchemeUpdate}
                            onStatsUpdate={handleStatsUpdate}
                            onReactFlowInit={setReactFlowInstance}
                            isRunning={simulation.isRunning}
                            onOpenVisualization={handleOpenVisualization}
                            onSampleRateChange={handleSampleRateChange}
                        />
                    </ErrorBoundary>
                </div>

                <Footer
                    isRunning={simulation.isRunning}
                    isPaused={simulation.isPaused}
                    nodesCount={stats.nodesCount}
                    connectionsCount={stats.connectionsCount}
                    sampleRate={sampleRate}
                    progress={simulation.processingProgress.progress}
                    isManualMode={simulation.isManualMode}
                    manualStepSize={simulation.manualStepSize}
                    currentSample={simulation.processingProgress.currentSample}
                    totalSamples={simulation.processingProgress.totalSamples}
                    onToggleManual={simulation.handleToggleManualMode}
                    onStep={simulation.handleManualStep}
                    onStepSizeChange={simulation.setManualStepSize}
                    onSeek={simulation.handleSeek}
                    onStart={simulation.handleStartSimulation}
                    onStop={simulation.handleStopSimulation}
                    onRewind={simulation.handleRewind}
                />

                <VisualizationManager
                    ref={visualizationManagerRef}
                    sampleRate={sampleRate}
                    nodes={simulation.nodes}
                />

                <ErrorBoundary fallbackMessage="Ошибка диалогового окна">
                    {dialogs.showSaveDialog && (
                        <SaveDialog
                            onClose={() => dialogs.setShowSaveDialog(false)}
                            schemeName={currentScheme.name}
                            onSaveSuccess={handleSaveSuccess}
                            mode="save"
                        />
                    )}

                    {dialogs.showSaveAsDialog && (
                        <SaveDialog
                            onClose={() => dialogs.setShowSaveAsDialog(false)}
                            schemeName={currentScheme.name}
                            onSaveSuccess={handleSaveSuccess}
                            mode="saveAs"
                        />
                    )}

                    {dialogs.showLoadDialog && (
                        <LoadDialog
                            onClose={() => dialogs.setShowLoadDialog(false)}
                            onLoadSuccess={handleLoadSuccess}
                            showConfirm={dialogs.showConfirm}
                            showAlert={dialogs.showAlert}
                        />
                    )}

                    {dialogs.showSettingsDialog && (
                        <SettingsDialog
                            onClose={() => dialogs.setShowSettingsDialog(false)}
                            sampleRate={sampleRate}
                            onSampleRateChange={handleSampleRateChange}
                        />
                    )}

                    {dialogs.dialogState && (
                        <ConfirmDialog
                            message={dialogs.dialogState.message}
                            title={dialogs.dialogState.title}
                            mode={dialogs.dialogState.mode}
                            onConfirm={() => {
                                if (dialogs.dialogState.onConfirm) dialogs.dialogState.onConfirm();
                                dialogs.closeDialog();
                            }}
                            onClose={dialogs.closeDialog}
                        />
                    )}
                </ErrorBoundary>
            </div>
        </DSPEditorProvider>
    );
}

export default App;
