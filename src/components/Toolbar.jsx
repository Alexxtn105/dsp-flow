import { useState } from 'react';
import './Toolbar.css';

const DSP_GROUPS = [
    {
        id: 'filters',
        name: 'Фильтры',
        collapsed: false,
        blocks: [
            {
                id: 'fir-filter',
                name: 'КИХ-Фильтр',
                icon: '⚡',
                description: 'КИХ-фильтр (FIR)',
            },
            {
                id: 'bandpass-fir-filter',
                name: 'Полосовой КИХ-фильтр',
                icon: '🎛️',
                description: 'Полосовой КИХ-фильтр',
            },
            {
                id: 'highpass-fir-filter',
                name: 'ФВЧ КИХ-фильтр',
                icon: '📈',
                description: 'ФВЧ КИХ-фильтр',
            },
            {
                id: 'lowpass-fir-filter',
                name: 'ФНЧ КИХ-фильтр',
                icon: '📉',
                description: 'ФНЧ КИХ-фильтр',
            },
            {
                id: 'hilbert-transformer',
                name: 'Преобразователь Гильберта',
                icon: '🌀',
                description: 'Преобразователь Гильберта',
            },
            {
                id: 'goertzel-filter',
                name: 'Фильтр Герцеля',
                icon: '🔍',
                description: 'Фильтр Герцеля',
            },
        ]
    },
    {
        id: 'generators',
        name: 'Генераторы',
        collapsed: false,
        blocks: [
            {
                id: 'input-signal',
                name: 'Входной сигнал',
                icon: '〰️',
                description: 'Генератор входного сигнала',
            },
            {
                id: 'ref-sine-generator',
                name: 'Референсный синусный генератор',
                icon: '📐',
                description: 'Управляемый референсный синусный генератор',
            },
            {
                id: 'ref-cosine-generator',
                name: 'Референсный косинусный генератор',
                icon: '📏',
                description: 'Управляемый референсный косинусный генератор',
            },
        ]
    },
    {
        id: 'fft-blocks',
        name: 'БПФ/Анализ',
        collapsed: false,
        blocks: [
            {
                id: 'sliding-fft',
                name: 'Скользящее БПФ',
                icon: '🌀',
                description: 'Скользящее БПФ',
            },
            {
                id: 'fft',
                name: 'БПФ',
                icon: '⚡',
                description: 'БПФ (размер кратен степени двойки)',
            },
            {
                id: 'spectrum-analyzer',
                name: 'Спектроанализатор',
                icon: '📊',
                description: 'Спектральный анализ',
            },
        ]
    },
    {
        id: 'detectors',
        name: 'Детекторы',
        collapsed: false,
        blocks: [
            {
                id: 'phase-detector',
                name: 'Фазовый детектор',
                icon: '📐',
                description: 'Фазовый детектор',
            },
            {
                id: 'frequency-detector',
                name: 'Частотный детектор',
                icon: '📏',
                description: 'Частотный детектор',
            },
        ]
    },
    {
        id: 'math-blocks',
        name: 'Математические',
        collapsed: false,
        blocks: [
            {
                id: 'integrator',
                name: 'Интегратор',
                icon: '∫',
                description: 'Интегратор',
            },
            {
                id: 'summer',
                name: 'Сумматор',
                icon: '➕',
                description: 'Сумматор',
            },
            {
                id: 'multiplier',
                name: 'Перемножитель',
                icon: '✖️',
                description: 'Перемножитель',
            },
        ]
    },
    {
        id: 'visualization',
        name: 'Визуализация',
        collapsed: false,
        blocks: [
            {
                id: 'oscilloscope',
                name: 'Осциллограф',
                icon: '📊',
                description: 'Визуализация сигнала',
            },
            {
                id: 'constellation',
                name: 'Фазовое созвездие',
                icon: '⭐',
                description: 'Фазовое созвездие',
            },
        ]
    }
];

function Toolbar({ isDarkTheme }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState({
        filters: false,
        generators: false,
        'fft-blocks': false,
        detectors: false,
        'math-blocks': false,
        visualization: false
    });

    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const toggleGroup = (groupId) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    return (
        <div className={`toolbar ${isCollapsed ? 'collapsed' : ''} ${isDarkTheme ? 'dark-theme' : ''}`}>
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
                    <div className="groups-list">
                        {DSP_GROUPS.map((group) => (
                            <div key={group.id} className="group-container">
                                <div
                                    className="group-header"
                                    onClick={() => toggleGroup(group.id)}
                                >
                                    <span className="group-name">{group.name}</span>
                                    <span className="group-toggle">
                    {collapsedGroups[group.id] ? '▶' : '▼'}
                  </span>
                                </div>

                                {!collapsedGroups[group.id] && (
                                    <div className="group-blocks">
                                        {group.blocks.map((block) => (
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
                                )}
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