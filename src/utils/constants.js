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

/**
 * Конфигурация сигналов для блоков DSP
 */
export const BLOCK_SIGNAL_CONFIG = {
    // Фильтры (обычно работают с действительными сигналами)
    'КИХ-Фильтр': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.REAL },
    'Полосовой КИХ-фильтр': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.REAL },
    'ФВЧ КИХ-фильтр': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.REAL },
    'ФНЧ КИХ-фильтр': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.REAL },

    // Преобразователь Гильберта (преобразует в комплексный)
    'Преобразователь Гильберта': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.COMPLEX },

    'Фильтр Герцеля': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.REAL },

    // Генераторы (создают сигналы)
    'Входной сигнал': { input: null, output: SIGNAL_TYPES.REAL }, // нет входа
    'Референсный синусный генератор': { input: null, output: SIGNAL_TYPES.REAL },
    'Референсный косинусный генератор': { input: null, output: SIGNAL_TYPES.REAL },

    // БПФ/Анализ
    'Скользящее БПФ': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.COMPLEX },
    'БПФ': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.COMPLEX },
    'Спектроанализатор': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.REAL },

    // Детекторы
    'Фазовый детектор': { input: SIGNAL_TYPES.COMPLEX, output: SIGNAL_TYPES.REAL },
    'Частотный детектор': { input: SIGNAL_TYPES.COMPLEX, output: SIGNAL_TYPES.REAL },

    // Математические (зависит от входов)
    'Интегратор': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.REAL },
    'Сумматор': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.REAL },
    'Перемножитель': { input: SIGNAL_TYPES.REAL, output: SIGNAL_TYPES.REAL },

    // Визуализация (только вход)
    'Осциллограф': { input: SIGNAL_TYPES.REAL, output: null },
    'Фазовое созвездие': { input: SIGNAL_TYPES.COMPLEX, output: null },
    'Водопад': { input: SIGNAL_TYPES.REAL, output: null }
};

/**
 * Маппинг иконок для блоков DSP
 */
export const DSP_ICONS = {
    // Фильтры
    'КИХ-Фильтр': 'filter_alt',
    'Полосовой КИХ-фильтр': 'tune',
    'ФВЧ КИХ-фильтр': 'trending_up',
    'ФНЧ КИХ-фильтр': 'trending_down',
    'Преобразователь Гильберта': 'transform',
    'Фильтр Герцеля': 'psychology',

    // Генераторы
    'Входной сигнал': 'network_ping',
    'Синусный генератор': 'waves',
    'Косинусный генератор': 'graphic_eq',

    // БПФ/Анализ
    'Скользящее БПФ': 'show_chart',
    'БПФ': 'multiline_chart',
    'Спектроанализатор': 'analytics',

    // Детекторы
    'Фазовый детектор': 'speed',
    'Частотный детектор': 'timeline',

    // Математические
    'Интегратор': 'functions',
    'Сумматор': 'add',
    'Перемножитель': 'close',

    // Визуализация
    'Осциллограф': 'show_chart',
    'Фазовое созвездие': 'star',
    'Водопад': 'waterfall_chart',

    // Действия
    'save': 'save',
    'save_as': 'save_as',
    'load': 'folder_open',
    'theme_light': 'light_mode',
    'theme_dark': 'dark_mode',
    'settings': 'settings',
    'start': 'play_arrow',
    'stop': 'stop',
    'expand': 'chevron_right',
    'collapse': 'chevron_left',
    'group_expand': 'expand_more',
    'group_collapse': 'expand_less'
};


// Типы блоков DSP
export const DSP_BLOCK_TYPES = {
    // Фильтры
    FIR_FILTER: 'КИХ-Фильтр',
    BANDPASS_FIR: 'Полосовой КИХ-фильтр',
    HIGHPASS_FIR: 'ФВЧ КИХ-фильтр',
    LOWPASS_FIR: 'ФНЧ КИХ-фильтр',
    HILBERT_TRANSFORMER: 'Преобразователь Гильберта',
    GOERTZEL_FILTER: 'Фильтр Герцеля',

    // Генераторы
    INPUT_SIGNAL: 'Входной сигнал',
    REF_SINE_GEN: 'Синусный генератор',
    REF_COSINE_GEN: 'Косинусный генератор',

    // БПФ/Анализ
    SLIDING_FFT: 'Скользящее БПФ',
    FFT: 'БПФ',
    SPECTRUM_ANALYZER: 'Спектроанализатор',

    // Детекторы
    PHASE_DETECTOR: 'Фазовый детектор',
    FREQUENCY_DETECTOR: 'Частотный детектор',

    // Математические
    INTEGRATOR: 'Интегратор',
    SUMMER: 'Сумматор',
    MULTIPLIER: 'Перемножитель',

    // Визуализация
    OSCILLOSCOPE: 'Осциллограф',
    CONSTELLATION: 'Фазовое созвездие',
    WATERFALL: 'Водопад'
};

