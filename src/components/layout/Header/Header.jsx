import { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../../locales/i18n.js';
import FlagIcon from '../../common/FlagIcon/FlagIcon.jsx';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './Header.css';

function Header({ currentScheme }) {
    const { isDarkTheme, toggleTheme } = useThemeContext();
    const { t, i18n } = useTranslation();
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef(null);

    const unsaved = !currentScheme.isSaved && currentScheme.name !== 'not_saved';

    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    const handleLanguageChange = (code) => {
        i18n.changeLanguage(code);
        setLangOpen(false);
    };

    // Close dropdown on outside click
    useEffect(() => {
        if (!langOpen) return;
        const handleClick = (e) => {
            if (langRef.current && !langRef.current.contains(e.target)) {
                setLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [langOpen]);

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

            {/* Right: theme + language */}
            <div className="hdr-right">
                {/* Theme toggle */}
                <button
                    className="hdr-theme-btn"
                    onClick={toggleTheme}
                    title={isDarkTheme ? t('controlToolbar.lightTheme') : t('controlToolbar.darkTheme')}
                >
                    <span className="material-icons" style={{ fontSize: 16 }}>
                        {isDarkTheme ? 'light_mode' : 'dark_mode'}
                    </span>
                </button>

                {/* Language selector */}
                <div className="hdr-lang" ref={langRef}>
                    <button
                        className={`hdr-lang-btn ${langOpen ? 'active' : ''}`}
                        onClick={() => setLangOpen(!langOpen)}
                        title={currentLang.name}
                    >
                        <FlagIcon code={currentLang.flagCode} size={12} />
                        <span className="hdr-lang-code">{currentLang.code.toUpperCase()}</span>
                    </button>

                    {langOpen && (
                        <div className="hdr-lang-dropdown">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    className={`hdr-lang-option ${lang.code === i18n.language ? 'active' : ''}`}
                                    onClick={() => handleLanguageChange(lang.code)}
                                >
                                    <FlagIcon code={lang.flagCode} size={14} />
                                    <span className="hdr-lang-option-name">{lang.name}</span>
                                    {lang.dev && <span className="hdr-lang-wip">WIP</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
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
