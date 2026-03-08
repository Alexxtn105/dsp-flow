// Генераторы
import SineGeneratorPlugin from './generators/SineGeneratorPlugin.js';
import CosineGeneratorPlugin from './generators/CosineGeneratorPlugin.js';
import RefSineGeneratorPlugin from './generators/RefSineGeneratorPlugin.js';
import RefCosineGeneratorPlugin from './generators/RefCosineGeneratorPlugin.js';
import AudioFilePlugin from './generators/AudioFilePlugin.js';
import ConstantPlugin from './generators/ConstantPlugin.js';

// Фильтры
import NotchFIRPlugin from './filters/NotchFIRPlugin.js';
import BandpassFIRPlugin from './filters/BandpassFIRPlugin.js';
import HighpassFIRPlugin from './filters/HighpassFIRPlugin.js';
import LowpassFIRPlugin from './filters/LowpassFIRPlugin.js';
import HilbertTransformerPlugin from './filters/HilbertTransformerPlugin.js';
import GoertzelFilterPlugin from './filters/GoertzelFilterPlugin.js';
import RemezFilterPlugin from './filters/RemezFilterPlugin.js';
import DelayLinePlugin from './filters/DelayLinePlugin.js';

// Анализ
import SpectrumAnalyzerPlugin from './analysis/SpectrumAnalyzerPlugin.js';

// Математические
import SummerPlugin from './math/SummerPlugin.js';
import MultiplierPlugin from './math/MultiplierPlugin.js';
import IntegratorPlugin from './math/IntegratorPlugin.js';
import RealPartPlugin from './math/RealPartPlugin.js';
import ImagPartPlugin from './math/ImagPartPlugin.js';
import ComplexMultiplierPlugin from './math/ComplexMultiplierPlugin.js';
import ComplexSummerPlugin from './math/ComplexSummerPlugin.js';
import ComplexSquarePlugin from './math/ComplexSquarePlugin.js';
import ComplexSqrtPlugin from './math/ComplexSqrtPlugin.js';
import ComplexPhasePlugin from './math/ComplexPhasePlugin.js';
import ComplexMagnitudePlugin from './math/ComplexMagnitudePlugin.js';
import ComplexComposerPlugin from './math/ComplexComposerPlugin.js';
import ComplexConjugatePlugin from './math/ComplexConjugatePlugin.js';
import RealSquarePlugin from './math/RealSquarePlugin.js';
import RealPower4Plugin from './math/RealPower4Plugin.js';
import Atan2Plugin from './math/Atan2Plugin.js';

// Детекторы
import PhaseDetectorPlugin from './detectors/PhaseDetectorPlugin.js';
import FrequencyDetectorPlugin from './detectors/FrequencyDetectorPlugin.js';
import AmplitudeDetectorPlugin from './detectors/AmplitudeDetectorPlugin.js';
import PLLPlugin from './detectors/PLLPlugin.js';

// Визуализация
import OscilloscopePlugin from './visualization/OscilloscopePlugin.js';
import ConstellationPlugin from './visualization/ConstellationPlugin.js';
import WaterfallPlugin from './visualization/WaterfallPlugin.js';
import NumericIndicatorPlugin from './visualization/NumericIndicatorPlugin.js';
import ComplexNumericIndicatorPlugin from './visualization/ComplexNumericIndicatorPlugin.js';
import MultiChannelSpectrumAnalyzerPlugin from './visualization/MultiChannelSpectrumAnalyzerPlugin.js';

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
    DelayLinePlugin,

    // Генераторы
    AudioFilePlugin,
    ConstantPlugin,
    SineGeneratorPlugin,
    CosineGeneratorPlugin,
    RefSineGeneratorPlugin,
    RefCosineGeneratorPlugin,

    // Анализ
    SpectrumAnalyzerPlugin,

    // Детекторы
    PhaseDetectorPlugin,
    FrequencyDetectorPlugin,
    AmplitudeDetectorPlugin,
    PLLPlugin,

    // Математические
    IntegratorPlugin,
    SummerPlugin,
    MultiplierPlugin,
    RealPartPlugin,
    ImagPartPlugin,
    ComplexMultiplierPlugin,
    ComplexSummerPlugin,
    ComplexSquarePlugin,
    ComplexSqrtPlugin,
    ComplexPhasePlugin,
    ComplexMagnitudePlugin,
    ComplexComposerPlugin,
    ComplexConjugatePlugin,
    RealSquarePlugin,
    RealPower4Plugin,
    Atan2Plugin,

    // Визуализация
    OscilloscopePlugin,
    ConstellationPlugin,
    WaterfallPlugin,
    NumericIndicatorPlugin,
    ComplexNumericIndicatorPlugin,
    MultiChannelSpectrumAnalyzerPlugin,

    // Вывод
    SpeakerPlugin,
];
