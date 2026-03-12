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

// Типы блоков DSP (machine IDs — display names in locales/*/blocks.json)
export const DSP_BLOCK_TYPES = {
    // Фильтры
    NOTCH_FIR: 'notch-fir-filter',
    BANDPASS_FIR: 'bandpass-fir-filter',
    HIGHPASS_FIR: 'highpass-fir-filter',
    LOWPASS_FIR: 'lowpass-fir-filter',
    HILBERT_TRANSFORMER: 'hilbert-transformer',
    GOERTZEL_FILTER: 'goertzel-filter',
    REMEZ_FILTER: 'remez-filter',
    DELAY_LINE: 'delay-line',
    DECIMATOR_INTERPOLATOR: 'decimator-interpolator',
    IIR_FILTER: 'iir-filter',
    CIC_FILTER: 'cic-filter',

    // Генераторы
    CONSTANT: 'constant',
    AUDIO_FILE: 'audio-file',
    SINE_GENERATOR: 'sine-generator',
    COSINE_GENERATOR: 'cosine-generator',
    REF_SINE_GEN: 'ref-sine-generator',
    REF_COSINE_GEN: 'ref-cosine-generator',
    NOISE_GENERATOR: 'noise-generator',
    AMFMPM_MODULATOR: 'amfmpm-modulator',
    PSK_MODULATOR: 'psk-modulator',

    // Детекторы
    PHASE_DETECTOR: 'phase-detector',
    FREQUENCY_DETECTOR: 'frequency-detector',
    AMPLITUDE_DETECTOR: 'amplitude-detector',
    FREQUENCY_DISCRIMINATOR: 'frequency-discriminator',
    AMFMPM_DEMODULATOR: 'amfmpm-demodulator',
    TIMING_RECOVERY: 'timing-recovery',

    // Математические
    INTEGRATOR: 'integrator',
    SUMMER: 'summer',
    MULTIPLIER: 'multiplier',
    COMPLEX_MULTIPLIER: 'complex-multiplier',
    COMPLEX_SUMMER: 'complex-summer',
    COMPLEX_SQUARE: 'complex-square',
    COMPLEX_SQRT: 'complex-sqrt',
    COMPLEX_PHASE: 'complex-phase',
    COMPLEX_MAGNITUDE: 'complex-magnitude',
    COMPLEX_COMPOSER: 'complex-composer',
    COMPLEX_CONJUGATE: 'complex-conjugate',
    REAL_SQUARE: 'real-square',
    REAL_SQRT: 'real-sqrt',
    REAL_POWER4: 'real-power4',
    ATAN2: 'atan2',
    AGC: 'agc',
    ABSOLUTE_VALUE: 'absolute-value',
    MIXER: 'mixer',
    THRESHOLD: 'threshold',
    GAIN: 'gain',
    LOG_EXP: 'log-exp',
    CORRELATOR: 'correlator',

    PLL: 'pll',

    // Визуализация
    SPECTRUM_ANALYZER: 'spectrum-analyzer',
    OSCILLOSCOPE: 'oscilloscope',
    CONSTELLATION: 'constellation',
    WATERFALL: 'waterfall',
    NUMERIC_INDICATOR: 'numeric-indicator',
    COMPLEX_NUMERIC_INDICATOR: 'complex-numeric-indicator',
    MULTI_SPECTRUM_ANALYZER: 'multi-channel-spectrum-analyzer',
    SPEAKER: 'speaker'
};

/**
 * Migration map: old Russian type names → new machine IDs
 * Used to load schemes saved before i18n refactoring
 */
export const LEGACY_TYPE_TO_ID = {
    'Режекторный КИХ-фильтр': 'notch-fir-filter',
    'Полосовой КИХ-фильтр': 'bandpass-fir-filter',
    'ФВЧ КИХ-фильтр': 'highpass-fir-filter',
    'ФНЧ КИХ-фильтр': 'lowpass-fir-filter',
    'Преобразователь Гильберта': 'hilbert-transformer',
    'Фильтр Герцеля': 'goertzel-filter',
    'Фильтр Ремеза': 'remez-filter',
    'Линия задержки': 'delay-line',
    'Децимация/Интерполяция': 'decimator-interpolator',
    'БИХ-фильтр': 'iir-filter',
    'CIC-фильтр': 'cic-filter',
    'Константа': 'constant',
    'Audio File': 'audio-file',
    'Синусный генератор': 'sine-generator',
    'Косинусный генератор': 'cosine-generator',
    'Референсный синусный генератор': 'ref-sine-generator',
    'Референсный косинусный генератор': 'ref-cosine-generator',
    'Генератор шума': 'noise-generator',
    'АМ/ЧМ/ФМ модулятор': 'amfmpm-modulator',
    'PSK модулятор': 'psk-modulator',
    'Фазовый детектор': 'phase-detector',
    'Частотный детектор': 'frequency-detector',
    'Амплитудный детектор': 'amplitude-detector',
    'Частотный дискриминатор': 'frequency-discriminator',
    'АМ/ЧМ/ФМ демодулятор': 'amfmpm-demodulator',
    'Символьная синхронизация': 'timing-recovery',
    'Интегратор': 'integrator',
    'Сумматор': 'summer',
    'Перемножитель': 'multiplier',
    'Комплексный перемножитель': 'complex-multiplier',
    'Комплексный сумматор': 'complex-summer',
    'Комплексный квадрат': 'complex-square',
    'Комплексный корень': 'complex-sqrt',
    'Фаза (комплексная)': 'complex-phase',
    'Амплитуда (комплексная)': 'complex-magnitude',
    'Формирователь комплексного': 'complex-composer',
    'Комплексное сопряжение': 'complex-conjugate',
    'Квадрат (действ.)': 'real-square',
    'Квадратный корень (действ.)': 'real-sqrt',
    'Степень 4 (действ.)': 'real-power4',
    'Арктангенс': 'atan2',
    'АРУ': 'agc',
    'Абсолютное значение': 'absolute-value',
    'Смеситель': 'mixer',
    'Компаратор': 'threshold',
    'Усилитель': 'gain',
    'Логарифм/Экспонента': 'log-exp',
    'Коррелятор': 'correlator',
    'ФАПЧ': 'pll',
    'Спектроанализатор': 'spectrum-analyzer',
    'Осциллограф': 'oscilloscope',
    'Фазовое созвездие': 'constellation',
    'Водопад': 'waterfall',
    'Числовой индикатор': 'numeric-indicator',
    'Комплексный числовой индикатор': 'complex-numeric-indicator',
    'Многоканальный спектроанализатор': 'multi-channel-spectrum-analyzer',
    'Динамик': 'speaker',
    'Re (действ. часть)': 'real-part',
    'Im (мнимая часть)': 'imag-part',
    'КИХ-фильтр': 'fir-filter',
    'Пороговый детектор': 'threshold',
    'Диаграмма созвездия': 'constellation',
    'Спектрограмма': 'waterfall',
    'Speaker': 'speaker'
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
