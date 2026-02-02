/**
 * Утилитарные функции
 */

import { DEFAULT_BLOCK_PARAMS } from './constants';
import { DSP_ICONS } from './constants';



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


/* ================================ ДЛЯ ТИПОВ БЛОКА============================*/

/**
 * Получить иконку для типа блока
 */
/**
 * Получить иконку для типа блока (Material Icons)
 */
export const getBlockIcon = (blockType) => {
    return DSP_ICONS[blockType] || 'widgets'; // Иконка по умолчанию
};

// export const getBlockIcon = (blockType) => {
//     const iconMap = {
//         'КИХ-Фильтр': '⚡',
//         'Полосовой КИХ-фильтр': '🎛️',
//         'ФВЧ КИХ-фильтр': '📈',
//         'ФНЧ КИХ-фильтр': '📉',
//         'Преобразователь Гильберта': '🌀',
//         'Фильтр Герцеля': '🔍',
//         'Входной сигнал': '〰️',
//         'Референсный синусный генератор': '📐',
//         'Референсный косинусный генератор': '📏',
//         'Скользящее БПФ': '🌀',
//         'БПФ': '⚡',
//         'Спектроанализатор': '📊',
//         'Фазовый детектор': '📐',
//         'Частотный детектор': '📏',
//         'Интегратор': '∫',
//         'Сумматор': '➕',
//         'Перемножитель': '✖️',
//         'Осциллограф': '📊',
//         'Фазовое созвездие': '⭐',
//         'КИХ': '⚡',
//         'Генератор': '〰️',
//         'БПФ/Анализ': '📊',
//         'Детектор': '📐',
//         'Математический': '∫',
//         'Визуализация': '📊'
//     };
//
//     // Сначала ищем точное совпадение
//     if (iconMap[blockType]) {
//         return iconMap[blockType];
//     }
//
//     // Если точного совпадения нет, ищем по части имени
//     for (const [key, icon] of Object.entries(iconMap)) {
//         if (blockType.includes(key) || key.includes(blockType)) {
//             return icon;
//         }
//     }
//
//     // Иконка по умолчанию на основе категории
//     if (blockType.includes('фильтр') || blockType.includes('Фильтр')) return '⚡';
//     if (blockType.includes('генератор') || blockType.includes('Генератор')) return '〰️';
//     if (blockType.includes('БПФ') || blockType.includes('анализатор')) return '📊';
//     if (blockType.includes('детектор') || blockType.includes('Детектор')) return '📐';
//     if (blockType.includes('сумма') || blockType.includes('умнож') || blockType.includes('интегр')) return '∫';
//     if (blockType.includes('осциллограф') || blockType.includes('созвездие') || blockType.includes('визуал')) return '📊';
//
//     return '📦'; // Иконка по умолчанию
// };

/**
 * Получить описание для типа блока
 */
export const getBlockDescription = (blockType) => {
    const descriptions = {
        'КИХ-Фильтр': 'КИХ-фильтр (FIR)',
        'Полосовой КИХ-фильтр': 'Полосовой фильтр',
        'ФВЧ КИХ-фильтр': 'ФВЧ фильтр',
        'ФНЧ КИХ-фильтр': 'ФНЧ фильтр',
        'Преобразователь Гильберта': 'Преобразователь Гильберта',
        'Фильтр Герцеля': 'Фильтр Герцеля',
        'Входной сигнал': 'Генератор сигнала',
        'Референсный синусный генератор': 'Синусный генератор',
        'Референсный косинусный генератор': 'Косинусный генератор',
        'Скользящее БПФ': 'Скользящее БПФ',
        'БПФ': 'Быстрое преобразование Фурье',
        'Спектроанализатор': 'Спектральный анализ',
        'Фазовый детектор': 'Детектор фазы',
        'Частотный детектор': 'Детектор частоты',
        'Интегратор': 'Интегратор сигнала',
        'Сумматор': 'Сумматор сигналов',
        'Перемножитель': 'Перемножитель сигналов',
        'Осциллограф': 'Визуализация сигнала',
        'Фазовое созвездие': 'Фазовое созвездие'
    };

    return descriptions[blockType] || blockType;
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