import { createContext, useContext, useMemo, useState } from 'react';
import { useSchemeStorage } from '../hooks/index.js';

const DSPEditorContext = createContext(null);

/**
 * Provider для DSP Editor контекста
 */
export const DSPEditorProvider = ({ children, reactFlowInstance }) => {
    const { saveScheme, loadScheme, deleteScheme, getSavedSchemes, exportScheme, importScheme } = useSchemeStorage();
    const [loadedSchemeData, setLoadedSchemeData] = useState(null);

    const value = useMemo(() => ({
        reactFlowInstance,
        loadedSchemeData,
        setLoadedSchemeData,
        saveScheme,
        loadScheme,
        deleteScheme,
        getSavedSchemes,
        exportScheme,
        importScheme,
    }), [reactFlowInstance, loadedSchemeData, saveScheme, loadScheme, deleteScheme, getSavedSchemes, exportScheme, importScheme]);

    return (
        <DSPEditorContext.Provider value={value}>
            {children}
        </DSPEditorContext.Provider>
    );
};

/**
 * Хук для использования DSP Editor контекста
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useDSPEditor = () => {
    const context = useContext(DSPEditorContext);

    if (!context) {
        throw new Error('useDSPEditor must be used within DSPEditorProvider');
    }

    return context;
};