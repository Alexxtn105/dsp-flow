import { createRoot } from 'react-dom/client';
import initPlugins from './engine/initPlugins.js';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App';

import './locales/i18n.js';
import './styles/index.css';

try {
    initPlugins();
} catch (error) {
    console.error('Ошибка инициализации плагинов:', error);
    document.querySelector('#app').textContent =
        'Ошибка инициализации приложения. Перезагрузите страницу.';
    throw error;
}

const container = document.querySelector('#app');
const root = createRoot(container);

root.render(
    <ThemeProvider>
        <App />
    </ThemeProvider>
);