// Параметры по умолчанию для блоков
export const DEFAULT_BLOCK_PARAMS = {
    [DSP_BLOCK_TYPES.FIR_FILTER]: {
        order: 64,
        cutoff: 1000,
        filterType: 'lowpass',
    },
    [DSP_BLOCK_TYPES.BANDPASS_FIR]: {
        order: 64,
        lowCutoff: 1000,
        highCutoff: 3000,
        filterType: 'bandpass',
    },
    [DSP_BLOCK_TYPES.HIGHPASS_FIR]: {
        order: 64,
        cutoff: 1000,
        filterType: 'highpass',
    },
    [DSP_BLOCK_TYPES.LOWPASS_FIR]: {
        order: 64,
        cutoff: 1000,
        filterType: 'lowpass',
    },
    [DSP_BLOCK_TYPES.HILBERT_TRANSFORMER]: {
        order: 64,
        phaseShift: 90,
    },
    [DSP_BLOCK_TYPES.GOERTZEL_FILTER]: {
        targetFrequency: 1000,
        samplingRate: 48000,
        N: 256,
    },
    [DSP_BLOCK_TYPES.INPUT_SIGNAL]: {
        frequency: 1000,
        amplitude: 1.0,
        signalType: 'sine',
    },
    [DSP_BLOCK_TYPES.REF_SINE_GEN]: {
        frequency: 1000,
        amplitude: 1.0,
        phase: 0,
        controllable: true,
    },
    [DSP_BLOCK_TYPES.REF_COSINE_GEN]: {
        frequency: 1000,
        amplitude: 1.0,
        phase: 0,
        controllable: true,
    },
    [DSP_BLOCK_TYPES.OSCILLOSCOPE]: {
        timeWindow: 10,
        samplingRate: 48000,
        channels: 1,
    },
    [DSP_BLOCK_TYPES.SLIDING_FFT]: {
        windowSize: 1024,
        overlap: 512,
        fftSize: 1024,
    },
    [DSP_BLOCK_TYPES.FFT]: {
        fftSize: 8192,
        windowType: 'hann',
        normalize: true,
    },
    [DSP_BLOCK_TYPES.SPECTRUM_ANALYZER]: {
        fftSize: 2048,
        frequencyRange: 'full',
        dBScale: true,
        averaging: 5,
    },
    [DSP_BLOCK_TYPES.PHASE_DETECTOR]: {
        referenceFrequency: 1000,
        sensitivity: 1.0,
        outputRange: '±180°',
    },
    [DSP_BLOCK_TYPES.FREQUENCY_DETECTOR]: {
        centerFrequency: 1000,
        bandwidth: 100,
        sensitivity: 1.0,
    },
    [DSP_BLOCK_TYPES.INTEGRATOR]: {
        integrationTime: 1.0,
        resetOnOverflow: true,
        maxValue: 1000,
    },
    [DSP_BLOCK_TYPES.SUMMER]: {
        numInputs: 2,
        weights: [1.0, 1.0],
        normalization: 'none',
    },
    [DSP_BLOCK_TYPES.MULTIPLIER]: {
        numInputs: 2,
        operation: 'multiply',
        scaleFactor: 1.0,
    },
    [DSP_BLOCK_TYPES.CONSTELLATION]: {
        symbolRate: 1000,
        constellation: 'QPSK',
        eyeDiagram: true,
    },
    [DSP_BLOCK_TYPES.WATERFALL]: {
        fftSize: 1024,
        speed: 1,
        colorMap: 'jet'
    }
};

