/**
 * Утилитарные функции
 */

import { SIGNAL_TYPES } from './constants';
import registry from '../plugins/index';

/**
 * Генератор уникальных ID для узлов
 */
export const generateNodeId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `node_${timestamp}_${random}`;
};

/**
 * Debounce функция
 */
export const debounce = (func, wait) => {
    let timeout;
    const debounced = function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
            func(...args);
        }, wait);
    };
    debounced.cancel = () => {
        clearTimeout(timeout);
        timeout = null;
    };
    return debounced;
};

/**
 * Получить параметры по умолчанию для блока
 */
export const getDefaultParams = (blockType) => {
    return registry.getBlockDefaultParams(blockType);
};

/**
 * Глубокое клонирование объекта
 */
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    try {
        return structuredClone(obj);
    } catch {
        // Fallback for non-cloneable values (functions, DOM nodes)
        if (obj instanceof Array) {
            return obj.map(item => deepClone(item));
        }
        const clonedObj = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
};

/**
 * Форматирование даты
 */
export const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Форматирование размера файла
 */
export const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Проверка, является ли блок генератором (без входов)
 */
export const isGeneratorBlock = (blockType) => {
    return registry.isGenerator(blockType);
};

/**
 * Проверка, является ли блок визуализацией (без выходов)
 */
export const isVisualizationBlock = (blockType) => {
    return registry.isVisualization(blockType);
};

/**
 * Безопасное преобразование в JSON
 */
export const safeJSONParse = (str, defaultValue = null) => {
    try {
        return JSON.parse(str);
    } catch (error) {
        console.error('JSON parse error:', error);
        return defaultValue;
    }
};

/**
 * Создание URL для скачивания файла
 */
export const downloadFile = (data, filename, mimeType = 'application/json') => {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Получить расширение файла
 */
export const getFileExtension = (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/* ================================ ДЛЯ ТИПОВ БЛОКА============================*/

/**
 * Получить иконку для типа блока (Material Icons)
 */
export const getBlockIcon = (blockType) => {
    return registry.getBlockIcon(blockType);
};

/**
 * Получить описание для типа блока
 */
export const getBlockDescription = (blockType) => {
    return registry.getBlockDescription(blockType);
};

/**
 * Форматировать имя параметра для отображения
 */
export const formatParamName = (name) => {
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace('Cutoff', 'Частота')
        .replace('Order', 'Порядок')
        .replace('Frequency', 'Частота')
        .replace('Amplitude', 'Амплитуда')
        .replace('Low', 'Низ.')
        .replace('High', 'Выс.')
        .replace('Type', 'Тип')
        .replace('Size', 'Размер');
};

/**
 * Форматировать значение параметра для отображения
 */
export const formatParamValue = (value) => {
    if (typeof value === 'number') {
        if (value >= 1000 && value < 1000000) {
            return (value / 1000).toFixed(1) + 'k';
        }
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        }
        if (value.toString().includes('.')) {
            return value.toFixed(2);
        }
        return value.toString();
    }
    if (typeof value === 'boolean') {
        return value ? 'Да' : 'Нет';
    }
    return String(value);
};

/**
 * Получить конфигурацию сигналов для блока
 */
export const getBlockSignalConfig = (blockType) => {
    return registry.getBlockSignalConfig(blockType);
};

/**
 * Проверить, совместимы ли типы сигналов для соединения
 */
export const areSignalsCompatible = (sourceType, targetType) => {
    return sourceType === targetType;
};

/**
 * Проверить, имеет ли блок вход
 */
export const hasInput = (blockType) => {
    const config = getBlockSignalConfig(blockType);
    return config.input !== null;
};

/**
 * Проверить, имеет ли блок выход
 */
export const hasOutput = (blockType) => {
    const config = getBlockSignalConfig(blockType);
    return config.output !== null;
};

/**
 * Получить тип входа блока
 */
export const getInputType = (blockType) => {
    return getBlockSignalConfig(blockType).input;
};

/**
 * Получить тип выхода блока
 */
export const getOutputType = (blockType) => {
    return getBlockSignalConfig(blockType).output;
};

/**
 * Получить класс CSS для типа сигнала
 */
export const getSignalTypeClass = (signalType) => {
    switch(signalType) {
        case SIGNAL_TYPES.COMPLEX: return 'signal-complex';
        case SIGNAL_TYPES.REAL: return 'signal-real';
        default: return '';
    }
};

/**
 * Получить описание типа сигнала
 */
export const getSignalTypeDescription = (signalType) => {
    switch(signalType) {
        case SIGNAL_TYPES.COMPLEX: return 'Комплексный';
        case SIGNAL_TYPES.REAL: return 'Действительный';
        default: return 'Неизвестный';
    }
};

/**
 * Получить цвет для типа сигнала
 */
export const getSignalTypeColor = (signalType, isDarkTheme = false) => {
    if (isDarkTheme) {
        return signalType === SIGNAL_TYPES.COMPLEX ? '#8b5cf6' : '#3b82f6';
    }
    return signalType === SIGNAL_TYPES.COMPLEX ? '#7c3aed' : '#2563eb';
};
