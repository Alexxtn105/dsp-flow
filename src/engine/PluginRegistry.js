/**
 * PluginRegistry - реестр DSP-плагинов (singleton)
 *
 * Централизует регистрацию блоков: один плагин = один блок
 * со всеми метаданными и процессором.
 */

const REQUIRED_FIELDS = ['type', 'id', 'icon', 'description', 'group', 'signals', 'defaultParams', 'processor'];

class PluginRegistry {
    /** @type {Map<string, object>} type → plugin */
    #plugins = new Map();

    /** @type {Array<{id: string, name: string, collapsed: boolean}>} */
    #groups = [];

    /** @type {Record<string, Array<{value: any, label: string}>>} */
    #paramOptions = {};

    /** @type {boolean} */
    #frozen = false;

    // ─── Регистрация ───

    /**
     * Регистрирует один плагин
     */
    register(plugin) {
        if (this.#frozen) {
            throw new Error(`PluginRegistry заморожен, невозможно зарегистрировать "${plugin?.type}"`);
        }

        // Валидация обязательных полей
        for (const field of REQUIRED_FIELDS) {
            if (plugin[field] === undefined) {
                throw new Error(`Плагин "${plugin?.type || '?'}" не содержит обязательное поле "${field}"`);
            }
        }

        if (typeof plugin.processor.process !== 'function') {
            throw new Error(`Плагин "${plugin.type}" должен иметь processor.process()`);
        }

        if (this.#plugins.has(plugin.type)) {
            throw new Error(`Плагин "${plugin.type}" уже зарегистрирован`);
        }

        this.#plugins.set(plugin.type, plugin);
    }

    /**
     * Регистрирует массив плагинов
     */
    registerAll(plugins) {
        for (const plugin of plugins) {
            this.register(plugin);
        }
    }

    /**
     * Регистрирует группу для UI (категория блоков)
     */
    registerGroup(group) {
        if (this.#frozen) {
            throw new Error('PluginRegistry заморожен');
        }
        this.#groups.push(group);
    }

    /**
     * Регистрирует опции для выпадающего списка параметра
     */
    registerParamOptions(name, options) {
        if (this.#frozen) {
            throw new Error('PluginRegistry заморожен');
        }
        this.#paramOptions[name] = options;
    }

    // ─── Доступ к данным ───

    /**
     * Возвращает процессор для типа блока
     */
    getProcessor(type) {
        return this.#plugins.get(type)?.processor || null;
    }

    /**
     * Возвращает конфигурацию сигналов для типа блока
     */
    getSignalConfig(type) {
        const plugin = this.#plugins.get(type);
        if (!plugin) {
            return { input: 'real', output: 'real' };
        }
        return {
            input: plugin.signals.input,
            output: plugin.signals.output
        };
    }

    /**
     * Возвращает параметры по умолчанию для типа блока
     */
    getDefaultParams(type) {
        return this.#plugins.get(type)?.defaultParams || {};
    }

    /**
     * Возвращает иконку для типа блока
     */
    getIcon(type) {
        return this.#plugins.get(type)?.icon || 'widgets';
    }

    /**
     * Возвращает описание типа блока
     */
    getDescription(type) {
        return this.#plugins.get(type)?.description || type;
    }

    // ─── Запросы ───

    /**
     * Является ли блок генератором (нет входов)
     */
    isGenerator(type) {
        const plugin = this.#plugins.get(type);
        return plugin ? plugin.signals.input === null : false;
    }

    /**
     * Является ли блок визуализацией (нет выходов)
     */
    isVisualization(type) {
        const plugin = this.#plugins.get(type);
        return plugin ? plugin.signals.output === null : false;
    }

    /**
     * Возвращает группы с блоками для UI (Toolbar)
     */
    getGroups() {
        return this.#groups.map(group => ({
            ...group,
            blocks: [...this.#plugins.values()]
                .filter(p => p.group === group.id)
                .map(p => ({
                    id: p.id,
                    name: p.type,
                    icon: p.icon,
                    description: p.description
                }))
        }));
    }

    /**
     * Возвращает опции параметра для выпадающего списка
     */
    getParamOptions(key) {
        return this.#paramOptions[key] || null;
    }

    /**
     * Проверяет, зарегистрирован ли плагин
     */
    has(type) {
        return this.#plugins.has(type);
    }

    // ─── Управление состоянием ───

    /**
     * Сбрасывает состояния всех процессоров
     */
    clearAllStates() {
        for (const plugin of this.#plugins.values()) {
            if (typeof plugin.processor.clearStates === 'function') {
                try {
                    plugin.processor.clearStates();
                } catch {
                    // Продолжаем очистку остальных плагинов
                }
            }
        }
    }

    /**
     * Удаляет состояния процессоров для узлов, которых нет в activeNodeIds
     * @param {Set<string>} activeNodeIds - множество активных nodeId
     */
    clearStatesForRemovedNodes(activeNodeIds) {
        for (const plugin of this.#plugins.values()) {
            if (plugin.processor.states instanceof Map) {
                for (const nodeId of plugin.processor.states.keys()) {
                    if (!activeNodeIds.has(nodeId)) {
                        plugin.processor.states.delete(nodeId);
                    }
                }
            }
        }
    }

    /**
     * Замораживает реестр (запрещает дальнейшую регистрацию)
     */
    freeze() {
        this.#frozen = true;
    }

    /**
     * Полный сброс реестра (для тестов)
     */
    reset() {
        this.#plugins.clear();
        this.#groups = [];
        this.#paramOptions = {};
        this.#frozen = false;
    }
}

export default new PluginRegistry();
