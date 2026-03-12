// Генераторы
import SineGeneratorPlugin from './generators/SineGeneratorPlugin.js';
import CosineGeneratorPlugin from './generators/CosineGeneratorPlugin.js';
import RefSineGeneratorPlugin from './generators/RefSineGeneratorPlugin.js';
import RefCosineGeneratorPlugin from './generators/RefCosineGeneratorPlugin.js';
import AudioFilePlugin from './generators/AudioFilePlugin.js';
import ConstantPlugin from './generators/ConstantPlugin.js';
import NoiseGeneratorPlugin from './generators/NoiseGeneratorPlugin.js';
import AMFMPMModulatorPlugin from './generators/AMFMPMModulatorPlugin.js';
import PSKModulatorPlugin from './generators/PSKModulatorPlugin.js';

// Фильтры
import NotchFIRPlugin from './filters/NotchFIRPlugin.js';
import BandpassFIRPlugin from './filters/BandpassFIRPlugin.js';
import HighpassFIRPlugin from './filters/HighpassFIRPlugin.js';
import LowpassFIRPlugin from './filters/LowpassFIRPlugin.js';
import HilbertTransformerPlugin from './filters/HilbertTransformerPlugin.js';
import GoertzelFilterPlugin from './filters/GoertzelFilterPlugin.js';
import RemezFilterPlugin from './filters/RemezFilterPlugin.js';
import DelayLinePlugin from './filters/DelayLinePlugin.js';
import DecimatorInterpolatorPlugin from './filters/DecimatorInterpolatorPlugin.js';
import IIRFilterPlugin from './filters/IIRFilterPlugin.js';
import CICFilterPlugin from './filters/CICFilterPlugin.js';

// Анализ
import SpectrumAnalyzerPlugin from './analysis/SpectrumAnalyzerPlugin.js';

// Математические
import SummerPlugin from './math/SummerPlugin';
import MultiplierPlugin from './math/MultiplierPlugin';
import IntegratorPlugin from './math/IntegratorPlugin';
import RealPartPlugin from './math/RealPartPlugin';
import ImagPartPlugin from './math/ImagPartPlugin';
import ComplexMultiplierPlugin from './math/ComplexMultiplierPlugin';
import ComplexSummerPlugin from './math/ComplexSummerPlugin';
import ComplexSquarePlugin from './math/ComplexSquarePlugin';
import ComplexSqrtPlugin from './math/ComplexSqrtPlugin';
import ComplexPhasePlugin from './math/ComplexPhasePlugin';
import ComplexMagnitudePlugin from './math/ComplexMagnitudePlugin';
import ComplexComposerPlugin from './math/ComplexComposerPlugin';
import ComplexConjugatePlugin from './math/ComplexConjugatePlugin';
import RealSquarePlugin from './math/RealSquarePlugin';
import RealSqrtPlugin from './math/RealSqrtPlugin';
import RealPower4Plugin from './math/RealPower4Plugin';
import Atan2Plugin from './math/Atan2Plugin';
import AGCPlugin from './math/AGCPlugin';
import AbsoluteValuePlugin from './math/AbsoluteValuePlugin';
import MixerPlugin from './math/MixerPlugin';
import ThresholdPlugin from './math/ThresholdPlugin';
import GainPlugin from './math/GainPlugin';
import LogExpPlugin from './math/LogExpPlugin';
import CorrelatorPlugin from './analysis/CorrelatorPlugin.js';

// Детекторы
import PhaseDetectorPlugin from './detectors/PhaseDetectorPlugin.js';
import FrequencyDetectorPlugin from './detectors/FrequencyDetectorPlugin.js';
import AmplitudeDetectorPlugin from './detectors/AmplitudeDetectorPlugin.js';
import PLLPlugin from './detectors/PLLPlugin.js';
import FrequencyDiscriminatorPlugin from './detectors/FrequencyDiscriminatorPlugin.js';
import AMFMPMDemodulatorPlugin from './detectors/AMFMPMDemodulatorPlugin.js';
import TimingRecoveryPlugin from './detectors/TimingRecoveryPlugin.js';

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
    DecimatorInterpolatorPlugin,
    IIRFilterPlugin,
    CICFilterPlugin,

    // Генераторы
    AudioFilePlugin,
    ConstantPlugin,
    SineGeneratorPlugin,
    CosineGeneratorPlugin,
    RefSineGeneratorPlugin,
    RefCosineGeneratorPlugin,
    NoiseGeneratorPlugin,
    AMFMPMModulatorPlugin,
    PSKModulatorPlugin,

    // Анализ
    SpectrumAnalyzerPlugin,

    // Детекторы
    PhaseDetectorPlugin,
    FrequencyDetectorPlugin,
    AmplitudeDetectorPlugin,
    PLLPlugin,
    FrequencyDiscriminatorPlugin,
    AMFMPMDemodulatorPlugin,
    TimingRecoveryPlugin,

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
    RealSqrtPlugin,
    RealPower4Plugin,
    Atan2Plugin,
    AGCPlugin,
    AbsoluteValuePlugin,
    MixerPlugin,
    ThresholdPlugin,
    GainPlugin,
    LogExpPlugin,
    CorrelatorPlugin,

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
