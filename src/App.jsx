import { useState, useCallback } from 'react';
import { useTheme } from './hooks/useTheme';
import { DSPEditorProvider } from './contexts/DSPEditorContext';
import Header from './components/layout/Header';
import ControlToolbar from './components/layout/ControlToolbar/ControlToolbar.jsx'; // Новый импорт
import DSPEditor from './components/dsp/DSPEditor';
import Footer from './components/layout/Footer';
import SaveDialog from './components/dialogs/SaveDialog';
import LoadDialog from './components/dialogs/LoadDialog';
import './App.css';

function App() {
    const { isDarkTheme, toggleTheme } = useTheme();
    const [reactFlowInstance, setReactFlowInstance] = useState(null);

    // Состояние текущей схемы
    const [currentScheme, setCurrentScheme] = useState({
        name: 'not_saved',
        isSaved: true // true потому что новый проект пустой
    });

    // Состояния диалогов
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);

    // Статистика схемы
    const [stats, setStats] = useState({
        nodesCount: 0,
        connectionsCount: 0
    });

    // Состояние симуляции
    const [isRunning, setIsRunning] = useState(false);

    /**
     * Обновление информации о схеме
     */
    const handleSchemeUpdate = useCallback((schemeName, isSaved = true) => {
        setCurrentScheme({
            name: schemeName,
            isSaved
        });
    }, []);

    /**
     * Обновление статистики
     */
    const handleStatsUpdate = useCallback((newStats) => {
        setStats(newStats);
    }, []);

    /**
     * Обработчик сохранения
     */
    const handleSave = useCallback(() => {
        if (currentScheme.name === 'not_saved') {
            // Если схема ещё не сохранялась - показываем "Сохранить как"
            setShowSaveAsDialog(true);
        } else {
            // Если схема уже есть - сохраняем поверх
            setShowSaveDialog(true);
        }
    }, [currentScheme.name]);

    /**
     * Обработчик успешного сохранения
     */
    const handleSaveSuccess = useCallback((schemeName) => {
        handleSchemeUpdate(schemeName, true);
        setShowSaveDialog(false);
        setShowSaveAsDialog(false);
    }, [handleSchemeUpdate]);

    /**
     * Обработчик успешной загрузки
     */
    const handleLoadSuccess = useCallback((schemeName) => {
        handleSchemeUpdate(schemeName, true);
        setShowLoadDialog(false);
    }, [handleSchemeUpdate]);

    /**
     * Запуск симуляции
     */
    const handleStartSimulation = useCallback(() => {
        if (stats.nodesCount === 0) {
            alert('Добавьте хотя бы один узел для запуска симуляции');
            return;
        }

        if (stats.connectionsCount === 0) {
            alert('Соедините узлы для запуска симуляции');
            return;
        }

        setIsRunning(true);
        console.log('Запуск симуляции схемы...');
        // TODO: Добавить логику запуска симуляции (будет в backend)
    }, [stats]);

    /**
     * Остановка симуляции
     */
    const handleStopSimulation = useCallback(() => {
        setIsRunning(false);
        console.log('Остановка симуляции...');
        // TODO: Добавить логику остановки симуляции (будет в backend)
    }, []);

    // Условия активности кнопок
    const isSaveEnabled = true; // Всегда доступна
    const isSaveAsEnabled = true; // Всегда доступна

    return (
        <DSPEditorProvider reactFlowInstance={reactFlowInstance}>
            <div className={`app ${isDarkTheme ? 'dark-theme' : ''}`}>
                <Header
                    currentScheme={currentScheme}



                />

                <div className="app-content">
                    <ControlToolbar
                        isDarkTheme={isDarkTheme}
                        toggleTheme={toggleTheme}
                        onSave={handleSave}
                        onSaveAs={() => setShowSaveAsDialog(true)}
                        onLoad={() => setShowLoadDialog(true)}
                        isSaveEnabled={isSaveEnabled}
                        isSaveAsEnabled={isSaveAsEnabled}
                    />

                    <DSPEditor
                        isDarkTheme={isDarkTheme}
                        currentScheme={currentScheme}
                        onSchemeUpdate={handleSchemeUpdate}
                        onStatsUpdate={handleStatsUpdate}
                        onReactFlowInit={setReactFlowInstance}
                    />
                </div>

                <Footer
                    isDarkTheme={isDarkTheme}
                    onStart={handleStartSimulation}
                    onStop={handleStopSimulation}
                    isRunning={isRunning}
                    nodesCount={stats.nodesCount}
                    connectionsCount={stats.connectionsCount}
                />

                {/* Диалог сохранения */}
                {showSaveDialog && (
                    <SaveDialog
                        isDarkTheme={isDarkTheme}
                        onClose={() => setShowSaveDialog(false)}
                        schemeName={currentScheme.name}
                        onSaveSuccess={handleSaveSuccess}
                        mode="save"
                    />
                )}

                {/* Диалог "Сохранить как" */}
                {showSaveAsDialog && (
                    <SaveDialog
                        isDarkTheme={isDarkTheme}
                        onClose={() => setShowSaveAsDialog(false)}
                        schemeName={currentScheme.name}
                        onSaveSuccess={handleSaveSuccess}
                        mode="saveAs"
                    />
                )}

                {/* Диалог загрузки */}
                {showLoadDialog && (
                    <LoadDialog
                        isDarkTheme={isDarkTheme}
                        onClose={() => setShowLoadDialog(false)}
                        onLoadSuccess={handleLoadSuccess}
                    />
                )}
            </div>
        </DSPEditorProvider>
    );
}

export default App;