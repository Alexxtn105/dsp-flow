/**
 * Инициализация системы плагинов
 *
 * Регистрирует все плагины, группы и опции параметров.
 * Вызывается один раз при старте приложения (до render).
 */

import registry from './PluginRegistry';
import allPlugins from './plugins';

export default function initPlugins(): void {
    // Регистрация групп (порядок определяет отображение в Toolbar)
    // Display names are in locales/*/groups.json
    registry.registerGroup({ id: 'generators', collapsed: false });
    registry.registerGroup({ id: 'filters', collapsed: false });
    registry.registerGroup({ id: 'channels', collapsed: false });
    registry.registerGroup({ id: 'detectors', collapsed: false });
    registry.registerGroup({ id: 'complex-math', collapsed: false });
    registry.registerGroup({ id: 'real-math', collapsed: false });
    registry.registerGroup({ id: 'audio', collapsed: false });
    registry.registerGroup({ id: 'visualization', collapsed: false });
    registry.registerGroup({ id: 'output', collapsed: false });

    // Регистрация опций параметров (выпадающие списки)
    // Labels are translation keys resolved at render time via params namespace
    registry.registerParamOptions('windowFunction', [
        { value: 'rectangular', labelKey: 'windowFunction.rectangular' },
        { value: 'hamming', labelKey: 'windowFunction.hamming' },
        { value: 'hanning', labelKey: 'windowFunction.hanning' },
        { value: 'blackman', labelKey: 'windowFunction.blackman' },
        { value: 'blackman-harris', labelKey: 'windowFunction.blackman-harris' },
        { value: 'nuttall', labelKey: 'windowFunction.nuttall' },
        { value: 'flattop', labelKey: 'windowFunction.flattop' }
    ]);

    registry.registerParamOptions('filterType', [
        { value: 'lowpass', labelKey: 'filterType.lowpass' },
        { value: 'highpass', labelKey: 'filterType.highpass' },
        { value: 'bandpass', labelKey: 'filterType.bandpass' }
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
        { value: '±180°', labelKey: 'outputRange.±180°' },
        { value: '±π', labelKey: 'outputRange.±π' },
        { value: '0-360°', labelKey: 'outputRange.0-360°' },
        { value: '0-2π', labelKey: 'outputRange.0-2π' }
    ]);

    registry.registerParamOptions('normalization', [
        { value: 'none', labelKey: 'normalization.none' },
        { value: 'average', labelKey: 'normalization.average' },
        { value: 'peak', labelKey: 'normalization.peak' }
    ]);

    registry.registerParamOptions('operation', [
        { value: 'multiply', labelKey: 'operation.multiply' },
        { value: 'divide', labelKey: 'operation.divide' }
    ]);

    registry.registerParamOptions('noiseType', [
        { value: 'white', labelKey: 'noiseType.white' },
        { value: 'pink', labelKey: 'noiseType.pink' },
        { value: 'brown', labelKey: 'noiseType.brown' }
    ]);

    registry.registerParamOptions('mode', [
        { value: 'decimate', labelKey: 'mode.decimate' },
        { value: 'interpolate', labelKey: 'mode.interpolate' }
    ]);

    registry.registerParamOptions('fskOrder', [
        { value: '2FSK', label: '2-FSK (BFSK)' },
        { value: '4FSK', label: '4-FSK' }
    ]);

    registry.registerParamOptions('resampleMode', [
        { value: 'upsample', labelKey: 'resampleMode.upsample' },
        { value: 'downsample', labelKey: 'resampleMode.downsample' }
    ]);

    registry.registerParamOptions('ofdmQamOrder', [
        { value: '4QAM', label: '4-QAM (QPSK)' },
        { value: '16QAM', label: '16-QAM' },
        { value: '64QAM', label: '64-QAM' }
    ]);

    registry.registerParamOptions('outputMode', [
        { value: 'deviation', labelKey: 'outputMode.deviation' },
        { value: 'absolute', labelKey: 'outputMode.absolute' }
    ]);

    registry.registerParamOptions('modulationType', [
        { value: 'AM', labelKey: 'modulationType.AM' },
        { value: 'FM', labelKey: 'modulationType.FM' },
        { value: 'PM', labelKey: 'modulationType.PM' }
    ]);

    registry.registerParamOptions('filterDesign', [
        { value: 'butterworth', labelKey: 'filterDesign.butterworth' },
        { value: 'chebyshev1', labelKey: 'filterDesign.chebyshev1' }
    ]);

    registry.registerParamOptions('iirFilterType', [
        { value: 'lowpass', labelKey: 'iirFilterType.lowpass' },
        { value: 'highpass', labelKey: 'iirFilterType.highpass' }
    ]);

    registry.registerParamOptions('gainMode', [
        { value: 'linear', labelKey: 'gainMode.linear' },
        { value: 'dB', labelKey: 'gainMode.dB' }
    ]);

    registry.registerParamOptions('logFunction', [
        { value: 'ln', labelKey: 'logFunction.ln' },
        { value: 'log10', labelKey: 'logFunction.log10' },
        { value: 'dB', labelKey: 'logFunction.dB' },
        { value: 'exp', labelKey: 'logFunction.exp' },
        { value: 'pow10', labelKey: 'logFunction.pow10' }
    ]);

    registry.registerParamOptions('sweepType', [
        { value: 'linear', labelKey: 'sweepType.linear' },
        { value: 'exponential', labelKey: 'sweepType.exponential' }
    ]);

    registry.registerParamOptions('quantizerType', [
        { value: 'mid-tread', labelKey: 'quantizerType.mid-tread' },
        { value: 'mid-rise', labelKey: 'quantizerType.mid-rise' }
    ]);

    registry.registerParamOptions('qamOrder', [
        { value: '16QAM', label: '16-QAM' },
        { value: '64QAM', label: '64-QAM' },
        { value: '256QAM', label: '256-QAM' }
    ]);

    registry.registerParamOptions('decisionType', [
        { value: 'hard', labelKey: 'decisionType.hard' },
        { value: 'soft', labelKey: 'decisionType.soft' }
    ]);

    registry.registerParamOptions('pulseType', [
        { value: 'rrc', labelKey: 'pulseType.rrc' },
        { value: 'rc', labelKey: 'pulseType.rc' },
        { value: 'gaussian', labelKey: 'pulseType.gaussian' }
    ]);

    registry.registerParamOptions('adaptiveAlgorithm', [
        { value: 'lms', label: 'LMS' },
        { value: 'nlms', label: 'NLMS' }
    ]);

    registry.registerParamOptions('fadingType', [
        { value: 'rayleigh', labelKey: 'fadingType.rayleigh' },
        { value: 'rician', labelKey: 'fadingType.rician' }
    ]);

    registry.registerParamOptions('templateType', [
        { value: 'rectangular', labelKey: 'templateType.rectangular' },
        { value: 'triangular', labelKey: 'templateType.triangular' },
        { value: 'sinusoidal', labelKey: 'templateType.sinusoidal' }
    ]);

    registry.registerParamOptions('pskConstellation', [
        { value: 'BPSK', label: 'BPSK' },
        { value: 'QPSK', label: 'QPSK' },
        { value: '8PSK', label: '8PSK' }
    ]);

    registry.registerParamOptions('costasMode', [
        { value: 'bpsk', label: 'BPSK' },
        { value: 'qpsk', label: 'QPSK' }
    ]);

    registry.registerParamOptions('preambleType', [
        { value: 'barker13', label: 'Barker-13' },
        { value: 'barker7', label: 'Barker-7' }
    ]);

    registry.registerParamOptions('wavelet', [
        { value: 'haar', label: 'Haar' }
    ]);

    registry.registerParamOptions('direction', [
        { value: 'rising', labelKey: 'direction.rising' },
        { value: 'falling', labelKey: 'direction.falling' }
    ]);

    // Регистрация всех плагинов
    registry.registerAll(allPlugins);

    // Замораживаем реестр
    registry.freeze();
}
