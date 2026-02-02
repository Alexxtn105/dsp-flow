import { createContext, useContext, useMemo } from 'react';
import { useSchemeStorage } from '../hooks/useSchemeStorage';

const DSPEditorContext = createContext(null);

/**
 * Provider для DSP Editor контекста
 */
export const DSPEditorProvider = ({ children, reactFlowInstance }) => {
    const schemeStorage = useSchemeStorage();

    const value = useMemo(() => ({
        reactFlowInstance,
        ...schemeStorage
    }), [reactFlowInstance, schemeStorage]);

    return (
        <DSPEditorContext.Provider value={value}>
            {children}
        </DSPEditorContext.Provider>
    );
};

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
