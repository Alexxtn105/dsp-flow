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

    const totalBlocks = groups.reduce((sum, g) => sum + g.blocks.length, 0);
    const allGroupIds = groups.map(g => g.id);
    const allCollapsed = allGroupIds.length > 0 && allGroupIds.every(id => collapsedGroups[id]);
    const allExpanded = allGroupIds.length > 0 && allGroupIds.every(id => !collapsedGroups[id]);

    const collapseAll = () => {
        const collapsed = {};
        allGroupIds.forEach(id => { collapsed[id] = true; });
        setCollapsedGroups(collapsed);
    };

    const expandAll = () => {
        setCollapsedGroups({});
    };

    const onDragStart = (event, blockName) => {
        event.dataTransfer.setData('application/reactflow', blockName);
        event.dataTransfer.effectAllowed = 'move';
        setDraggingBlock(blockName);
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
        <div className={`tb ${isCollapsed ? 'tb-collapsed' : ''} ${isDarkTheme ? 'dark-theme' : ''}`}>
            {/* Header */}
            <div className="tb-header">
                {!isCollapsed && (
                    <div className="tb-header-info">
                        <span className="tb-header-title">Блоки</span>
                        <span className="tb-header-count">{totalBlocks}</span>
                    </div>
                )}
                <button
                    className="tb-collapse-btn"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? 'Развернуть' : 'Свернуть'}
                    aria-label={isCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
                >
                    <Icon
                        name={isCollapsed ? 'chevron_right' : 'chevron_left'}
                        size="small"
                    />
                </button>
            </div>

            {/* Search */}
            {!isCollapsed && (
                <div className="tb-search">
                    <Icon name="search" size="small" className="tb-search-icon" aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="tb-search-input"
                        aria-label="Поиск блоков"
                    />
                    {searchQuery && (
                        <button
                            className="tb-search-clear"
                            onClick={() => setSearchQuery('')}
                            title="Очистить"
                            aria-label="Очистить поиск"
                        >
                            <Icon name="close" size="small" aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}

            {/* Collapse/Expand All */}
            {!isCollapsed && filteredGroups.length > 1 && (
                <div className="tb-group-actions">
                    <button
                        className={`tb-group-action-btn ${allExpanded ? 'active' : ''}`}
                        onClick={expandAll}
                        disabled={allExpanded}
                        title="Развернуть все группы"
                        aria-label="Развернуть все группы"
                    >
                        <Icon name="unfold_more" size="small" aria-hidden="true" />
                        <span>Развернуть</span>
                    </button>
                    <button
                        className={`tb-group-action-btn ${allCollapsed ? 'active' : ''}`}
                        onClick={collapseAll}
                        disabled={allCollapsed}
                        title="Свернуть все группы"
                        aria-label="Свернуть все группы"
                    >
                        <Icon name="unfold_less" size="small" aria-hidden="true" />
                        <span>Свернуть</span>
                    </button>
                </div>
            )}

            {/* Content */}
            {!isCollapsed && (
                <div className="tb-content">
                    {filteredGroups.length === 0 && (
                        <div className="tb-empty">Ничего не найдено</div>
                    )}
                    {filteredGroups.map((group) => (
                        <div key={group.id} className="tb-group">
                            <div
                                className="tb-group-header"
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
                                <span className="tb-group-name">{group.name}</span>
                                <span className="tb-group-badge">{group.blocks.length}</span>
                                <Icon
                                    name={collapsedGroups[group.id] ? 'expand_more' : 'expand_less'}
                                    size="small"
                                    className="tb-group-chevron"
                                    aria-hidden="true"
                                />
                            </div>
                            {!collapsedGroups[group.id] && (
                                <div
                                    className="tb-group-blocks"
                                    id={`group-${group.id}`}
                                    role="region"
                                    aria-label={`Блоки: ${group.name}`}
                                >
                                    {group.blocks.map((block) => (
                                        <div
                                            key={block.id}
                                            className="tb-block"
                                            draggable
                                            onDragStart={(e) => onDragStart(e, block.name)}
                                            onDragEnd={onDragEnd}
                                            title={block.description}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`Добавить блок ${block.name}. ${block.description}`}
                                        >
                                            <div className="tb-block-icon">
                                                <Icon name={block.icon} size="medium" aria-hidden="true" />
                                            </div>
                                            <div className="tb-block-info">
                                                <span className="tb-block-name">{block.name}</span>
                                                {block.description && (
                                                    <span className="tb-block-desc">{block.description}</span>
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

            {/* Collapsed: icon-only blocks */}
            {isCollapsed && (
                <div className="tb-content tb-content-icons">
                    {groups.flatMap(group => group.blocks).map((block) => (
                        <div
                            key={block.id}
                            className="tb-block-mini"
                            draggable
                            onDragStart={(e) => onDragStart(e, block.name)}
                            onDragEnd={onDragEnd}
                            title={`${block.name}: ${block.description}`}
                            role="button"
                            tabIndex={0}
                            aria-label={`Добавить блок ${block.name}`}
                        >
                            <Icon name={block.icon} size="medium" aria-hidden="true" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Toolbar;
