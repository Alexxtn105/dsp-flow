import { useMemo, useState } from 'react';
import { useSchemeStorage } from '../hooks/index.js';
import { DSPEditorContext } from './dspEditorContextDef.js';

/**
 * Provider для DSP Editor контекста
 */
export const DSPEditorProvider = ({ children, reactFlowInstance }) => {
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
};
