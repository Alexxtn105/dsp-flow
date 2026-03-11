import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Dialog from '../../common/Dialog/Dialog.jsx';
import { useThemeContext } from '../../../contexts/ThemeContext';
import './SettingsDialog.css';

/**
 * Диалог настроек - редактирование частоты дискретизации
 */
function SettingsDialog({ onClose, sampleRate, onSampleRateChange }) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation();
    const [localSampleRate, setLocalSampleRate] = useState(sampleRate);
    const [error, setError] = useState('');

    // Стандартные частоты дискретизации
    const standardRates = [8000, 16000, 22050, 44100, 48000, 96000, 192000];

    const handleSubmit = (e) => {
        e.preventDefault();

        const rate = parseInt(localSampleRate, 10);

        if (isNaN(rate) || rate < 1000 || rate > 384000) {
            setError(t('settingsDialog.sampleRateError'));
            return;
        }

        onSampleRateChange(rate);
        onClose();
    };

    const handleQuickSelect = (rate) => {
        setLocalSampleRate(rate);
        setError('');
    };

    return (
        <Dialog
            isOpen={true}
            onClose={onClose}
            title={t('settingsDialog.title')}
            className={isDarkTheme ? 'dark-theme' : ''}
        >
            <form onSubmit={handleSubmit} className="settings-form">
                <div className="settings-section">
                    <label className="settings-label">
                        {t('settingsDialog.sampleRateLabel')}
                    </label>
                    <input
                        type="number"
                        value={localSampleRate}
                        onChange={(e) => {
                            setLocalSampleRate(e.target.value);
                            setError('');
                        }}
                        min="1000"
                        max="384000"
                        step="1"
                        autoFocus
                    />

                    <div className="quick-select">
                        <span className="quick-select-label">{t('settingsDialog.quickSelect')}</span>
                        <div className="quick-select-buttons">
                            {standardRates.map((rate) => (
                                <button
                                    key={rate}
                                    type="button"
                                    className={`quick-btn ${localSampleRate === rate ? 'active' : ''}`}
                                    onClick={() => handleQuickSelect(rate)}
                                >
                                    {rate >= 1000 ? `${rate / 1000}k` : rate}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {error && <div className="error-message">⚠️ {error}</div>}

                <div className="dialog-buttons">
                    <button type="submit">{t('settingsDialog.apply')}</button>
                    <button type="button" onClick={onClose}>{t('settingsDialog.cancel')}</button>
                </div>
            </form>
        </Dialog>
    );
}

SettingsDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    sampleRate: PropTypes.number.isRequired,
    onSampleRateChange: PropTypes.func.isRequired
};

export default SettingsDialog;
