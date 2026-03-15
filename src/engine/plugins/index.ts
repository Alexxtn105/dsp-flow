// Генераторы
import SineGeneratorPlugin from './generators/SineGeneratorPlugin';
import CosineGeneratorPlugin from './generators/CosineGeneratorPlugin';
import RefSineGeneratorPlugin from './generators/RefSineGeneratorPlugin';
import RefCosineGeneratorPlugin from './generators/RefCosineGeneratorPlugin';
import AudioFilePlugin from './generators/AudioFilePlugin';
import ConstantPlugin from './generators/ConstantPlugin';
import NoiseGeneratorPlugin from './generators/NoiseGeneratorPlugin';
import AMFMPMModulatorPlugin from './generators/AMFMPMModulatorPlugin';
import PSKModulatorPlugin from './generators/PSKModulatorPlugin';

// Фильтры
import NotchFIRPlugin from './filters/NotchFIRPlugin';
import BandpassFIRPlugin from './filters/BandpassFIRPlugin';
import HighpassFIRPlugin from './filters/HighpassFIRPlugin';
import LowpassFIRPlugin from './filters/LowpassFIRPlugin';
import HilbertTransformerPlugin from './filters/HilbertTransformerPlugin';
import GoertzelFilterPlugin from './filters/GoertzelFilterPlugin';
import RemezFilterPlugin from './filters/RemezFilterPlugin';
import DelayLinePlugin from './filters/DelayLinePlugin';
import ComplexDelayLinePlugin from './filters/ComplexDelayLinePlugin';
import DecimatorInterpolatorPlugin from './filters/DecimatorInterpolatorPlugin';
import IIRFilterPlugin from './filters/IIRFilterPlugin';
import CICFilterPlugin from './filters/CICFilterPlugin';

// Анализ
import SpectrumAnalyzerPlugin from './analysis/SpectrumAnalyzerPlugin';
import CorrelatorPlugin from './analysis/CorrelatorPlugin';

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

// Детекторы
import PhaseDetectorPlugin from './detectors/PhaseDetectorPlugin';
import FrequencyDetectorPlugin from './detectors/FrequencyDetectorPlugin';
import AmplitudeDetectorPlugin from './detectors/AmplitudeDetectorPlugin';
import PLLPlugin from './detectors/PLLPlugin';
import FrequencyDiscriminatorPlugin from './detectors/FrequencyDiscriminatorPlugin';
import AMFMPMDemodulatorPlugin from './detectors/AMFMPMDemodulatorPlugin';
import TimingRecoveryPlugin from './detectors/TimingRecoveryPlugin';

// Визуализация
import OscilloscopePlugin from './visualization/OscilloscopePlugin';
import ConstellationPlugin from './visualization/ConstellationPlugin';
import WaterfallPlugin from './visualization/WaterfallPlugin';
import NumericIndicatorPlugin from './visualization/NumericIndicatorPlugin';
import ComplexNumericIndicatorPlugin from './visualization/ComplexNumericIndicatorPlugin';
import MultiChannelSpectrumAnalyzerPlugin from './visualization/MultiChannelSpectrumAnalyzerPlugin';

// Вывод
import SpeakerPlugin from './output/SpeakerPlugin';

import type { PluginDefinition } from '../types';

const allPlugins: PluginDefinition[] = [
    // Фильтры
    NotchFIRPlugin,
    BandpassFIRPlugin,
    HighpassFIRPlugin,
    LowpassFIRPlugin,
    HilbertTransformerPlugin,
    GoertzelFilterPlugin,
    RemezFilterPlugin,
    DelayLinePlugin,
    ComplexDelayLinePlugin,
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

export default allPlugins;
