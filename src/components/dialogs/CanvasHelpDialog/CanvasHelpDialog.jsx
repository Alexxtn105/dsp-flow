import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './CanvasHelpDialog.css';

function CanvasHelpDialog({ onClose }) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation();
    const h = (key) => t(`canvasHelp.${key}`);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const shortcuts = [
        {
            section: h('sectionCanvas'),
            items: [
                { label: h('pan'), kbd: 'Drag / Shift+Drag', desc: h('panDesc') },
                { label: h('zoom'), kbd: 'Wheel / Pinch', desc: h('zoomDesc') },
                { label: h('fitView'), kbd: 'Double-click', desc: h('fitViewDesc') },
            ]
        },
        {
            section: h('sectionBlocks'),
            items: [
                { label: h('addBlock'), kbd: 'Drag & Drop', desc: h('addBlockDesc') },
                { label: h('selectBlock'), kbd: 'Click', desc: h('selectBlockDesc') },
                { label: h('multiSelect'), kbd: 'Shift+Click / Box', desc: h('multiSelectDesc') },
                { label: h('selectAll'), kbd: 'Ctrl+A', desc: h('selectAllDesc') },
                { label: h('moveBlock'), kbd: 'Drag', desc: h('moveBlockDesc') },
                { label: h('deleteBlock'), kbd: 'Delete / Backspace', desc: h('deleteBlockDesc') },
                { label: h('copyPaste'), kbd: 'Ctrl+C / Ctrl+V', desc: h('copyPasteDesc') },
                { label: h('undo'), kbd: 'Ctrl+Z / Ctrl+Shift+Z', desc: h('undoDesc') },
                { label: h('editParams'), kbd: 'Click gear / Dbl-click', desc: h('editParamsDesc') },
            ]
        },
        {
            section: h('sectionConnections'),
            items: [
                { label: h('createConnection'), kbd: 'Drag port → port', desc: h('createConnectionDesc') },
                { label: h('deleteConnection'), kbd: 'Click + Delete', desc: h('deleteConnectionDesc') },
            ]
        },
        {
            section: h('sectionSignals'),
            items: [
                { label: h('realSignal'), kbd: null, desc: h('realSignalDesc'), signal: 'real' },
                { label: h('complexSignal'), kbd: null, desc: h('complexSignalDesc'), signal: 'complex' },
                { label: h('typeRule'), kbd: null, desc: h('typeRuleDesc') },
            ]
        },
    ];

    return createPortal(
        <div
            className={`canvas-help-backdrop ${isDarkTheme ? 'dark-theme' : ''}`}
            onMouseDown={handleBackdrop}
        >
            <div className="canvas-help-dialog">
                <div className="canvas-help-header">
                    <span className="canvas-help-title">{h('title')}</span>
                    <button className="canvas-help-close" onClick={onClose} type="button">&times;</button>
                </div>
                <div className="canvas-help-body">
                    {shortcuts.map((group) => (
                        <div key={group.section} className="canvas-help-section">
                            <div className="canvas-help-section-title">{group.section}</div>
                            {group.items.map((item) => (
                                <div key={item.label} className="canvas-help-row">
                                    <div className="canvas-help-action">
                                        {item.signal && (
                                            <span className={`canvas-help-signal-dot signal-${item.signal}`} />
                                        )}
                                        <span className="canvas-help-label">{item.label}</span>
                                    </div>
                                    {item.kbd && <kbd className="canvas-help-kbd">{item.kbd}</kbd>}
                                    <div className="canvas-help-desc">{item.desc}</div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}

export default CanvasHelpDialog;
