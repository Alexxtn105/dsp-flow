import { useState, useEffect, useCallback } from 'react';
import StorageService from '../services/storageService';

/**
 * Хук для управления темой приложения
 */
export const useTheme = () => {
    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        const savedTheme = StorageService.load(StorageService.KEYS.THEME);
        // Если тема сохранена - используем её, иначе по умолчанию темная тема
        return savedTheme === 'dark' || !savedTheme;
    });

    useEffect(() => {
        // Сохраняем в localStorage
        const theme = isDarkTheme ? 'dark' : 'light';
        StorageService.save(StorageService.KEYS.THEME, theme);

        // Обновляем атрибут на html
        document.documentElement.setAttribute('data-theme', theme);

        // Добавляем класс на body
        if (isDarkTheme) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }, [isDarkTheme]);

    const toggleTheme = useCallback(() => {
        setIsDarkTheme(prev => !prev);
    }, []);

    const setTheme = useCallback((theme) => {
        setIsDarkTheme(theme === 'dark');
    }, []);

    return {
        isDarkTheme,
        theme: isDarkTheme ? 'dark' : 'light',
        toggleTheme,
        setTheme
    };
};
