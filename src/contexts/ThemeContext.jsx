import { createContext, useContext } from 'react';
import { useTheme } from '../hooks/useTheme';

const ThemeContext = createContext(null);

/**
 * Provider для темы приложения.
 * Оборачивает приложение и предоставляет isDarkTheme всем потомкам.
 */
export function ThemeProvider({ children }) {
    const themeState = useTheme();

    return (
        <ThemeContext.Provider value={themeState}>
            {children}
        </ThemeContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useThemeContext() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useThemeContext must be used within ThemeProvider');
    }
    return ctx;
}
