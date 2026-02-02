import PropTypes from 'prop-types';
import './Header.css';

function Header({
    isDarkTheme,
    toggleTheme,
    currentScheme,
    onSave,
    onSaveAs,
    onLoad,
    isSaveEnabled,
    isSaveAsEnabled
}) {
    return (
        <header className="app-header">
            <div className="app-header-left">
                <h1>🎛️ DSP Flow Editor</h1>
                <p>Редактор схем цифровой обработки сигналов</p>
            </div>

            <div className="app-header-center">
                <div className="current-scheme-info">
                    <div className="scheme-name" title={currentScheme.name}>
                        {currentScheme.name}
                    </div>
                    {!currentScheme.isSaved && currentScheme.name !== 'not_saved' && (
                        <div className="scheme-unsaved">
                            (не сохранено)
                        </div>
                    )}
                </div>
            </div>

            <div className="app-header-right">
                <div className="header-controls">
                    <button
                        className="header-btn save"
                        onClick={onSave}
                        title={isSaveEnabled ? "Сохранить текущую схему" : "Сначала сохраните схему как..."}
                        disabled={!isSaveEnabled}
                    >
                        💾 Сохранить
                    </button>

                    <button
                        className="header-btn save-as"
                        onClick={onSaveAs}
                        title="Сохранить под новым именем"
                        disabled={!isSaveAsEnabled}
                    >
                        📝 Сохранить как
                    </button>

                    <button
                        className="header-btn load"
                        onClick={onLoad}
                        title="Загрузить сохраненную схему"
                    >
                        📂 Загрузить
                    </button>
                </div>

                <button className="theme-toggle" onClick={toggleTheme}>
                    {isDarkTheme ? '☀️ Светлая тема' : '🌙 Темная тема'}
                </button>
            </div>
        </header>
    );
}

Header.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
    currentScheme: PropTypes.shape({
        name: PropTypes.string.isRequired,
        isSaved: PropTypes.bool.isRequired
    }).isRequired,
    onSave: PropTypes.func.isRequired,
    onSaveAs: PropTypes.func.isRequired,
    onLoad: PropTypes.func.isRequired,
    isSaveEnabled: PropTypes.bool.isRequired,
    isSaveAsEnabled: PropTypes.bool.isRequired
};

export default Header;
