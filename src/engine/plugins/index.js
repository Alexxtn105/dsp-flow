// Генераторы
import SineGeneratorPlugin from './generators/SineGeneratorPlugin.js';
import CosineGeneratorPlugin from './generators/CosineGeneratorPlugin.js';
import RefSineGeneratorPlugin from './generators/RefSineGeneratorPlugin.js';
import RefCosineGeneratorPlugin from './generators/RefCosineGeneratorPlugin.js';
import AudioFilePlugin from './generators/AudioFilePlugin.js';

// Фильтры
import NotchFIRPlugin from './filters/NotchFIRPlugin.js';
import BandpassFIRPlugin from './filters/BandpassFIRPlugin.js';
import HighpassFIRPlugin from './filters/HighpassFIRPlugin.js';
import LowpassFIRPlugin from './filters/LowpassFIRPlugin.js';
import HilbertTransformerPlugin from './filters/HilbertTransformerPlugin.js';
import GoertzelFilterPlugin from './filters/GoertzelFilterPlugin.js';
import RemezFilterPlugin from './filters/RemezFilterPlugin.js';

// Анализ
import FFTPlugin from './analysis/FFTPlugin.js';
import SlidingFFTPlugin from './analysis/SlidingFFTPlugin.js';
import SpectrumAnalyzerPlugin from './analysis/SpectrumAnalyzerPlugin.js';

// Математические
import SummerPlugin from './math/SummerPlugin.js';
import MultiplierPlugin from './math/MultiplierPlugin.js';
import IntegratorPlugin from './math/IntegratorPlugin.js';
import RealPartPlugin from './math/RealPartPlugin.js';
import ImagPartPlugin from './math/ImagPartPlugin.js';

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
    NotchFIRPlugin,
    BandpassFIRPlugin,
    HighpassFIRPlugin,
    LowpassFIRPlugin,
    HilbertTransformerPlugin,
    GoertzelFilterPlugin,
    RemezFilterPlugin,

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
    RealPartPlugin,
    ImagPartPlugin,

    // Визуализация
    OscilloscopePlugin,
    ConstellationPlugin,
    WaterfallPlugin,

    // Вывод
    SpeakerPlugin,
];
