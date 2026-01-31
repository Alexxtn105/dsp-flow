import DSPEditor from './DSPEditor';
import './App.css';

function App() {
    return (
        <div className="app">
            <header className="app-header">
                <h1>🎛️ DSP Flow Editor</h1>
                <p>Редактор схем цифровой обработки сигналов</p>
            </header>
            <DSPEditor />
        </div>
    );
}

export default App;
