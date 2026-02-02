//import { useState } from 'prop-types';
import { useState } from 'react';
import PropTypes from 'prop-types';
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
                <h2>Блоки DSP</h2>
                <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
                    {isCollapsed ? '▶' : '◀'}
                </button>
            </div>

            {!isCollapsed && (
                <div className="toolbar-content">
                    {DSP_GROUPS.map((group) => (
                        <div key={group.id} className="group-container">
                            <div className="group-header" onClick={() => toggleGroup(group.id)}>
                                <span>{group.name}</span>
                                <span>{collapsedGroups[group.id] ? '▶' : '▼'}</span>
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