// Обновите DSP_GROUPS с новыми иконками
export const DSP_GROUPS = [
    {
        id: 'filters',
        name: 'Фильтры',
        collapsed: false,
        blocks: [
            {
                id: 'fir-filter',
                name: DSP_BLOCK_TYPES.FIR_FILTER,
                icon: DSP_ICONS['КИХ-Фильтр'],
                description: 'КИХ-фильтр (FIR)',
            },
            {
                id: 'bandpass-fir-filter',
                name: DSP_BLOCK_TYPES.BANDPASS_FIR,
                icon: DSP_ICONS['Полосовой КИХ-фильтр'],
                description: 'Полосовой КИХ-фильтр',
            },
            {
                id: 'highpass-fir-filter',
                name: DSP_BLOCK_TYPES.HIGHPASS_FIR,
                icon: DSP_ICONS['ФВЧ КИХ-фильтр'],
                description: 'ФВЧ КИХ-фильтр',
            },
            {
                id: 'lowpass-fir-filter',
                name: DSP_BLOCK_TYPES.LOWPASS_FIR,
                icon: DSP_ICONS['ФНЧ КИХ-фильтр'],
                description: 'ФНЧ КИХ-фильтр',
            },
            {
                id: 'hilbert-transformer',
                name: DSP_BLOCK_TYPES.HILBERT_TRANSFORMER,
                icon: DSP_ICONS['Преобразователь Гильберта'],
                description: 'Преобразователь Гильберта',
            },
            {
                id: 'goertzel-filter',
                name: DSP_BLOCK_TYPES.GOERTZEL_FILTER,
                icon: DSP_ICONS['Фильтр Герцеля'],
                description: 'Фильтр Герцеля',
            },
        ]
    },
    {
        id: 'generators',
        name: 'Генераторы',
        collapsed: false,
        blocks: [
            {
                id: 'input-signal',
                name: DSP_BLOCK_TYPES.INPUT_SIGNAL,
                icon: DSP_ICONS['Входной сигнал'],
                description: 'Генератор входного сигнала',
            },
            {
                id: 'ref-sine-generator',
                name: DSP_BLOCK_TYPES.REF_SINE_GEN,
                icon: DSP_ICONS['Синусный генератор'],
                description: 'Управляемый референсный синусный генератор',
            },
            {
                id: 'ref-cosine-generator',
                name: DSP_BLOCK_TYPES.REF_COSINE_GEN,
                icon: DSP_ICONS['Косинусный генератор'],
                description: 'Управляемый референсный косинусный генератор',
            },
        ]
    },
    {
        id: 'fft-blocks',
        name: 'БПФ/Анализ',
        collapsed: false,
        blocks: [
            {
                id: 'sliding-fft',
                name: DSP_BLOCK_TYPES.SLIDING_FFT,
                icon: DSP_ICONS['Скользящее БПФ'],
                description: 'Скользящее БПФ',
            },
            {
                id: 'fft',
                name: DSP_BLOCK_TYPES.FFT,
                icon: DSP_ICONS['БПФ'],
                description: 'БПФ (размер кратен степени двойки)',
            },
            {
                id: 'spectrum-analyzer',
                name: DSP_BLOCK_TYPES.SPECTRUM_ANALYZER,
                icon: DSP_ICONS['Спектроанализатор'],
                description: 'Спектральный анализ',
            },
        ]
    },
    {
        id: 'detectors',
        name: 'Детекторы',
        collapsed: false,
        blocks: [
            {
                id: 'phase-detector',
                name: DSP_BLOCK_TYPES.PHASE_DETECTOR,
                icon: DSP_ICONS['Фазовый детектор'],
                description: 'Фазовый детектор',
            },
            {
                id: 'frequency-detector',
                name: DSP_BLOCK_TYPES.FREQUENCY_DETECTOR,
                icon: DSP_ICONS['Частотный детектор'],
                description: 'Частотный детектор',
            },
        ]
    },
    {
        id: 'math-blocks',
        name: 'Математические',
        collapsed: false,
        blocks: [
            {
                id: 'integrator',
                name: DSP_BLOCK_TYPES.INTEGRATOR,
                icon: DSP_ICONS['Интегратор'],
                description: 'Интегратор',
            },
            {
                id: 'summer',
                name: DSP_BLOCK_TYPES.SUMMER,
                icon: DSP_ICONS['Сумматор'],
                description: 'Сумматор',
            },
            {
                id: 'multiplier',
                name: DSP_BLOCK_TYPES.MULTIPLIER,
                icon: DSP_ICONS['Перемножитель'],
                description: 'Перемножитель',
            },
        ]
    },
    {
        id: 'visualization',
        name: 'Визуализация',
        collapsed: false,
        blocks: [
            {
                id: 'oscilloscope',
                name: DSP_BLOCK_TYPES.OSCILLOSCOPE,
                icon: DSP_ICONS['Осциллограф'],
                description: 'Визуализация сигнала',
            },
            {
                id: 'constellation',
                name: DSP_BLOCK_TYPES.CONSTELLATION,
                icon: DSP_ICONS['Фазовое созвездие'],
                description: 'Фазовое созвездие',
            },
            {
                id: 'waterfall',
                name: DSP_BLOCK_TYPES.WATERFALL,
                icon: DSP_ICONS['Водопад'],
                description: 'Спектрограмма (Водопад)',
            },
        ]
    }
];

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

// Типы узлов без входов (генераторы)
export const INPUT_NODE_TYPES = [
    DSP_BLOCK_TYPES.INPUT_SIGNAL,
    DSP_BLOCK_TYPES.REF_SINE_GEN,
    DSP_BLOCK_TYPES.REF_COSINE_GEN
];

// Типы узлов без выходов (визуализация)
export const OUTPUT_NODE_TYPES = [
    DSP_BLOCK_TYPES.OSCILLOSCOPE,
    DSP_BLOCK_TYPES.SPECTRUM_ANALYZER,
    DSP_BLOCK_TYPES.CONSTELLATION,
    DSP_BLOCK_TYPES.WATERFALL
];
