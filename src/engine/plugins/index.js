// Генераторы
import SineGeneratorPlugin from './generators/SineGeneratorPlugin.js';
import CosineGeneratorPlugin from './generators/CosineGeneratorPlugin.js';
import RefSineGeneratorPlugin from './generators/RefSineGeneratorPlugin.js';
import RefCosineGeneratorPlugin from './generators/RefCosineGeneratorPlugin.js';
import AudioFilePlugin from './generators/AudioFilePlugin.js';

// Фильтры
import FIRFilterPlugin from './filters/FIRFilterPlugin.js';
import BandpassFIRPlugin from './filters/BandpassFIRPlugin.js';
import HighpassFIRPlugin from './filters/HighpassFIRPlugin.js';
import LowpassFIRPlugin from './filters/LowpassFIRPlugin.js';
import HilbertTransformerPlugin from './filters/HilbertTransformerPlugin.js';
import GoertzelFilterPlugin from './filters/GoertzelFilterPlugin.js';

// Анализ
import FFTPlugin from './analysis/FFTPlugin.js';
import SlidingFFTPlugin from './analysis/SlidingFFTPlugin.js';
import SpectrumAnalyzerPlugin from './analysis/SpectrumAnalyzerPlugin.js';

// Математические
import SummerPlugin from './math/SummerPlugin.js';
import MultiplierPlugin from './math/MultiplierPlugin.js';
import IntegratorPlugin from './math/IntegratorPlugin.js';

// Детекторы
import PhaseDetectorPlugin from './detectors/PhaseDetectorPlugin.js';
import FrequencyDetectorPlugin from './detectors/FrequencyDetectorPlugin.js';

// Визуализация
import OscilloscopePlugin from './visualization/OscilloscopePlugin.js';
import ConstellationPlugin from './visualization/ConstellationPlugin.js';
import WaterfallPlugin from './visualization/WaterfallPlugin.js';

// Вывод
import SpeakerPlugin from './output/SpeakerPlugin.js';

export default [
    // Фильтры
    FIRFilterPlugin,
    BandpassFIRPlugin,
    HighpassFIRPlugin,
    LowpassFIRPlugin,
    HilbertTransformerPlugin,
    GoertzelFilterPlugin,

    // Генераторы
    AudioFilePlugin,
    SineGeneratorPlugin,
    CosineGeneratorPlugin,
    RefSineGeneratorPlugin,
    RefCosineGeneratorPlugin,

    // Анализ
    SlidingFFTPlugin,
    FFTPlugin,
    SpectrumAnalyzerPlugin,

    // Детекторы
    PhaseDetectorPlugin,
    FrequencyDetectorPlugin,

    // Математические
    IntegratorPlugin,
    SummerPlugin,
    MultiplierPlugin,

    // Визуализация
    OscilloscopePlugin,
    ConstellationPlugin,
    WaterfallPlugin,

    // Вывод
    SpeakerPlugin,
];
