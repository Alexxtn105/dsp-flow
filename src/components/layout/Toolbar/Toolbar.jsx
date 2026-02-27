import { useState } from 'react';
import Icon from '../../common/Icons/Icon.jsx';
import registry from '../../../engine/PluginRegistry';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './Toolbar.css';

function Toolbar() {
    const { isDarkTheme } = useThemeContext();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState({});
    const [, setDraggingBlock] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const groups = registry.getGroups();

    const query = searchQuery.trim().toLowerCase();
    const filteredGroups = query
        ? groups
            .map(group => ({
                ...group,
                blocks: group.blocks.filter(block =>
                    block.name.toLowerCase().includes(query) ||
                    (block.description && block.description.toLowerCase().includes(query))
                )
            }))
            .filter(group => group.blocks.length > 0)
        : groups;

    const onDragStart = (event, blockName) => {
        event.dataTransfer.setData('application/reactflow', blockName);
        event.dataTransfer.effectAllowed = 'move';
        setDraggingBlock(blockName);

        // Добавляем визуальную обратную связь
        event.currentTarget.classList.add('dragging');
    };

    const onDragEnd = () => {
        setDraggingBlock(null);
        const draggingElements = document.querySelectorAll('.dragging');
        draggingElements.forEach(el => el.classList.remove('dragging'));
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
                {!isCollapsed && (
                    <div className="toolbar-header-content">
                        <Icon
                            name="tune"
                            size="large"
                            className="toolbar-icon"
                            title="Библиотека блоков DSP"
                        />
                        <h2 className="toolbar-title">Библиотека блоков</h2>
                    </div>
                )}
                <button
                    className="collapse-btn"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Развернуть панель" : "Свернуть панель"}
                    aria-label={isCollapsed ? "Развернуть панель" : "Свернуть панель"}
                >
                    <Icon
                        name={isCollapsed ? 'chevron_right' : 'chevron_left'}
                        size="medium"
                    />
                </button>
            </div>

            {!isCollapsed && (
                <div className="toolbar-search">
                    <div className="toolbar-search-input-wrapper">
                        <Icon name="search" size="small" className="toolbar-search-icon" aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Поиск блоков..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Поиск блоков"
                        />
                        {searchQuery && (
                            <button
                                className="toolbar-search-clear"
                                onClick={() => setSearchQuery('')}
                                title="Очистить поиск"
                                aria-label="Очистить поиск"
                            >
                                <Icon name="close" size="small" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {!isCollapsed && (
                <div className="toolbar-content">
                    {filteredGroups.length === 0 && (
                        <div className="toolbar-no-results">Ничего не найдено</div>
                    )}
                    {filteredGroups.map((group) => (
                        <div
                            key={group.id}
                            className="group-container"
                        >
                            <div
                                className="group-header"
                                onClick={() => toggleGroup(group.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleGroup(group.id);
                                    }
                                }}
                                aria-expanded={!collapsedGroups[group.id]}
                                aria-controls={`group-${group.id}`}
                            >
                                <span>{group.name}</span>
                                <Icon
                                    name={collapsedGroups[group.id] ? 'expand_more' : 'expand_less'}
                                    size="small"
                                    aria-hidden="true"
                                />
                            </div>
                            {!collapsedGroups[group.id] && (
                                <div
                                    className="group-blocks"
                                    id={`group-${group.id}`}
                                    role="region"
                                    aria-label={`Блоки категории ${group.name}`}
                                >
                                    {group.blocks.map((block) => (
                                        <div
                                            key={block.id}
                                            className="block-item"
                                            draggable
                                            onDragStart={(e) => onDragStart(e, block.name)}
                                            onDragEnd={onDragEnd}
                                            title={block.description}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`Добавить блок ${block.name}. ${block.description}`}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    // Создаем событие drag для клавиатурного использования
                                                    const event = new Event('dragstart');
                                                    Object.defineProperty(event, 'dataTransfer', {
                                                        value: {
                                                            setData: () => {},
                                                            effectAllowed: 'move'
                                                        }
                                                    });
                                                    e.target.dispatchEvent(event);
                                                }
                                            }}
                                        >
                                            <div className="block-icon">
                                                <Icon
                                                    name={block.icon}
                                                    size="medium"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <div className="block-info">
                                                <div className="block-name">{block.name}</div>
                                                {block.description && (
                                                    <div className="block-description">{block.description}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isCollapsed && !collapsedGroups && (
                <div className="toolbar-content">
                    {groups.flatMap(group => group.blocks).map((block) => (
                        <div
                            key={block.id}
                            className="block-item"
                            draggable
                            onDragStart={(e) => onDragStart(e, block.name)}
                            onDragEnd={onDragEnd}
                            title={`${block.name}: ${block.description}`}
                            role="button"
                            tabIndex={0}
                            aria-label={`Добавить блок ${block.name}`}
                        >
                            <Icon
                                name={block.icon}
                                size="medium"
                                aria-hidden="true"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Toolbar;
