import { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../common/Icons/Icon.jsx';
import { DSP_GROUPS } from '../../../utils/index.js';
import './Toolbar.css';

function Toolbar({ isDarkTheme }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState({});
    const [, setDraggingBlock] = useState(null);

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
                <div className="toolbar-content">
                    {DSP_GROUPS && DSP_GROUPS.map((group) => (
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
                                    {group.blocks && group.blocks.map((block) => (
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
                    {DSP_GROUPS.flatMap(group => group.blocks).map((block) => (
                        <div
                            key={block.id}
                            className="block-item"
                            draggable
                            onDragStart={(e) => onDragStart(e, block.name)}
                            onDragEnd={onDragEnd}
                            title={`${block.name}: ${block.description}`}
                        >
                            <Icon
                                name={block.icon}
                                size="medium"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

Toolbar.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired
};

export default Toolbar;