import { useMemo, useState } from 'react';
import { useSchemeStorage } from '../hooks/index.js';
import { DSPEditorContext } from './dspEditorContextDef.js';

/**
 * Provider для DSP Editor контекста
 */
export const DSPEditorProvider = ({ children, reactFlowInstance }) => {
    const {
        saveScheme,
        loadScheme,
        deleteScheme,
        getSavedSchemes,
        exportScheme,
        importScheme
    } = useSchemeStorage();
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
        importScheme
    }), [reactFlowInstance, loadedSchemeData, saveScheme, loadScheme, deleteScheme, getSavedSchemes, exportScheme, importScheme]);

    return (
        <DSPEditorContext.Provider value={value}>
            {children}
        </DSPEditorContext.Provider>
    );
};
