/**
 * PluginRegistry - центральный реестр плагинов блоков ЦОС
 */
class PluginRegistry {
    constructor() {
        this._plugins = new Map();     // name → plugin
        this._pluginsById = new Map(); // id → plugin
        this._groups = new Map();      // groupId → { id, name, order }
        this._frozen = false;
    }

    /**
     * Регистрация плагина с валидацией обязательных полей
     */
    register(plugin) {
        if (this._frozen) {
            throw new Error(`Registry is frozen. Cannot register plugin: ${plugin.name}`);
        }

        const required = ['id', 'name', 'icon', 'group', 'signals', 'process'];
        for (const field of required) {
            if (plugin[field] === undefined) {
                throw new Error(`Plugin "${plugin.id || 'unknown'}" missing required field: ${field}`);
            }
        }

        if (this._plugins.has(plugin.name)) {
            throw new Error(`Plugin with name "${plugin.name}" already registered`);
        }
        if (this._pluginsById.has(plugin.id)) {
            throw new Error(`Plugin with id "${plugin.id}" already registered`);
        }

        this._plugins.set(plugin.name, plugin);
        this._pluginsById.set(plugin.id, plugin);
    }

    /**
     * Определение группы UI
     */
    defineGroup(id, name, order) {
        if (this._frozen) {
            throw new Error('Registry is frozen');
        }
        this._groups.set(id, { id, name, order });
    }

    /**
     * Построение индексов, запрет дальнейших изменений
     */
    freeze() {
        this._frozen = true;
    }

    // --- Поиск ---

    getByName(name) {
        return this._plugins.get(name) || null;
    }

    getById(id) {
        return this._pluginsById.get(id) || null;
    }

    // --- Legacy-совместимые генераторы (формат = текущий формат из constants.js) ---

    getBlockTypes() {
        const types = {};
        for (const [, plugin] of this._pluginsById) {
            types[plugin.id] = plugin.name;
        }
        return types;
    }

    getSignalConfig() {
        const config = {};
        for (const [name, plugin] of this._plugins) {
            config[name] = {
                input: plugin.signals.input,
                output: plugin.signals.output,
            };
        }
        return config;
    }

    getIcons() {
        const icons = {};
        for (const [name, plugin] of this._plugins) {
            icons[name] = plugin.icon;
        }
        return icons;
    }

    getDefaultParamsMap() {
        const params = {};
        for (const [name, plugin] of this._plugins) {
            if (plugin.defaultParams) {
                params[name] = { ...plugin.defaultParams };
            }
        }
        return params;
    }

    getGroups() {
        const groupPlugins = new Map();

        for (const [, plugin] of this._plugins) {
            if (!groupPlugins.has(plugin.group)) {
                groupPlugins.set(plugin.group, []);
            }
            groupPlugins.get(plugin.group).push(plugin);
        }

        const sortedGroups = [...this._groups.values()].sort((a, b) => a.order - b.order);

        return sortedGroups.map(group => {
            const plugins = (groupPlugins.get(group.id) || [])
                .sort((a, b) => (a.groupOrder || 0) - (b.groupOrder || 0));

            return {
                id: group.id,
                name: group.name,
                collapsed: false,
                blocks: plugins.map(p => ({
                    id: p.id.toLowerCase().replace(/_/g, '-'),
                    name: p.name,
                    icon: p.icon,
                    description: p.description || p.name,
                })),
            };
        });
    }

    getInputNodeTypes() {
        return [...this._plugins.values()]
            .filter(p => p.signals.input === null)
            .map(p => p.name);
    }

    getOutputNodeTypes() {
        return [...this._plugins.values()]
            .filter(p => !!p.visualizationType)
            .map(p => p.name);
    }

    // --- Прямой API (заменяет helpers.js) ---

    getBlockSignalConfig(name) {
        const plugin = this._plugins.get(name);
        if (!plugin) return { input: 'real', output: 'real' };
        return { input: plugin.signals.input, output: plugin.signals.output };
    }

    getBlockIcon(name) {
        const plugin = this._plugins.get(name);
        return plugin ? plugin.icon : 'widgets';
    }

    getBlockDescription(name) {
        const plugin = this._plugins.get(name);
        return plugin ? (plugin.description || plugin.name) : name;
    }

    getBlockDefaultParams(name) {
        const plugin = this._plugins.get(name);
        return plugin && plugin.defaultParams ? { ...plugin.defaultParams } : {};
    }

    getParamFields(name) {
        const plugin = this._plugins.get(name);
        return plugin && plugin.paramFields ? plugin.paramFields : [];
    }

    getValidator(name) {
        const plugin = this._plugins.get(name);
        return plugin && plugin.validate ? plugin.validate : null;
    }

    isGenerator(name) {
        const plugin = this._plugins.get(name);
        return plugin ? plugin.signals.input === null : false;
    }

    isVisualization(name) {
        const plugin = this._plugins.get(name);
        return plugin ? !!plugin.visualizationType : false;
    }

    getProcessor(name) {
        const plugin = this._plugins.get(name);
        return plugin ? plugin.process : null;
    }

    getVisualizationType(name) {
        const plugin = this._plugins.get(name);
        return plugin ? (plugin.visualizationType || null) : null;
    }
}

export default PluginRegistry;
