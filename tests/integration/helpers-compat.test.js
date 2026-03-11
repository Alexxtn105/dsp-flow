import { describe, it, expect, beforeAll } from 'vitest';
import initPlugins from '../../src/engine/initPlugins.js';
import registry from '../../src/engine/PluginRegistry.js';
import {
    getDefaultParams,
    getBlockIcon,
    getBlockDescription,
    getBlockSignalConfig,
    isGeneratorBlock,
    isVisualizationBlock
} from '../../src/utils/helpers.js';

beforeAll(() => {
    registry.reset();
    initPlugins();
});

describe('helpers.js — обратная совместимость', () => {
    it('getDefaultParams возвращает параметры синусного генератора', () => {
        const params = getDefaultParams('sine-generator');
        expect(params).toHaveProperty('frequency', 1000);
        expect(params).toHaveProperty('amplitude', 1.0);
    });

    it('getBlockIcon возвращает иконку', () => {
        expect(getBlockIcon('sine-generator')).toBe('dsp-sine');
        expect(getBlockIcon('notch-fir-filter')).toBe('dsp-notch');
    });

    it('getBlockDescription возвращает описание', () => {
        expect(getBlockDescription('spectrum-analyzer')).toBe('Спектральный анализ');
    });

    it('getBlockSignalConfig возвращает конфигурацию', () => {
        const config = getBlockSignalConfig('sine-generator');
        expect(config).toEqual({ input: null, output: 'real', inputsCount: 1, outputsCount: 1 });
    });

    it('isGeneratorBlock определяет генераторы', () => {
        expect(isGeneratorBlock('sine-generator')).toBe(true);
        expect(isGeneratorBlock('audio-file')).toBe(true);
        expect(isGeneratorBlock('notch-fir-filter')).toBe(false);
        expect(isGeneratorBlock('oscilloscope')).toBe(false);
    });

    it('isVisualizationBlock определяет визуализации', () => {
        expect(isVisualizationBlock('oscilloscope')).toBe(true);
        expect(isVisualizationBlock('speaker')).toBe(true);
        expect(isVisualizationBlock('sine-generator')).toBe(false);
    });
});
