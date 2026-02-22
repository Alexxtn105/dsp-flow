import { describe, it, expect, beforeEach } from 'vitest';
import registry from '../../src/engine/PluginRegistry.js';

function makePlugin(overrides = {}) {
    return {
        type: overrides.type || 'Тестовый блок',
        id: overrides.id || 'test-block',
        icon: overrides.icon || 'widgets',
        description: overrides.description || 'Тест',
        group: overrides.group || 'test-group',
        signals: overrides.signals || { input: 'real', output: 'real' },
        defaultParams: overrides.defaultParams || { value: 42 },
        processor: overrides.processor || {
            process(inputs, params, chunkSize) {
                return inputs[0] || new Float32Array(chunkSize);
            }
        },
        ...overrides
    };
}

describe('PluginRegistry', () => {
    beforeEach(() => {
        registry.reset();
    });

    // --- Регистрация ---

    it('регистрирует плагин и находит его', () => {
        const plugin = makePlugin();
        registry.register(plugin);
        expect(registry.has('Тестовый блок')).toBe(true);
    });

    it('registerAll регистрирует массив плагинов', () => {
        const plugins = [
            makePlugin({ type: 'Блок A', id: 'a' }),
            makePlugin({ type: 'Блок B', id: 'b' }),
        ];
        registry.registerAll(plugins);
        expect(registry.has('Блок A')).toBe(true);
        expect(registry.has('Блок B')).toBe(true);
    });

    it('выбрасывает ошибку при дублировании типа', () => {
        registry.register(makePlugin());
        expect(() => registry.register(makePlugin())).toThrow(/уже зарегистрирован/);
    });

    it('выбрасывает ошибку при отсутствии обязательного поля', () => {
        const bad = { type: 'X' }; // нет остальных полей
        expect(() => registry.register(bad)).toThrow(/обязательное поле/);
    });

    it('выбрасывает ошибку если process не функция', () => {
        const bad = makePlugin({ processor: { process: 'not a function' } });
        expect(() => registry.register(bad)).toThrow(/processor.process/);
    });

    // --- freeze ---

    it('freeze запрещает дальнейшую регистрацию', () => {
        registry.freeze();
        expect(() => registry.register(makePlugin())).toThrow(/заморожен/);
    });

    it('freeze запрещает registerGroup', () => {
        registry.freeze();
        expect(() => registry.registerGroup({ id: 'x', name: 'X', collapsed: false })).toThrow(/заморожен/);
    });

    it('freeze запрещает registerParamOptions', () => {
        registry.freeze();
        expect(() => registry.registerParamOptions('x', [])).toThrow(/заморожен/);
    });

    // --- Доступ к данным ---

    it('getProcessor возвращает процессор', () => {
        const plugin = makePlugin();
        registry.register(plugin);
        const proc = registry.getProcessor('Тестовый блок');
        expect(typeof proc.process).toBe('function');
    });

    it('getProcessor возвращает null для незарегистрированного', () => {
        expect(registry.getProcessor('Несуществующий')).toBeNull();
    });

    it('getSignalConfig возвращает конфигурацию сигналов', () => {
        registry.register(makePlugin({ signals: { input: null, output: 'real' } }));
        const config = registry.getSignalConfig('Тестовый блок');
        expect(config).toEqual({ input: null, output: 'real', inputsCount: 1 });
    });

    it('getSignalConfig возвращает дефолт для незарегистрированного', () => {
        const config = registry.getSignalConfig('???');
        expect(config).toEqual({ input: 'real', output: 'real', inputsCount: 1 });
    });

    it('getDefaultParams возвращает параметры', () => {
        registry.register(makePlugin({ defaultParams: { freq: 1000 } }));
        expect(registry.getDefaultParams('Тестовый блок')).toEqual({ freq: 1000 });
    });

    it('getIcon и getDescription', () => {
        registry.register(makePlugin({ icon: 'waves', description: 'Описание' }));
        expect(registry.getIcon('Тестовый блок')).toBe('waves');
        expect(registry.getDescription('Тестовый блок')).toBe('Описание');
    });

    // --- isGenerator / isVisualization ---

    it('isGenerator определяет генератор (input: null)', () => {
        registry.register(makePlugin({ type: 'Gen', id: 'gen', signals: { input: null, output: 'real' } }));
        expect(registry.isGenerator('Gen')).toBe(true);
        expect(registry.isVisualization('Gen')).toBe(false);
    });

    it('isVisualization определяет визуализацию (output: null)', () => {
        registry.register(makePlugin({ type: 'Viz', id: 'viz', signals: { input: 'real', output: null } }));
        expect(registry.isVisualization('Viz')).toBe(true);
        expect(registry.isGenerator('Viz')).toBe(false);
    });

    // --- Группы ---

    it('getGroups возвращает группы с блоками', () => {
        registry.registerGroup({ id: 'g1', name: 'Группа 1', collapsed: false });
        registry.register(makePlugin({ type: 'A', id: 'a', group: 'g1' }));
        registry.register(makePlugin({ type: 'B', id: 'b', group: 'g1' }));
        registry.register(makePlugin({ type: 'C', id: 'c', group: 'g2' }));

        const groups = registry.getGroups();
        expect(groups).toHaveLength(1);
        expect(groups[0].blocks).toHaveLength(2);
        expect(groups[0].blocks[0].name).toBe('A');
    });

    // --- paramOptions ---

    it('registerParamOptions и getParamOptions', () => {
        const opts = [{ value: 'a', label: 'A' }];
        registry.registerParamOptions('testParam', opts);
        expect(registry.getParamOptions('testParam')).toEqual(opts);
        expect(registry.getParamOptions('missing')).toBeNull();
    });

    // --- clearAllStates ---

    it('clearAllStates вызывает clearStates у процессоров', () => {
        let cleared = false;
        registry.register(makePlugin({
            processor: {
                process() { return new Float32Array(0); },
                clearStates() { cleared = true; }
            }
        }));
        registry.clearAllStates();
        expect(cleared).toBe(true);
    });

    // --- reset ---

    it('reset полностью очищает реестр', () => {
        registry.register(makePlugin());
        registry.registerGroup({ id: 'g', name: 'G', collapsed: false });
        registry.registerParamOptions('p', []);
        registry.freeze();

        registry.reset();

        expect(registry.has('Тестовый блок')).toBe(false);
        expect(registry.getGroups()).toHaveLength(0);
        expect(registry.getParamOptions('p')).toBeNull();
        // После reset можно снова регистрировать
        expect(() => registry.register(makePlugin())).not.toThrow();
    });
});
