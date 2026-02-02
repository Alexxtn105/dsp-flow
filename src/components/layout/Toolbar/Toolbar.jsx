import { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../common/Icons/Icon.jsx';
import { DSP_GROUPS } from '../../../utils/constants';
import './Toolbar.css';

function Toolbar({ isDarkTheme }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const onDragStart = (event, blockName) => {
        event.dataTransfer.setData('application/reactflow', blockName);
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
                {!isCollapsed && (
                    <div className="toolbar-header-content">
                        <Icon name="tune" size="large" className="toolbar-icon" />
                        <h2 className="toolbar-title">Блоки DSP</h2>
                    </div>
                )}
                <button
                    className="collapse-btn"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Развернуть панель" : "Свернуть панель"}
                >
                    <Icon name={isCollapsed ? 'chevron_right' : 'chevron_left'} size="medium" />
                </button>
            </div>

            {!isCollapsed && (
                <div className="toolbar-content">
                    {DSP_GROUPS.map((group) => (
                        <div key={group.id} className="group-container">
                            <div className="group-header" onClick={() => toggleGroup(group.id)}>
                                <span>{group.name}</span>
                                <Icon
                                    name={collapsedGroups[group.id] ? 'expand_more' : 'expand_less'}
                                    size="small"
                                />
                            </div>
                            {!collapsedGroups[group.id] && (
                                <div className="group-blocks">
                                    {group.blocks.map((block) => (
                                        <div
                                            key={block.id}
                                            className="block-item"
                                            draggable
                                            onDragStart={(e) => onDragStart(e, block.name)}
                                            title={block.description}
                                        >
                                            <Icon
                                                name={block.icon}
                                                size="small"
                                                className="block-icon"
                                            />
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
        </div>
    );
}

Toolbar.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired
};

export default Toolbar;