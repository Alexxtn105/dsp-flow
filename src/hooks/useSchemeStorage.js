import { useCallback } from 'react';
import StorageService from '../services/storageService';
import ValidationService from '../services/validationService';

/**
 * Хук для управления схемами (сохранение/загрузка/удаление)
 */
export const useSchemeStorage = () => {
    /**
     * Сохранить схему
     */
    const saveScheme = useCallback((schemeData) => {
        // Валидация названия
        const nameValidation = ValidationService.validateSchemeName(schemeData.name);
        if (!nameValidation.isValid) {
            return {
                success: false,
                errors: nameValidation.errors
            };
        }

        // Валидация описания
        if (schemeData.description) {
            const descValidation = ValidationService.validateDescription(schemeData.description);
            if (!descValidation.isValid) {
                return {
                    success: false,
                    errors: descValidation.errors
                };
            }
        }

        // Валидация данных схемы
        const schemeValidation = ValidationService.validateSchemeData(schemeData);
        if (!schemeValidation.isValid) {
            return {
                success: false,
                errors: schemeValidation.errors
            };
        }

        try {
            // Добавляем метаданные
            const fullSchemeData = {
                ...schemeData,
                version: '1.0.0',
                timestamp: new Date().toISOString(),
            };

            // Загружаем существующие схемы
            const schemes = StorageService.load(StorageService.KEYS.SCHEMES) || [];

            // Проверяем дубликаты
            const existingIndex = schemes.findIndex(s => s.name === schemeData.name);

            if (existingIndex >= 0) {
                // Обновляем существующую
                schemes[existingIndex] = fullSchemeData;
            } else {
                // Добавляем новую
                schemes.push(fullSchemeData);
            }

            // Сохраняем
            const saveResult = StorageService.save(
                StorageService.KEYS.SCHEMES,
                schemes
            );

            if (!saveResult.success) {
                return saveResult;
            }

            // Очищаем автосохранение после успешного сохранения
            StorageService.remove(StorageService.KEYS.AUTO_SAVE);

            return {
                success: true,
                data: fullSchemeData
            };
        } catch (error) {
            console.error('Save scheme error:', error);
            return {
                success: false,
                error: 'SAVE_FAILED',
                message: error.message
            };
        }
    }, []);

    /**
     * Загрузить схему
     */
    const loadScheme = useCallback((schemeName) => {
        try {
            const schemes = StorageService.load(StorageService.KEYS.SCHEMES) || [];
            const scheme = schemes.find(s => s.name === schemeName);

            if (!scheme) {
                return {
                    success: false,
                    error: 'NOT_FOUND',
                    message: 'Схема не найдена'
                };
            }

            // Валидация загружаемой схемы
            const validation = ValidationService.validateSchemeData(scheme);
            if (!validation.isValid) {
                console.warn('Invalid scheme data:', validation.errors);
                // Продолжаем загрузку, но предупреждаем
            }

            return {
                success: true,
                data: scheme
            };
        } catch (error) {
            console.error('Load scheme error:', error);
            return {
                success: false,
                error: 'LOAD_FAILED',
                message: error.message
            };
        }
    }, []);

    /**
     * Удалить схему
     */
    const deleteScheme = useCallback((schemeName) => {
        try {
            const schemes = StorageService.load(StorageService.KEYS.SCHEMES) || [];
            const filteredSchemes = schemes.filter(s => s.name !== schemeName);

            if (schemes.length === filteredSchemes.length) {
                return {
                    success: false,
                    error: 'NOT_FOUND',
                    message: 'Схема не найдена'
                };
            }

            const saveResult = StorageService.save(
                StorageService.KEYS.SCHEMES,
                filteredSchemes
            );

            return saveResult;
        } catch (error) {
            console.error('Delete scheme error:', error);
            return {
                success: false,
                error: 'DELETE_FAILED',
                message: error.message
            };
        }
    }, []);

    /**
     * Получить список всех схем
     */
    const getSavedSchemes = useCallback(() => {
        try {
            const schemes = StorageService.load(StorageService.KEYS.SCHEMES) || [];

            // Сортируем по дате (новые первыми)
            return schemes.sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            );
        } catch (error) {
            console.error('Get schemes error:', error);
            return [];
        }
    }, []);

    /**
     * Экспорт схемы в JSON
     */
    const exportScheme = useCallback((schemeName) => {
        const result = loadScheme(schemeName);

        if (!result.success) {
            return result;
        }

        try {
            const json = JSON.stringify(result.data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${schemeName}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return { success: true };
        } catch (error) {
            console.error('Export error:', error);
            return {
                success: false,
                error: 'EXPORT_FAILED',
                message: error.message
            };
        }
    }, [loadScheme]);

    /**
     * Импорт схемы из JSON
     */
    const importScheme = useCallback((file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const schemeData = JSON.parse(e.target.result);

                    // Валидация
                    const validation = ValidationService.validateSchemeData(schemeData);
                    if (!validation.isValid) {
                        resolve({
                            success: false,
                            errors: validation.errors
                        });
                        return;
                    }

                    // Сохраняем
                    const saveResult = saveScheme(schemeData);
                    resolve(saveResult);
                } catch (error) {
                    console.error('Import error:', error);
                    resolve({
                        success: false,
                        error: 'IMPORT_FAILED',
                        message: 'Неверный формат файла'
                    });
                }
            };

            reader.onerror = () => {
                resolve({
                    success: false,
                    error: 'READ_FAILED',
                    message: 'Ошибка чтения файла'
                });
            };

            reader.readAsText(file);
        });
    }, [saveScheme]);

    return {
        saveScheme,
        loadScheme,
        deleteScheme,
        getSavedSchemes,
        exportScheme,
        importScheme
    };
};
