import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './Header.css';

function Header({ currentScheme }) {
    const { isDarkTheme } = useThemeContext();
    const { t, i18n } = useTranslation();
    const [legendOpen, setLegendOpen] = useState(false);

    const unsaved = !currentScheme.isSaved && currentScheme.name !== 'not_saved';

    const toggleLanguage = () => {
        const newLang = i18n.language === 'ru' ? 'en' : 'ru';
        i18n.changeLanguage(newLang);
    };

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
                        {currentScheme.name === 'not_saved' ? t('header.unnamed') : currentScheme.name}
                    </span>
                    {unsaved && <span className="hdr-scheme-badge">{t('header.modified')}</span>}
                </div>
            </div>

            {/* Right: language + legend */}
            <div className="hdr-right">
                <button
                    className="hdr-lang-btn"
                    onClick={toggleLanguage}
                    title={t(`language.${i18n.language === 'ru' ? 'en' : 'ru'}`)}
                >
                    <span className="hdr-lang-code">{i18n.language === 'ru' ? 'EN' : 'RU'}</span>
                </button>

                <button
                    className={`hdr-legend-btn ${legendOpen ? 'active' : ''}`}
                    onClick={() => setLegendOpen(!legendOpen)}
                    title={t('header.signalLegend')}
                >
                    <span className="material-icons" style={{ fontSize: 16 }}>legend_toggle</span>
                    <span className="hdr-legend-btn-text">{t('header.signals')}</span>
                </button>

                {legendOpen && (
                    <div className="hdr-legend-panel">
                        <div className="hdr-legend-item">
                            <svg width="32" height="2" className="hdr-legend-svg">
                                <line x1="0" y1="1" x2="32" y2="1"
                                    stroke="var(--signal-real, #3b82f6)" strokeWidth="2" strokeDasharray="5,3" />
                            </svg>
                            <span className="hdr-legend-label">Real</span>
                        </div>
                        <div className="hdr-legend-item">
                            <svg width="32" height="6" className="hdr-legend-svg">
                                <line x1="0" y1="1" x2="32" y2="1"
                                    stroke="var(--signal-complex, #8b5cf6)" strokeWidth="2" strokeDasharray="5,3" />
                                <line x1="0" y1="5" x2="32" y2="5"
                                    stroke="var(--signal-complex, #8b5cf6)" strokeWidth="2" strokeDasharray="5,3" />
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
