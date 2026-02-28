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
        const params = getDefaultParams('Синусный генератор');
        expect(params).toHaveProperty('frequency', 1000);
        expect(params).toHaveProperty('amplitude', 1.0);
    });

    it('getBlockIcon возвращает иконку', () => {
        expect(getBlockIcon('Синусный генератор')).toBe('dsp-sine');
        expect(getBlockIcon('Режекторный КИХ-фильтр')).toBe('dsp-notch');
    });

    it('getBlockDescription возвращает описание', () => {
        expect(getBlockDescription('БПФ')).toBe('БПФ (размер кратен степени двойки)');
    });

    it('getBlockSignalConfig возвращает конфигурацию', () => {
        const config = getBlockSignalConfig('Синусный генератор');
        expect(config).toEqual({ input: null, output: 'real', inputsCount: 1 });
    });

    it('isGeneratorBlock определяет генераторы', () => {
        expect(isGeneratorBlock('Синусный генератор')).toBe(true);
        expect(isGeneratorBlock('Audio File')).toBe(true);
        expect(isGeneratorBlock('Режекторный КИХ-фильтр')).toBe(false);
        expect(isGeneratorBlock('Осциллограф')).toBe(false);
    });

    it('isVisualizationBlock определяет визуализации', () => {
        expect(isVisualizationBlock('Осциллограф')).toBe(true);
        expect(isVisualizationBlock('Динамик')).toBe(true);
        expect(isVisualizationBlock('Синусный генератор')).toBe(false);
    });
});
