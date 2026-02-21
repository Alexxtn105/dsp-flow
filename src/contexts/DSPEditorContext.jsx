import { createContext, useContext, useMemo, useState } from 'react';
import { useSchemeStorage } from '../hooks/index.js';

const DSPEditorContext = createContext(null);

/**
 * Provider для DSP Editor контекста
 */
export function DSPEditorProvider({ children, reactFlowInstance }) {
    const schemeStorage = useSchemeStorage();
    const [loadedSchemeData, setLoadedSchemeData] = useState(null);

    const value = useMemo(() => ({
        reactFlowInstance,
        loadedSchemeData,
        setLoadedSchemeData,
        ...schemeStorage
    }), [reactFlowInstance, loadedSchemeData, schemeStorage]);

    return (
        <DSPEditorContext.Provider value={value}>
            {children}
        </DSPEditorContext.Provider>
    );
}

/**
 * Хук для использования DSP Editor контекста
 */
export function useDSPEditor() {
    const context = useContext(DSPEditorContext);

    if (!context) {
        throw new Error('useDSPEditor must be used within DSPEditorProvider');
    }

    return context;
}