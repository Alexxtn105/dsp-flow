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
import QAMModulatorPlugin from './generators/QAMModulatorPlugin';
import SquareWavePlugin from './generators/SquareWavePlugin';
import TriangleWavePlugin from './generators/TriangleWavePlugin';
import ImpulsePlugin from './generators/ImpulsePlugin';
import ChirpPlugin from './generators/ChirpPlugin';
import StepPlugin from './generators/StepPlugin';
import OFDMModulatorPlugin from './generators/OFDMModulatorPlugin';
import FSKModulatorPlugin from './generators/FSKModulatorPlugin';

// Каналы
import AWGNChannelPlugin from './channels/AWGNChannelPlugin';
import FadingChannelPlugin from './channels/FadingChannelPlugin';
import MultipathChannelPlugin from './channels/MultipathChannelPlugin';

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
import PulseShaperPlugin from './filters/PulseShaperPlugin';
import LMSFilterPlugin from './filters/LMSFilterPlugin';
import RLSFilterPlugin from './filters/RLSFilterPlugin';
import MatchedFilterPlugin from './filters/MatchedFilterPlugin';
import ZFEqualizerPlugin from './filters/ZFEqualizerPlugin';
import PIDControllerPlugin from './filters/PIDControllerPlugin';
import PolyphaseFilterPlugin from './filters/PolyphaseFilterPlugin';
import FractionalDelayPlugin from './filters/FractionalDelayPlugin';

// Аудио
import CompressorPlugin from './audio/CompressorPlugin';
import EqualizerPlugin from './audio/EqualizerPlugin';
import ReverbPlugin from './audio/ReverbPlugin';

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
import QuantizerPlugin from './math/QuantizerPlugin';
import SampleHoldPlugin from './math/SampleHoldPlugin';
import ConvolutionPlugin from './math/ConvolutionPlugin';

// Детекторы
import PhaseDetectorPlugin from './detectors/PhaseDetectorPlugin';
import FrequencyDetectorPlugin from './detectors/FrequencyDetectorPlugin';
import AmplitudeDetectorPlugin from './detectors/AmplitudeDetectorPlugin';
import PLLPlugin from './detectors/PLLPlugin';
import FrequencyDiscriminatorPlugin from './detectors/FrequencyDiscriminatorPlugin';
import AMFMPMDemodulatorPlugin from './detectors/AMFMPMDemodulatorPlugin';
import TimingRecoveryPlugin from './detectors/TimingRecoveryPlugin';
import QAMDemodulatorPlugin from './detectors/QAMDemodulatorPlugin';
import OFDMDemodulatorPlugin from './detectors/OFDMDemodulatorPlugin';
import FSKDemodulatorPlugin from './detectors/FSKDemodulatorPlugin';
import PeakDetectorPlugin from './detectors/PeakDetectorPlugin';
import PitchDetectorPlugin from './detectors/PitchDetectorPlugin';
import ZeroCrossingPlugin from './detectors/ZeroCrossingPlugin';

// Визуализация
import OscilloscopePlugin from './visualization/OscilloscopePlugin';
import ConstellationPlugin from './visualization/ConstellationPlugin';
import WaterfallPlugin from './visualization/WaterfallPlugin';
import NumericIndicatorPlugin from './visualization/NumericIndicatorPlugin';
import ComplexNumericIndicatorPlugin from './visualization/ComplexNumericIndicatorPlugin';
import MultiChannelSpectrumAnalyzerPlugin from './visualization/MultiChannelSpectrumAnalyzerPlugin';
import PowerMeterPlugin from './visualization/PowerMeterPlugin';
import SNRMeterPlugin from './visualization/SNRMeterPlugin';
import BERCounterPlugin from './visualization/BERCounterPlugin';
import HistogramPlugin from './visualization/HistogramPlugin';
import EyeDiagramPlugin from './visualization/EyeDiagramPlugin';

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
    PulseShaperPlugin,
    LMSFilterPlugin,
    RLSFilterPlugin,
    MatchedFilterPlugin,
    ZFEqualizerPlugin,
    PIDControllerPlugin,
    PolyphaseFilterPlugin,
    FractionalDelayPlugin,

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
    QAMModulatorPlugin,
    SquareWavePlugin,
    TriangleWavePlugin,
    ImpulsePlugin,
    ChirpPlugin,
    StepPlugin,
    OFDMModulatorPlugin,
    FSKModulatorPlugin,

    // Каналы
    AWGNChannelPlugin,
    FadingChannelPlugin,
    MultipathChannelPlugin,

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
    QAMDemodulatorPlugin,
    OFDMDemodulatorPlugin,
    FSKDemodulatorPlugin,
    PeakDetectorPlugin,
    PitchDetectorPlugin,
    ZeroCrossingPlugin,

    // Аудио
    CompressorPlugin,
    EqualizerPlugin,
    ReverbPlugin,

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
    QuantizerPlugin,
    SampleHoldPlugin,
    ConvolutionPlugin,

    // Визуализация
    OscilloscopePlugin,
    ConstellationPlugin,
    WaterfallPlugin,
    NumericIndicatorPlugin,
    ComplexNumericIndicatorPlugin,
    MultiChannelSpectrumAnalyzerPlugin,
    PowerMeterPlugin,
    SNRMeterPlugin,
    BERCounterPlugin,
    HistogramPlugin,
    EyeDiagramPlugin,

    // Вывод
    SpeakerPlugin,
];

export default allPlugins;
