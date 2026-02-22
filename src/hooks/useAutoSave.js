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

    // Ref для текущего состояния — debounce-функция читает через ref, не пересоздаётся
    const stateRef = useRef({ reactFlowInstance, nodes, edges, skipWhen });
    useEffect(() => {
        stateRef.current = { reactFlowInstance, nodes, edges, skipWhen };
    });

    /**
     * Функция автосохранения (читает состояние из ref)
     */
    const autoSave = useCallback(() => {
        const { reactFlowInstance: rfi, nodes: n, skipWhen: sw } = stateRef.current;

        if (isUnmountedRef.current) return;
        if (!rfi) return;
        if (n.length === 0) return;
        if (sw()) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            const flow = rfi.toObject();

            const nodeIds = new Set(flow.nodes.map(node => node.id));
            if (nodeIds.size !== flow.nodes.length) {
                console.error('Duplicate node IDs detected, skipping autosave');
                return;
            }

            const autoSaveData = {
                nodes: flow.nodes,
                edges: flow.edges,
                viewport: flow.viewport,
                timestamp: new Date().toISOString(),
            };

            const serialized = JSON.stringify(autoSaveData);

            if (lastSavedRef.current === serialized) {
                return;
            }

            const saveTask = () => {
                if (signal.aborted || isUnmountedRef.current) return;

                const result = StorageService.save(
                    StorageService.KEYS.AUTO_SAVE,
                    autoSaveData
                );

                if (result.success) {
                    lastSavedRef.current = serialized;
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
    }, []); // Стабильная функция — зависимостей нет, читает через ref

    // Debounce создаётся один раз, таймер не сбрасывается при изменении nodes/edges
    const debouncedAutoSaveRef = useRef(null);

    useEffect(() => {
        debouncedAutoSaveRef.current = debounce(() => {
            autoSave();
        }, delay);
    }, [autoSave, delay]);

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

        // Вызываем debounced функцию через ref
        if (debouncedAutoSaveRef.current) {
            debouncedAutoSaveRef.current();
        }
    }, [nodes, edges, enabled]);

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