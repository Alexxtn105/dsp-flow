import PropTypes from 'prop-types';
import './Header.css';

import SignalLegend from '../../dsp/DSPEditor/SignalLegend';

function Header({ currentScheme, isDarkTheme }) {
    return (
        <header className="app-header">
            <div className="app-header-left">
                <h1>DSP Flow Editor</h1>
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
                <SignalLegend isDarkTheme={isDarkTheme} />
            </div>
        </header>
    );
}

Header.propTypes = {
    currentScheme: PropTypes.shape({
        name: PropTypes.string.isRequired,
        isSaved: PropTypes.bool.isRequired
    }).isRequired,
    isDarkTheme: PropTypes.bool
};

export default Header;