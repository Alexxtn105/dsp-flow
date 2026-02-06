/**
 * AudioFileBlock - компонент для загрузки и отображения аудио файла
 */

import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../common/Icons/Icon';
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
        if (!file.name.toLowerCase().endsWith('.wav')) {
            setError('Поддерживаются только WAV файлы');
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
                samples: audioData.samples
            };

            setFileInfo(info);

            if (onFileLoad) {
                onFileLoad(info);
            }
        } catch (err) {
            setError('Ошибка загрузки файла: ' + err.message);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatSampleRate = (rate) => {
        return `${(rate / 1000).toFixed(1)} кГц`;
    };

    return (
        <div className="audio-file-block">
            <input
                ref={fileInputRef}
                type="file"
                accept=".wav,audio/wav"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            <button
                className="file-select-btn"
                onClick={handleButtonClick}
                disabled={isLoading}
            >
                <Icon name="audio_file" size="small" />
                <span>{isLoading ? 'Загрузка...' : 'Выбрать WAV файл'}</span>
            </button>

            {error && (
                <div className="file-error">
                    <Icon name="error" size="small" />
                    <span>{error}</span>
                </div>
            )}

            {fileInfo && !error && (
                <div className="file-info">
                    <div className="file-info-row">
                        <Icon name="insert_drive_file" size="small" />
                        <span className="file-name">{fileInfo.fileName}</span>
                    </div>
                    <div className="file-info-row">
                        <span className="info-label">Длительность:</span>
                        <span className="info-value">{formatDuration(fileInfo.duration)}</span>
                    </div>
                    <div className="file-info-row">
                        <span className="info-label">Sample Rate:</span>
                        <span className="info-value">{formatSampleRate(fileInfo.sampleRate)}</span>
                    </div>
                    <div className="file-info-row">
                        <span className="info-label">Каналы:</span>
                        <span className="info-value">{fileInfo.channels}</span>
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