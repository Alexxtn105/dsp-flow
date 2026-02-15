import { createRoot } from 'react-dom/client';
import App from './App';

import './styles/index.css';

const container = document.querySelector('#app');
const root = createRoot(container);

root.render(<App />);
