/**
 * Инициализация реестра плагинов и экспорт legacy-совместимых констант
 */
import PluginRegistry from './PluginRegistry';

// Фильтры
import FIRFilterPlugin from './filters/FIRFilterPlugin';
import BandpassFIRPlugin from './filters/BandpassFIRPlugin';
import HighpassFIRPlugin from './filters/HighpassFIRPlugin';
import LowpassFIRPlugin from './filters/LowpassFIRPlugin';
import HilbertTransformerPlugin from './filters/HilbertTransformerPlugin';
import GoertzelFilterPlugin from './filters/GoertzelFilterPlugin';

// Генераторы
import AudioFilePlugin from './generators/AudioFilePlugin';
import InputSignalPlugin from './generators/InputSignalPlugin';
import SineGeneratorPlugin from './generators/SineGeneratorPlugin';
import CosineGeneratorPlugin from './generators/CosineGeneratorPlugin';

// БПФ/Анализ
import SlidingFFTPlugin from './fft/SlidingFFTPlugin';
import FFTPlugin from './fft/FFTPlugin';
import SpectrumAnalyzerPlugin from './fft/SpectrumAnalyzerPlugin';

// Детекторы
import PhaseDetectorPlugin from './detectors/PhaseDetectorPlugin';
import FrequencyDetectorPlugin from './detectors/FrequencyDetectorPlugin';

// Математические
import IntegratorPlugin from './math/IntegratorPlugin';
import SummerPlugin from './math/SummerPlugin';
import MultiplierPlugin from './math/MultiplierPlugin';

// Визуализация
import OscilloscopePlugin from './visualization/OscilloscopePlugin';
import ConstellationPlugin from './visualization/ConstellationPlugin';

// --- Создание singleton ---

const registry = new PluginRegistry();

// Определение групп UI (порядок = порядок отображения в Toolbar)
registry.defineGroup('filters', 'Фильтры', 0);
registry.defineGroup('generators', 'Генераторы', 1);
registry.defineGroup('fft-blocks', 'БПФ/Анализ', 2);
registry.defineGroup('detectors', 'Детекторы', 3);
registry.defineGroup('math-blocks', 'Математические', 4);
registry.defineGroup('visualization', 'Визуализация', 5);

// Регистрация всех плагинов
registry.register(FIRFilterPlugin);
registry.register(BandpassFIRPlugin);
registry.register(HighpassFIRPlugin);
registry.register(LowpassFIRPlugin);
registry.register(HilbertTransformerPlugin);
registry.register(GoertzelFilterPlugin);

registry.register(AudioFilePlugin);
registry.register(InputSignalPlugin);
registry.register(SineGeneratorPlugin);
registry.register(CosineGeneratorPlugin);

registry.register(SlidingFFTPlugin);
registry.register(FFTPlugin);
registry.register(SpectrumAnalyzerPlugin);

registry.register(PhaseDetectorPlugin);
registry.register(FrequencyDetectorPlugin);

registry.register(IntegratorPlugin);
registry.register(SummerPlugin);
registry.register(MultiplierPlugin);

registry.register(OscilloscopePlugin);
registry.register(ConstellationPlugin);

// Заморозка — построение индексов, запрет изменений
registry.freeze();

// --- Legacy-совместимые экспорты (формат = текущий формат из constants.js) ---

export const DSP_BLOCK_TYPES = registry.getBlockTypes();

export const BLOCK_SIGNAL_CONFIG = registry.getSignalConfig();

export const DSP_ICONS = {
    ...registry.getIcons(),
    // Иконки действий UI (не являются блоками)
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
    'group_collapse': 'expand_less',
};

export const DEFAULT_BLOCK_PARAMS = registry.getDefaultParamsMap();

export const DSP_GROUPS = registry.getGroups();

export const INPUT_NODE_TYPES = registry.getInputNodeTypes();

export const OUTPUT_NODE_TYPES = registry.getOutputNodeTypes();

export { registry };
export default registry;
