import { useContext } from 'react';
import { DSPEditorContext } from '../contexts/dspEditorContextDef';

/**
 * Хук для использования DSP Editor контекста
 */
export const useDSPEditor = () => {
    const context = useContext(DSPEditorContext);

    if (!context) {
        throw new Error('useDSPEditor must be used within DSPEditorProvider');
    }

    return context;
};
