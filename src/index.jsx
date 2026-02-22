import { createRoot } from 'react-dom/client';
import initPlugins from './engine/initPlugins.js';
import App from './App';

import './styles/index.css';

initPlugins();

const container = document.querySelector('#app');
const root = createRoot(container);

root.render(<App />);
