import { useState, useEffect } from 'react';
import DSPEditor from './DSPEditor';
import SaveDialog from './components/SaveDialog';
import LoadDialog from './components/LoadDialog';
import './App.css';

function App() {
    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        const savedTheme = localStorage.getItem('dsp-theme');
        return savedTheme === 'dark';
    });

    const [currentScheme, setCurrentScheme] = useState({
        name: 'not_saved',
        isSaved: false
    });

    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [hasNodes, setHasNodes] = useState(false);

    useEffect(() => {
        localStorage.setItem('dsp-theme', isDarkTheme ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');

        if (isDarkTheme) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }, [isDarkTheme]);

    const toggleTheme = () => {
        setIsDarkTheme(!isDarkTheme);
    };

    const handleSave = () => {
        if (currentScheme.name === 'not_saved') {
            setShowSaveAsDialog(true);
        } else {
            setShowSaveDialog(true);
        }
    };

    const handleSchemeUpdate = (schemeName, isSaved = true) => {
        setCurrentScheme({
            name: schemeName,
            isSaved
        });
    };

    const handleLoad = () => {
        setShowLoadDialog(true);
    };

    const handleNodesUpdate = (hasNodes) => {
        setHasNodes(hasNodes);
    };

    const isSaveEnabled = currentScheme.name !== 'not_saved' && currentScheme.isSaved;
    const isSaveAsEnabled = hasNodes;

    return (
        <div className={`app ${isDarkTheme ? 'dark-theme' : ''}`}>
            <header className="app-header">
                <div className="app-header-left">
                    <h1>🎛️ DSP Flow Editor</h1>
                    <p>Редактор схем цифровой обработки сигналов</p>
                </div>

                <div className="app-header-center">
                    <div className="current-scheme-info">
                        <div className="scheme-name" title={currentScheme.name}>
                            {currentScheme.name}
                        </div>
                        {!currentScheme.isSaved && currentScheme.name !== 'not_saved' && (
                            <div className="scheme-unsaved">
                                (не сохранено)
                            </div>
                        )}
                    </div>
                </div>

                <div className="app-header-right">
                    <div className="header-controls">
                        <button
                            className="header-btn save"
                            onClick={handleSave}
                            title={isSaveEnabled ? "Сохранить текущую схему" : "Сначала сохраните схему как..."}
                            disabled={!isSaveEnabled}
                        >
                            💾 Сохранить
                        </button>

                        <button
                            className="header-btn save-as"
                            onClick={() => setShowSaveAsDialog(true)}
                            title="Сохранить под новым именем"
                            disabled={!isSaveAsEnabled}
                        >
                            📝 Сохранить как
                        </button>

                        <button
                            className="header-btn load"
                            onClick={handleLoad}
                            title="Загрузить сохраненную схему"
                        >
                            📂 Загрузить
                        </button>
                    </div>

                    <button className="theme-toggle" onClick={toggleTheme}>
                        {isDarkTheme ? '☀️ Светлая тема' : '🌙 Темная тема'}
                    </button>
                </div>
            </header>

            <DSPEditor
                isDarkTheme={isDarkTheme}
                currentScheme={currentScheme}
                onSchemeUpdate={handleSchemeUpdate}
                onNodesUpdate={handleNodesUpdate}
            />

            {showSaveDialog && (
                <SaveDialog
                    isDarkTheme={isDarkTheme}
                    onClose={() => setShowSaveDialog(false)}
                    schemeName={currentScheme.name}
                    onSaveSuccess={(newName) => {
                        handleSchemeUpdate(newName, true);
                        setShowSaveDialog(false);
                    }}
                    mode="save"
                />
            )}

            {showSaveAsDialog && (
                <SaveDialog
                    isDarkTheme={isDarkTheme}
                    onClose={() => setShowSaveAsDialog(false)}
                    schemeName={currentScheme.name}
                    onSaveSuccess={(newName) => {
                        handleSchemeUpdate(newName, true);
                        setShowSaveAsDialog(false);
                    }}
                    mode="saveAs"
                />
            )}

            {showLoadDialog && (
                <LoadDialog
                    isDarkTheme={isDarkTheme}
                    onClose={() => setShowLoadDialog(false)}
                    onLoadSuccess={(schemeName) => {
                        handleSchemeUpdate(schemeName, true);
                        setShowLoadDialog(false);
                    }}
                />
            )}
        </div>
    );
}

export default App;