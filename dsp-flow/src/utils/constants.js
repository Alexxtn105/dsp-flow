/**
 * Константы приложения
 *
 * Блочные константы (DSP_BLOCK_TYPES, BLOCK_SIGNAL_CONFIG, DSP_ICONS,
 * DEFAULT_BLOCK_PARAMS, DSP_GROUPS, INPUT_NODE_TYPES, OUTPUT_NODE_TYPES)
 * генерируются из системы плагинов — см. src/plugins/index.js
 */

/**
 * Типы сигналов
 */
export const SIGNAL_TYPES = {
    REAL: 'real',
    COMPLEX: 'complex',
    AUDIO_FILE: 'Аудио-файл',
};

// Конфигурация хранилища
export const STORAGE_CONFIG = {
    MAX_SIZE_MB: 4,
    AUTO_SAVE_DELAY: 5000,
    MAX_SCHEMES: 50,
    MAX_AUTO_SAVE_AGE_DAYS: 1
};

// Правила валидации
export const VALIDATION_RULES = {
    SCHEME_NAME: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 100,
        PATTERN: /^[a-zA-Zа-яА-ЯёЁ0-9\s\-_]+$/
    },
    DESCRIPTION: {
        MAX_LENGTH: 500
    }
};

// Re-export из системы плагинов
export {
    DSP_BLOCK_TYPES,
    BLOCK_SIGNAL_CONFIG,
    DSP_ICONS,
    DEFAULT_BLOCK_PARAMS,
    DSP_GROUPS,
    INPUT_NODE_TYPES,
    OUTPUT_NODE_TYPES,
} from '../plugins/index';
