import { useState } from 'react';
import './Toolbar.css';

const DSP_BLOCKS = [
    {
        id: 'input-signal',
        name: 'Входной сигнал',
        icon: '〰️',
        description: 'Генератор входного сигнала',
    },
    {
        id: 'fir-filter',
        name: 'КИХ-Фильтр',
        icon: '⚡',
        description: 'КИХ-фильтр (FIR)',
    },
    {
        id: 'oscilloscope',
        name: 'Осциллограф',
        icon: '📊',
        description: 'Визуализация сигнала',
    },
];

function Toolbar() {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className={`toolbar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="toolbar-header">
                <h2>Блоки DSP</h2>
                <button 
                    className="collapse-btn"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? '▶' : '◀'}
                </button>
            </div>
            
            {!isCollapsed && (
                <div className="toolbar-content">
                    <div className="blocks-list">
                        {DSP_BLOCKS.map((block) => (
                            <div
                                key={block.id}
                                className="block-item"
                                draggable
                                onDragStart={(e) => onDragStart(e, block.name)}
                            >
                                <span className="block-icon">{block.icon}</span>
                                <div className="block-info">
                                    <div className="block-name">{block.name}</div>
                                    <div className="block-description">{block.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="toolbar-hint">
                        💡 Перетащите блок на холст для добавления
                    </div>
                </div>
            )}
        </div>
    );
}

export default Toolbar;
