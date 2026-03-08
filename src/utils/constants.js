/**
 * Константы приложения
 */

/**
 * Типы сигналов
 */
export const SIGNAL_TYPES = {
    REAL: 'real',
    COMPLEX: 'complex'
};

// Типы блоков DSP
export const DSP_BLOCK_TYPES = {
    // Фильтры
    NOTCH_FIR: 'Режекторный КИХ-фильтр',
    BANDPASS_FIR: 'Полосовой КИХ-фильтр',
    HIGHPASS_FIR: 'ФВЧ КИХ-фильтр',
    LOWPASS_FIR: 'ФНЧ КИХ-фильтр',
    HILBERT_TRANSFORMER: 'Преобразователь Гильберта',
    GOERTZEL_FILTER: 'Фильтр Герцеля',
    REMEZ_FILTER: 'Фильтр Ремеза',
    DELAY_LINE: 'Линия задержки',

    // Генераторы
    CONSTANT: 'Константа',
    AUDIO_FILE: 'Audio File',
    SINE_GENERATOR: 'Синусный генератор',
    COSINE_GENERATOR: 'Косинусный генератор',
    REF_SINE_GEN: 'Референсный синусный генератор',
    REF_COSINE_GEN: 'Референсный косинусный генератор',

    // БПФ/Анализ
    SPECTRUM_ANALYZER: 'Спектроанализатор',

    // Детекторы
    PHASE_DETECTOR: 'Фазовый детектор',
    FREQUENCY_DETECTOR: 'Частотный детектор',
    AMPLITUDE_DETECTOR: 'Амплитудный детектор',

    // Математические
    INTEGRATOR: 'Интегратор',
    SUMMER: 'Сумматор',
    MULTIPLIER: 'Перемножитель',
    COMPLEX_MULTIPLIER: 'Комплексный перемножитель',
    COMPLEX_SUMMER: 'Комплексный сумматор',
    COMPLEX_SQUARE: 'Комплексный квадрат',
    COMPLEX_SQRT: 'Комплексный корень',
    COMPLEX_PHASE: 'Фаза (комплексная)',
    COMPLEX_MAGNITUDE: 'Амплитуда (комплексная)',
    COMPLEX_COMPOSER: 'Формирователь комплексного',
    COMPLEX_CONJUGATE: 'Комплексное сопряжение',
    REAL_SQUARE: 'Квадрат (действ.)',
    REAL_POWER4: 'Степень 4 (действ.)',
    ATAN2: 'Арктангенс',

    // Визуализация
    OSCILLOSCOPE: 'Осциллограф',
    CONSTELLATION: 'Фазовое созвездие',
    WATERFALL: 'Водопад',
    NUMERIC_INDICATOR: 'Числовой индикатор',
    COMPLEX_NUMERIC_INDICATOR: 'Комплексный числовой индикатор',
    MULTI_SPECTRUM_ANALYZER: 'Многоканальный спектроанализатор',
    SPEAKER: 'Динамик'
};

// Конфигурация хранилища
export const STORAGE_CONFIG = {
    MAX_SIZE_MB: 4,
    AUTO_SAVE_DELAY: 5000,
    MAX_SCHEMES: 50,
    MAX_AUTO_SAVE_AGE_DAYS: 1
};

// Скрытые/служебные параметры (не показываются в inline-редакторе и диалоге)
export const HIDDEN_PARAMS = [
    'wavFile', 'signalConfig', 'nodeId', 'onOpenParams', 'onOpenVisualization',
    'detectedSampleRate', 'duration', 'channels', 'totalSamples', 'wavFileName',
    'sourceType', 'muted'
];

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
