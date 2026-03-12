/**
 * Типы для PluginRegistry (UI-facing).
 */

/** Группа блоков для UI (Toolbar) */
export interface PluginGroup {
  id: string;
  name: string;
  collapsed: boolean;
}

/** Блок для отображения в группе */
export interface PluginGroupBlock {
  id: string;
  name: string;
  icon: string;
  description: string;
}

/** Группа с блоками для UI */
export interface PluginGroupWithBlocks extends PluginGroup {
  blocks: PluginGroupBlock[];
}

/** Опция выпадающего списка параметра */
export interface ParamOption {
  value: string | number;
  label: string;
}
