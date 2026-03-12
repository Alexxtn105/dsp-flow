import { createContext, useContext, useState, useEffect } from 'react';

const MQL = '(pointer: coarse)';
const TouchContext = createContext(false);

export function TouchProvider({ children }) {
    const [isTouch, setIsTouch] = useState(() =>
        window.matchMedia(MQL).matches
    );

    useEffect(() => {
        const mql = window.matchMedia(MQL);
        const handler = (e) => setIsTouch(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    return (
        <TouchContext.Provider value={isTouch}>
            {children}
        </TouchContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTouchContext() {
    return useContext(TouchContext);
}
