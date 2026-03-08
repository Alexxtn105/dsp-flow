/**
 * Инициализация системы плагинов
 *
 * Регистрирует все плагины, группы и опции параметров.
 * Вызывается один раз при старте приложения (до render).
 */

import registry from './PluginRegistry.js';
import allPlugins from './plugins/index.js';

export default function initPlugins() {
    // Регистрация групп (порядок определяет отображение в Toolbar)
    registry.registerGroup({ id: 'filters', name: 'Фильтры', collapsed: false });
    registry.registerGroup({ id: 'generators', name: 'Генераторы', collapsed: false });
    registry.registerGroup({ id: 'fft-blocks', name: 'БПФ/Анализ', collapsed: false });
    registry.registerGroup({ id: 'detectors', name: 'Детекторы', collapsed: false });
    registry.registerGroup({ id: 'math-blocks', name: 'Математические', collapsed: false });
    registry.registerGroup({ id: 'visualization', name: 'Визуализация', collapsed: false });
    registry.registerGroup({ id: 'output', name: 'Вывод', collapsed: false });

    // Регистрация опций параметров (выпадающие списки)
    registry.registerParamOptions('windowFunction', [
        { value: 'rectangular', label: 'Прямоугольное (Rectangular)' },
        { value: 'hamming', label: 'Хэмминга (Hamming)' },
        { value: 'hanning', label: 'Ханна (Hanning)' },
        { value: 'blackman', label: 'Блэкмана (Blackman)' },
        { value: 'blackman-harris', label: 'Блэкмана-Харриса (Blackman-Harris)' },
        { value: 'nuttall', label: 'Наттолла (Nuttall)' },
        { value: 'flattop', label: 'Flat Top' }
    ]);

    registry.registerParamOptions('filterType', [
        { value: 'lowpass', label: 'ФНЧ (Lowpass)' },
        { value: 'highpass', label: 'ФВЧ (Highpass)' },
        { value: 'bandpass', label: 'Полосовой (Bandpass)' }
    ]);

    registry.registerParamOptions('fftSize', [
        { value: 32, label: '32' },
        { value: 64, label: '64' },
        { value: 128, label: '128' },
        { value: 256, label: '256' },
        { value: 512, label: '512' },
        { value: 1024, label: '1024' },
        { value: 2048, label: '2048' },
        { value: 4096, label: '4096' },
        { value: 8192, label: '8192' },
        { value: 16384, label: '16384' },
        { value: 32768, label: '32768' }
    ]);

    registry.registerParamOptions('colorMap', [
        { value: 'audition', label: 'Adobe Audition' },
        { value: 'jet', label: 'Jet' },
        { value: 'hot', label: 'Hot' },
        { value: 'grayscale', label: 'Grayscale' }
    ]);

    registry.registerParamOptions('constellation', [
        { value: 'BPSK', label: 'BPSK' },
        { value: 'QPSK', label: 'QPSK' },
        { value: '8PSK', label: '8PSK' },
        { value: '16QAM', label: '16-QAM' },
        { value: '64QAM', label: '64-QAM' }
    ]);

    registry.registerParamOptions('outputRange', [
        { value: '±180°', label: '±180°' },
        { value: '±π', label: '±π (радианы)' },
        { value: '0-360°', label: '0–360°' },
        { value: '0-2π', label: '0–2π (радианы)' }
    ]);

    registry.registerParamOptions('normalization', [
        { value: 'none', label: 'Без нормализации' },
        { value: 'average', label: 'Среднее (÷N)' },
        { value: 'peak', label: 'По пиковому значению' }
    ]);

    registry.registerParamOptions('operation', [
        { value: 'multiply', label: 'Умножение' },
        { value: 'divide', label: 'Деление' }
    ]);

    registry.registerParamOptions('noiseType', [
        { value: 'white', label: 'Белый (White)' },
        { value: 'pink', label: 'Розовый (Pink)' },
        { value: 'brown', label: 'Красный/Броуновский (Brown)' }
    ]);

    registry.registerParamOptions('mode', [
        { value: 'decimate', label: 'Децимация (↓)' },
        { value: 'interpolate', label: 'Интерполяция (↑)' }
    ]);

    // Регистрация всех плагинов
    registry.registerAll(allPlugins);

    // Замораживаем реестр
    registry.freeze();
}
