/**
 * AudioFileBlock - компонент для загрузки и отображения аудио файла
 */

import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../common/Icons/Icon.jsx';
import AudioFileReader from '../../../engine/AudioFileReader';
import './AudioFileBlock.css';

function AudioFileBlock({ onFileLoad, currentFile }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fileInfo, setFileInfo] = useState(currentFile);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Проверяем формат файла
        const validExtensions = ['.wav', '.wave'];
        const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

        if (!validExtensions.includes(fileExt)) {
            setError('Поддерживаются только WAV файлы');
            return;
        }

        // Проверяем размер файла (максимум 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            setError('Файл слишком большой. Максимальный размер: 10MB');
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
                fileSize: file.size,
                lastModified: file.lastModified,
                audioBuffer: audioData // Сохраняем оригинальные данные для движка
            };

            setFileInfo(info);

            if (onFileLoad) {
                onFileLoad(info);
            }
        } catch (err) {
            console.error('Ошибка загрузки аудио файла:', err);
            setError('Ошибка загрузки файла. Убедитесь, что это валидный WAV файл.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleClearFile = () => {
        setFileInfo(null);
        setError(null);
        if (onFileLoad) {
            onFileLoad(null);
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    const formatSampleRate = (rate) => {
        if (rate >= 1000) {
            return `${(rate / 1000).toFixed(1)} кГц`;
        }
        return `${rate} Гц`;
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' Б';
        else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
        else return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    };

    return (
        <div className="audio-file-block">
            <input
                ref={fileInputRef}
                type="file"
                accept=".wav,.wave,audio/wav,audio/wave"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {!fileInfo ? (
                <button
                    className="file-select-btn"
                    onClick={handleButtonClick}
                    disabled={isLoading}
                >
                    <Icon name="audio_file" size="small" />
                    <span>{isLoading ? 'Загрузка...' : 'Выбрать WAV файл'}</span>
                </button>
            ) : (
                <button
                    className="file-change-btn"
                    onClick={handleButtonClick}
                    disabled={isLoading}
                >
                    <Icon name="swap_horiz" size="small" />
                    <span>Заменить файл</span>
                </button>
            )}

            {error && (
                <div className="file-error">
                    <Icon name="error" size="small" />
                    <span>{error}</span>
                </div>
            )}

            {fileInfo && (
                <div className="file-info">
                    <div className="file-info-header">
                        <div className="file-info-row">
                            <Icon name="insert_drive_file" size="small" />
                            <span className="file-name">{fileInfo.fileName}</span>
                            <button
                                className="clear-file-btn"
                                onClick={handleClearFile}
                                title="Удалить файл"
                            >
                                <Icon name="close" size="xsmall" />
                            </button>
                        </div>
                    </div>

                    <div className="file-info-details">
                        <div className="file-info-row">
                            <span className="info-label">Длительность:</span>
                            <span className="info-value">{formatDuration(fileInfo.duration)}</span>
                        </div>
                        <div className="file-info-row">
                            <span className="info-label">Частота дискретизации:</span>
                            <span className="info-value">{formatSampleRate(fileInfo.sampleRate)}</span>
                        </div>
                        <div className="file-info-row">
                            <span className="info-label">Каналы:</span>
                            <span className="info-value">{fileInfo.channels}</span>
                        </div>
                        <div className="file-info-row">
                            <span className="info-label">Размер файла:</span>
                            <span className="info-value">{formatFileSize(fileInfo.fileSize)}</span>
                        </div>
                        <div className="file-info-row">
                            <span className="info-label">Отсчетов:</span>
                            <span className="info-value">{fileInfo.samples?.length.toLocaleString() || 0}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

AudioFileBlock.propTypes = {
    onFileLoad: PropTypes.func,
    currentFile: PropTypes.object
};

export default AudioFileBlock;