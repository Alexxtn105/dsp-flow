import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Icon from '../../common/Icons/Icon.jsx';
import BlockHelpDialog from '../../dialogs/BlockHelpDialog/BlockHelpDialog.jsx';
import registry from '../../../engine/PluginRegistry';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { useTouchContext } from '../../../contexts/TouchContext';
import './Toolbar.css';

function Toolbar({ onAddBlock }) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation();
    const isTouch = useTouchContext();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [legendOpen, setLegendOpen] = useState(false);
    const legendRef = useRef(null);
    const [collapsedGroups, setCollapsedGroups] = useState(() => {
        const initial = {};
        registry.getGroups().forEach(g => { initial[g.id] = true; });
        return initial;
    });
    const [, setDraggingBlock] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [helpBlock, setHelpBlock] = useState(null);

    // Close legend on outside click
    useEffect(() => {
        if (!legendOpen) return;
        const handleClick = (e) => {
            if (legendRef.current && !legendRef.current.contains(e.target)) {
                setLegendOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [legendOpen]);

    const groups = registry.getGroups();

    // Translate block/group names for display and search
    const blockDisplayName = (blockId) => t(blockId, { ns: 'blocks' });
    const groupDisplayName = (groupId) => t(groupId, { ns: 'groups' });

    const query = searchQuery.trim().toLowerCase();
    const filteredGroups = query
        ? groups
            .map(group => ({
                ...group,
                blocks: group.blocks.filter(block =>
                    blockDisplayName(block.name).toLowerCase().includes(query) ||
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

    const onDragStart = (event, blockId) => {
        event.dataTransfer.setData('application/reactflow', blockId);
        event.dataTransfer.effectAllowed = 'move';
        setDraggingBlock(blockId);
        event.currentTarget.classList.add('dragging');
    };

    const onDragEnd = () => {
        setDraggingBlock(null);
        const draggingElements = document.querySelectorAll('.dragging');
        draggingElements.forEach(el => el.classList.remove('dragging'));
    };

    // Touch: tap-to-add block to canvas center
    const handleTouchAdd = useCallback((event, blockId) => {
        event.preventDefault();
        event.stopPropagation();
        const el = event.currentTarget;
        el.classList.remove('touch-added');
        // Force reflow to restart animation
        void el.offsetWidth;
        el.classList.add('touch-added');
        el.addEventListener('animationend', () => el.classList.remove('touch-added'), { once: true });
        if (onAddBlock) onAddBlock(blockId);
    }, [onAddBlock]);

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
                        <span className="tb-header-title">{t('toolbar.blocks')}</span>
                        <span className="tb-header-count">{totalBlocks}</span>
                    </div>
                )}
                <button
                    className="tb-collapse-btn"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? t('toolbar.expand') : t('toolbar.collapse')}
                    aria-label={isCollapsed ? t('toolbar.expandPanel') : t('toolbar.collapsePanel')}
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
                        placeholder={t('toolbar.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="tb-search-input"
                        aria-label={t('toolbar.searchBlocks')}
                    />
                    {searchQuery && (
                        <button
                            className="tb-search-clear"
                            onClick={() => setSearchQuery('')}
                            title={t('toolbar.clearSearch')}
                            aria-label={t('toolbar.clearSearchLabel')}
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
                        title={t('toolbar.expandAllGroups')}
                        aria-label={t('toolbar.expandAllGroups')}
                    >
                        <Icon name="unfold_more" size="small" aria-hidden="true" />
                        <span>{t('toolbar.expand')}</span>
                    </button>
                    <button
                        className={`tb-group-action-btn ${allCollapsed ? 'active' : ''}`}
                        onClick={collapseAll}
                        disabled={allCollapsed}
                        title={t('toolbar.collapseAllGroups')}
                        aria-label={t('toolbar.collapseAllGroups')}
                    >
                        <Icon name="unfold_less" size="small" aria-hidden="true" />
                        <span>{t('toolbar.collapse')}</span>
                    </button>
                </div>
            )}

            {/* Content */}
            {!isCollapsed && (
                <div className="tb-content">
                    {filteredGroups.length === 0 && (
                        <div className="tb-empty">{t('toolbar.nothingFound')}</div>
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
                                <span className="tb-group-name">{groupDisplayName(group.id)}</span>
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
                                    aria-label={t('toolbar.blocksGroup', { name: groupDisplayName(group.id) })}
                                >
                                    {group.blocks.map((block) => {
                                        const displayName = blockDisplayName(block.name);
                                        return (
                                            <div
                                                key={block.id}
                                                className="tb-block"
                                                draggable={!isTouch}
                                                onDragStart={isTouch ? undefined : (e) => onDragStart(e, block.name)}
                                                onDragEnd={isTouch ? undefined : onDragEnd}
                                                onClick={isTouch ? (e) => handleTouchAdd(e, block.name) : undefined}
                                                title={displayName}
                                                role="button"
                                                tabIndex={0}
                                                aria-label={t('toolbar.addBlockNamed', { name: displayName, description: '' })}
                                            >
                                                <div className="tb-block-icon">
                                                    <Icon name={block.icon} size="medium" aria-hidden="true" />
                                                </div>
                                                <div className="tb-block-info">
                                                    <span className="tb-block-name">{displayName}</span>
                                                </div>
                                                <button
                                                    className="tb-block-help-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setHelpBlock({ ...block, displayName });
                                                    }}
                                                    draggable={false}
                                                    title={t('toolbar.help')}
                                                    aria-label={t('toolbar.helpForBlock', { name: displayName })}
                                                >
                                                    <Icon name="help_outline" size="small" aria-hidden="true" />
                                                </button>
                                            </div>
                                        );
                                    })}
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
                            draggable={!isTouch}
                            onDragStart={isTouch ? undefined : (e) => onDragStart(e, block.name)}
                            onDragEnd={isTouch ? undefined : onDragEnd}
                            onClick={isTouch ? (e) => handleTouchAdd(e, block.name) : undefined}
                            title={blockDisplayName(block.name)}
                            role="button"
                            tabIndex={0}
                            aria-label={t('toolbar.addBlock') + ' ' + blockDisplayName(block.name)}
                        >
                            <Icon name={block.icon} size="medium" aria-hidden="true" />
                        </div>
                    ))}
                </div>
            )}
            {/* Signal Legend (bottom) */}
            <div className="tb-legend-wrapper" ref={legendRef}>
                <button
                    className={`tb-legend-btn ${legendOpen ? 'active' : ''}`}
                    onClick={() => setLegendOpen(!legendOpen)}
                    title={t('header.signalLegend')}
                >
                    <span className="material-icons" style={{ fontSize: 16 }}>legend_toggle</span>
                    {!isCollapsed && <span className="tb-legend-text">{t('header.signals')}</span>}
                </button>
                {legendOpen && (
                    <div className="tb-legend-panel">
                        <div className="tb-legend-item">
                            <svg width="32" height="2">
                                <line x1="0" y1="1" x2="32" y2="1"
                                    stroke="var(--signal-real, #3b82f6)" strokeWidth="2" strokeDasharray="5,3" />
                            </svg>
                            <span className="tb-legend-label">Real</span>
                        </div>
                        <div className="tb-legend-item">
                            <svg width="32" height="6">
                                <line x1="0" y1="1" x2="32" y2="1"
                                    stroke="var(--signal-complex, #8b5cf6)" strokeWidth="2" strokeDasharray="5,3" />
                                <line x1="0" y1="5" x2="32" y2="5"
                                    stroke="var(--signal-complex, #8b5cf6)" strokeWidth="2" strokeDasharray="5,3" />
                            </svg>
                            <span className="tb-legend-label">Complex</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Help Dialog */}
            {helpBlock && (
                <BlockHelpDialog
                    blockId={helpBlock.id}
                    blockName={helpBlock.displayName || blockDisplayName(helpBlock.name)}
                    blockIcon={helpBlock.icon}
                    onClose={() => setHelpBlock(null)}
                />
            )}
        </div>
    );
}

Toolbar.propTypes = {
    onAddBlock: PropTypes.func,
};

export default Toolbar;
