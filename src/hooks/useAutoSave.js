import { useEffect, useRef, useCallback } from 'react';
import StorageService from '../services/storageService';
import { debounce } from '../utils/helpers';

/**
 * Хук для автосохранения схемы
 * Исправлен race condition и утечка памяти
 */
export const useAutoSave = (
    nodes,
    edges,
    reactFlowInstance,
    options = {}
) => {
    const {
        delay = 5000,
        enabled = true,
        skipWhen = () => false
    } = options;

    const lastSavedRef = useRef(null);
    const isUnmountedRef = useRef(false);
    const abortControllerRef = useRef(null);

    /**
     * Функция автосохранения
     */
    const autoSave = useCallback(() => {
        // Проверки
        if (isUnmountedRef.current) return;
        if (!reactFlowInstance) return;
        if (nodes.length === 0) return;
        if (skipWhen()) return;

        // Отменяем предыдущее сохранение если оно еще выполняется
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            const flow = reactFlowInstance.toObject();
            const autoSaveData = {
                nodes: flow.nodes,
                edges: flow.edges,
                viewport: flow.viewport,
                timestamp: new Date().toISOString(),
            };

            const serialized = JSON.stringify(autoSaveData);

            // Проверяем, изменились ли данные
            if (lastSavedRef.current === serialized) {
                return;
            }

            // Используем requestIdleCallback для неблокирующего сохранения
            const saveTask = () => {
                if (signal.aborted || isUnmountedRef.current) return;

                const result = StorageService.save(
                    StorageService.KEYS.AUTO_SAVE,
                    autoSaveData
                );

                if (result.success) {
                    lastSavedRef.current = serialized;
                    console.log('Autosaved:', {
                        nodes: nodes.length,
                        edges: edges.length,
                        size: result.size?.toFixed(2) + 'MB'
                    });
                } else {
                    console.error('Autosave failed:', result.error);
                }
            };

            if ('requestIdleCallback' in window) {
                requestIdleCallback(saveTask, { timeout: 1000 });
            } else {
                setTimeout(saveTask, 0);
            }
        } catch (error) {
            console.error('Autosave error:', error);
        }
    }, [reactFlowInstance, nodes, edges, skipWhen]);

    // Создаём debounced версию автосохранения
    const debouncedAutoSave = useRef(debounce(autoSave, delay)).current;

    /**
     * Загрузить автосохраненные данные
     */
    const loadAutoSave = useCallback(() => {
        try {
            const autoSaved = StorageService.load(StorageService.KEYS.AUTO_SAVE);

            if (!autoSaved) {
                return null;
            }

            // Проверяем возраст автосохранения
            const saveDate = new Date(autoSaved.timestamp);
            const now = new Date();
            const diffDays = (now - saveDate) / (1000 * 60 * 60 * 24);

            if (diffDays > StorageService.MAX_AUTO_SAVE_AGE_DAYS) {
                console.log('Autosave too old, removing');
                StorageService.remove(StorageService.KEYS.AUTO_SAVE);
                return null;
            }

            return autoSaved;
        } catch (error) {
            console.error('Load autosave error:', error);
            return null;
        }
    }, []);

    /**
     * Очистить автосохранение
     */
    const clearAutoSave = useCallback(() => {
        lastSavedRef.current = null;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        return StorageService.remove(StorageService.KEYS.AUTO_SAVE);
    }, []);

    /**
     * Effect для автосохранения с debounce
     */
    useEffect(() => {
        if (!enabled) return;

        debouncedAutoSave();
    }, [nodes, edges, enabled, debouncedAutoSave]);

    /**
     * Cleanup при размонтировании
     */
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        loadAutoSave,
        clearAutoSave,
        manualSave: autoSave
    };
};
