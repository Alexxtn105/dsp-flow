/**
 * PluginRegistry - реестр DSP-плагинов (singleton)
 *
 * Централизует регистрацию блоков: один плагин = один блок
 * со всеми метаданными и процессором.
 */

import {
    isStatefulProcessor,
} from './types';
import type {
    PluginDefinition,
    Processor,
    PluginGroup,
    PluginGroupWithBlocks,
    ParamOption,
    SignalConfig,
} from './types';

const REQUIRED_FIELDS: (keyof PluginDefinition)[] = ['type', 'id', 'icon', 'description', 'group', 'signals', 'defaultParams', 'processor'];

class PluginRegistry {
    #plugins: Map<string, PluginDefinition> = new Map();
    #groups: PluginGroup[] = [];
    #paramOptions: Record<string, ParamOption[]> = {};
    #frozen = false;

    // ─── Регистрация ───

    register(plugin: PluginDefinition): void {
        if (this.#frozen) {
            throw new Error(`PluginRegistry заморожен, невозможно зарегистрировать "${plugin?.id}"`);
        }

        for (const field of REQUIRED_FIELDS) {
            if (plugin[field] === undefined) {
                throw new Error(`Плагин "${plugin?.id || '?'}" не содержит обязательное поле "${field}"`);
            }
        }

        if (typeof plugin.processor.process !== 'function') {
            throw new Error(`Плагин "${plugin.id}" должен иметь processor.process()`);
        }

        if (this.#plugins.has(plugin.id)) {
            throw new Error(`Плагин "${plugin.id}" уже зарегистрирован`);
        }

        this.#plugins.set(plugin.id, plugin);
    }

    registerAll(plugins: PluginDefinition[]): void {
        for (const plugin of plugins) {
            this.register(plugin);
        }
    }

    registerGroup(group: PluginGroup): void {
        if (this.#frozen) {
            throw new Error('PluginRegistry заморожен');
        }
        this.#groups.push(group);
    }

    registerParamOptions(name: string, options: ParamOption[]): void {
        if (this.#frozen) {
            throw new Error('PluginRegistry заморожен');
        }
        this.#paramOptions[name] = options;
    }

    // ─── Доступ к данным ───

    getProcessor(type: string): Processor | null {
        return this.#plugins.get(type)?.processor || null;
    }

    getSignalConfig(type: string): SignalConfig {
        const plugin = this.#plugins.get(type);
        if (!plugin) {
            return { input: 'real', output: 'real', inputsCount: 1, outputsCount: 1 };
        }
        const config: SignalConfig = {
            input: plugin.signals.input,
            output: plugin.signals.output,
            inputsCount: plugin.signals.inputsCount || 1,
            outputsCount: plugin.signals.outputsCount || 1
        };
        if (plugin.signals.inputLabels) {
            config.inputLabels = plugin.signals.inputLabels;
        }
        if (plugin.signals.outputLabels) {
            config.outputLabels = plugin.signals.outputLabels;
        }
        if (plugin.signals.outputTypes) {
            config.outputTypes = plugin.signals.outputTypes;
        }
        return config;
    }

    getDefaultParams(type: string): Record<string, unknown> {
        return this.#plugins.get(type)?.defaultParams || {};
    }

    getIcon(type: string): string {
        return this.#plugins.get(type)?.icon || 'widgets';
    }

    getDescription(type: string): string {
        return this.#plugins.get(type)?.description || type;
    }

    // ─── Запросы ───

    isGenerator(type: string): boolean {
        const plugin = this.#plugins.get(type);
        return plugin ? plugin.signals.input === null && plugin.signals.output !== null : false;
    }

    isVisualization(type: string): boolean {
        const plugin = this.#plugins.get(type);
        return plugin ? plugin.signals.output === null && plugin.signals.input !== null : false;
    }

    isParametric(type: string): boolean {
        const plugin = this.#plugins.get(type);
        return plugin ? plugin.signals.input === null && plugin.signals.output === null : false;
    }

    getGroups(): PluginGroupWithBlocks[] {
        return this.#groups.map(group => ({
            ...group,
            blocks: [...this.#plugins.values()]
                .filter(p => p.group === group.id)
                .map(p => ({
                    id: p.id,
                    name: p.id,
                    icon: p.icon,
                    description: p.description
                }))
        }));
    }

    getParamOptions(key: string): ParamOption[] | null {
        return this.#paramOptions[key] || null;
    }

    has(type: string): boolean {
        return this.#plugins.has(type);
    }

    // ─── Управление состоянием ───

    clearAllStates(): void {
        for (const plugin of this.#plugins.values()) {
            // Проверяем наличие метода clearStates напрямую:
            // не все процессоры с clearStates имеют states: Map (duck typing)
            const proc = plugin.processor;
            if ('clearStates' in proc && typeof proc.clearStates === 'function') {
                try {
                    proc.clearStates();
                } catch {
                    // Продолжаем очистку остальных плагинов
                }
            }
        }
    }

    clearStatesForRemovedNodes(activeNodeIds: Set<string>): void {
        for (const plugin of this.#plugins.values()) {
            if (isStatefulProcessor(plugin.processor)) {
                for (const nodeId of plugin.processor.states.keys()) {
                    if (!activeNodeIds.has(nodeId)) {
                        plugin.processor.states.delete(nodeId);
                    }
                }
            }
        }
    }

    freeze(): void {
        this.#frozen = true;
    }

    reset(): void {
        this.#plugins.clear();
        this.#groups = [];
        this.#paramOptions = {};
        this.#frozen = false;
    }
}

export default new PluginRegistry();
