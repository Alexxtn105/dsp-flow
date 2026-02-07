import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icons/Icon.jsx';
import AudioFileReader from '../../engine/AudioFileReader';
import './CompactFileUploader.css';

function CompactFileUploader({ currentFile, onFileChange }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validExtensions = ['.wav', '.wave'];
        const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

        if (!validExtensions.includes(fileExt)) {
            setError('Только WAV файлы');
            return;
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('Файл слишком большой');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const audioData = await AudioFileReader.loadWavFile(file);

            const info = {
                fileName: file.name,
                sampleRate: audioData.sampleRate,
                duration: audioData.duration,
                channels: audioData.numberOfChannels,
                samples: audioData.samples,
                audioBuffer: audioData
            };

            if (onFileChange) {
                onFileChange(info);
            }
        } catch (err) {
            console.error('Ошибка загрузки:', err);
            setError('Ошибка загрузки файла');
        } finally {
            setIsLoading(false);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleClearFile = () => {
        if (onFileChange) {
            onFileChange(null);
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="compact-file-uploader">
            <input
                ref={fileInputRef}
                type="file"
                accept=".wav,.wave,audio/wav"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {!currentFile ? (
                <div className="file-upload-area">
                    <button
                        className="upload-button"
                        onClick={handleButtonClick}
                        disabled={isLoading}
                    >
                        <Icon name="upload" size="small" />
                        <span>{isLoading ? 'Загрузка...' : 'Выбрать файл'}</span>
                    </button>
                    <div className="file-hint">WAV файл до 10MB</div>
                </div>
            ) : (
                <div className="file-preview">
                    <div className="file-header">
                        <Icon name="audio_file" size="small" />
                        <span className="file-name" title={currentFile.fileName}>
                            {currentFile.fileName}
                        </span>
                        <button
                            className="clear-btn"
                            onClick={handleClearFile}
                            title="Удалить файл"
                        >
                            <Icon name="close" size="xsmall" />
                        </button>
                    </div>
                    <div className="file-details">
                        <span className="file-detail">{formatDuration(currentFile.duration)}</span>
                        <span className="file-detail">{currentFile.channels} канал</span>
                        <span className="file-detail">{Math.round(currentFile.sampleRate / 1000)}кГц</span>
                    </div>
                    <button
                        className="change-button"
                        onClick={handleButtonClick}
                        disabled={isLoading}
                    >
                        <Icon name="swap_horiz" size="xsmall" />
                        <span>Заменить</span>
                    </button>
                </div>
            )}

            {error && (
                <div className="file-error">
                    <Icon name="error" size="xsmall" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}

CompactFileUploader.propTypes = {
    currentFile: PropTypes.object,
    onFileChange: PropTypes.func
};

export default CompactFileUploader;