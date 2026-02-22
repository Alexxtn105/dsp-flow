import { useState } from 'react';
import PropTypes from 'prop-types';
import Dialog from '../../common/Dialog/Dialog.jsx';
import './SettingsDialog.css';

/**
 * Диалог настроек - редактирование частоты дискретизации
 */
function SettingsDialog({ isDarkTheme, onClose, sampleRate, onSampleRateChange }) {
    const [localSampleRate, setLocalSampleRate] = useState(sampleRate);
    const [error, setError] = useState('');

    // Стандартные частоты дискретизации
    const standardRates = [8000, 16000, 22050, 44100, 48000, 96000, 192000];

    const handleSubmit = (e) => {
        e.preventDefault();

        const rate = parseInt(localSampleRate, 10);

        if (isNaN(rate) || rate < 1000 || rate > 384000) {
            setError('Частота дискретизации должна быть от 1000 до 384000 Гц');
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
            title="Настройки схемы"
            className={isDarkTheme ? 'dark-theme' : ''}
        >
            <form onSubmit={handleSubmit} className="settings-form">
                <div className="settings-section">
                    <label className="settings-label">
                        Частота дискретизации (Гц)
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
                        <span className="quick-select-label">Быстрый выбор:</span>
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
                    <button type="submit">Применить</button>
                    <button type="button" onClick={onClose}>Отмена</button>
                </div>
            </form>
        </Dialog>
    );
}

SettingsDialog.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    sampleRate: PropTypes.number.isRequired,
    onSampleRateChange: PropTypes.func.isRequired
};

export default SettingsDialog;
