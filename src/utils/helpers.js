/**
 * Утилитарные функции
 */

import { DEFAULT_BLOCK_PARAMS } from './constants';

/**
 * Debounce функция
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Генератор уникальных ID для узлов
 */
let nodeIdCounter = 0;
export const generateNodeId = () => {
    nodeIdCounter++;
    return `node_${nodeIdCounter}`;
};

/**
 * Сброс счётчика ID (для тестов)
 */
export const resetNodeIdCounter = () => {
    nodeIdCounter = 0;
};

/**
 * Получить параметры по умолчанию для блока
 */
export const getDefaultParams = (blockType) => {
    return DEFAULT_BLOCK_PARAMS[blockType] || {};
};

/**
 * Глубокое клонирование объекта
 */
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }

    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
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
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Проверка, является ли блок генератором (без входов)
 */
export const isGeneratorBlock = (blockType) => {
    const generators = [
        'Входной сигнал',
        'Референсный синусный генератор',
        'Референсный косинусный генератор'
    ];
    return generators.includes(blockType);
};

/**
 * Проверка, является ли блок визуализацией (без выходов)
 */
export const isVisualizationBlock = (blockType) => {
    const visualizations = [
        'Осциллограф',
        'Спектроанализатор',
        'Фазовое созвездие'
    ];
    return visualizations.includes(blockType);
};

/**
 * Проверка валидности email
 */
export const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

/**
 * Throttle функция
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
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

/**
 * Проверка, является ли устройство мобильным
 */
export const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Получить случайное число в диапазоне
 */
export const randomInRange = (min, max) => {
    return Math.random() * (max - min) + min;
};

/**
 * Получить случайный элемент из массива
 */
export const randomElement = (array) => {
    return array[Math.floor(Math.random() * array.length)];
};
