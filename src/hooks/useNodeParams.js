import { useState, useCallback } from 'react';
import ValidationService from '../services/validationService';

/**
 * Хук для управления параметрами узлов
 */
export const useNodeParams = () => {
    const [paramsModal, setParamsModal] = useState({
        isOpen: false,
        nodeId: null,
        blockType: null,
        currentParams: {}
    });

    const openParamsModal = useCallback((nodeId, blockType, currentParams = {}) => {
        setParamsModal({
            isOpen: true,
            nodeId,
            blockType,
            currentParams
        });
    }, []);

    const closeParamsModal = useCallback(() => {
        setParamsModal({
            isOpen: false,
            nodeId: null,
            blockType: null,
            currentParams: {}
        });
    }, []);

    const validateParams = useCallback((blockType, params) => {
        return ValidationService.validateBlockParams(blockType, params);
    }, []);

    const getParamFields = useCallback((blockType) => {
        // Возвращает поля для формы редактирования параметров
        const fields = {
            'Входной сигнал': [
                {
                    name: 'frequency',
                    label: 'Частота (Гц)',
                    type: 'number',
                    min: 1,
                    max: 20000,
                    step: 10,
                    defaultValue: 1000
                },
                {
                    name: 'amplitude',
                    label: 'Амплитуда',
                    type: 'number',
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    defaultValue: 1.0
                },
                {
                    name: 'signalType',
                    label: 'Тип сигнала',
                    type: 'select',
                    options: [
                        { value: 'sine', label: 'Синус' },
                        { value: 'cosine', label: 'Косинус' }
                    ],
                    defaultValue: 'sine'
                }
            ],
            // ... остальные типы блоков
        };

        return fields[blockType] || [];
    }, []);

    return {
        paramsModal,
        openParamsModal,
        closeParamsModal,
        validateParams,
        getParamFields
    };
};

export default useNodeParams;