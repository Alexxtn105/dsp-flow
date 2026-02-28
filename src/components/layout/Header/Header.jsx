import { useState } from 'react';
import PropTypes from 'prop-types';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './Header.css';

function Header({ currentScheme }) {
    const { isDarkTheme } = useThemeContext();
    const [legendOpen, setLegendOpen] = useState(false);

    const unsaved = !currentScheme.isSaved && currentScheme.name !== 'not_saved';

    return (
        <header className={`hdr ${isDarkTheme ? 'dark-theme' : ''}`}>
            {/* Left: branding */}
            <div className="hdr-brand">
                <span className="hdr-logo">DSP</span>
                <span className="hdr-title">Flow Editor</span>
            </div>

            {/* Center: scheme info */}
            <div className="hdr-center">
                <div className={`hdr-scheme ${unsaved ? 'hdr-scheme-unsaved' : ''}`}>
                    <span className="hdr-scheme-dot" />
                    <span className="hdr-scheme-name" title={currentScheme.name}>
                        {currentScheme.name === 'not_saved' ? 'Без имени' : currentScheme.name}
                    </span>
                    {unsaved && <span className="hdr-scheme-badge">изменено</span>}
                </div>
            </div>

            {/* Right: collapsible signal legend */}
            <div className="hdr-right">
                <button
                    className={`hdr-legend-btn ${legendOpen ? 'active' : ''}`}
                    onClick={() => setLegendOpen(!legendOpen)}
                    title="Легенда типов сигналов"
                >
                    <span className="material-icons" style={{ fontSize: 16 }}>legend_toggle</span>
                    <span className="hdr-legend-btn-text">Сигналы</span>
                </button>

                {legendOpen && (
                    <div className="hdr-legend-panel">
                        <div className="hdr-legend-item">
                            <svg width="32" height="2" className="hdr-legend-svg">
                                <line x1="0" y1="1" x2="32" y2="1"
                                    stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,3" />
                            </svg>
                            <span className="hdr-legend-label">Real</span>
                        </div>
                        <div className="hdr-legend-item">
                            <svg width="32" height="6" className="hdr-legend-svg">
                                <line x1="0" y1="1" x2="32" y2="1"
                                    stroke="#a78bfa" strokeWidth="2" strokeDasharray="5,3" />
                                <line x1="0" y1="5" x2="32" y2="5"
                                    stroke="#a78bfa" strokeWidth="2" strokeDasharray="5,3" />
                            </svg>
                            <span className="hdr-legend-label">Complex</span>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}

Header.propTypes = {
    currentScheme: PropTypes.shape({
        name: PropTypes.string.isRequired,
        isSaved: PropTypes.bool.isRequired
    }).isRequired
};

export default Header;
