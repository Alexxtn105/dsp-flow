import { useState, useEffect } from 'react';
import DSPEditor from './DSPEditor';
import './App.css';

function App() {
    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        // Загружаем тему из localStorage при инициализации
        const savedTheme = localStorage.getItem('dsp-theme');
        return savedTheme === 'dark';
    });

    useEffect(() => {
        // Сохраняем тему в localStorage при изменении
        localStorage.setItem('dsp-theme', isDarkTheme ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
    }, [isDarkTheme]);

    const toggleTheme = () => {
        setIsDarkTheme(!isDarkTheme);
    };

    return (
        <div className={`app ${isDarkTheme ? 'dark-theme' : ''}`}>
            <header className="app-header">
                <div className="app-header-content">
                    <h1>🎛️ DSP Flow Editor</h1>
                    {/*<p>Редактор схем цифровой обработки сигналов</p>*/}
                </div>
                <button className="theme-toggle" onClick={toggleTheme}>
                    {isDarkTheme ? '☀️ Светлая тема' : '🌙 Темная тема'}
                </button>
            </header>
            <DSPEditor isDarkTheme={isDarkTheme} />
        </div>
    );
}

export default App;