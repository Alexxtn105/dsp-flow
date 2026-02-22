/**
 * StorageService - сервис для работы с localStorage
 * Обрабатывает все edge cases: переполнение, повреждение данных, недоступность
 */
class StorageService {
    static KEYS = {
        AUTO_SAVE: 'dsp-autosave',
        SCHEMES: 'dsp-schemes',
        THEME: 'dsp-theme',
        PREFERENCES: 'dsp-preferences'
    };

    static MAX_SIZE_MB = 4;
    static MAX_AUTO_SAVE_AGE_DAYS = 1;

    /**
     * Проверить доступность localStorage
     */
    static isAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.error('localStorage is not available:', error);
            return false;
        }
    }

    /**
     * Сохранить данные в localStorage
     */
    static save(key, data) {
        if (!this.isAvailable()) {
            return {
                success: false,
                error: 'STORAGE_UNAVAILABLE',
                message: 'localStorage недоступен'
            };
        }

        try {
            const serialized = JSON.stringify(data);
            const sizeInMB = new Blob([serialized]).size / (1024 * 1024);

            if (sizeInMB > this.MAX_SIZE_MB) {
                console.warn(`Data too large: ${sizeInMB.toFixed(2)}MB`);
                return {
                    success: false,
                    error: 'DATA_TOO_LARGE',
                    message: `Данные слишком большие (${sizeInMB.toFixed(2)}MB). Максимум ${this.MAX_SIZE_MB}MB`,
                    size: sizeInMB
                };
            }

            localStorage.setItem(key, serialized);

            return {
                success: true,
                size: sizeInMB
            };
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error('localStorage quota exceeded');

                // Попытка очистить старые данные
                this.cleanupOldAutoSaves();

                // Повторная попытка
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                    return { success: true };
                } catch {
                    return {
                        success: false,
                        error: 'QUOTA_EXCEEDED',
                        message: 'Хранилище переполнено. Удалите старые схемы.'
                    };
                }
            }

            console.error('Storage error:', error);
            return {
                success: false,
                error: error.name,
                message: error.message
            };
        }
    }

    /**
     * Загрузить данные из localStorage
     */
    static load(key) {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            const data = localStorage.getItem(key);
            if (!data) return null;

            return JSON.parse(data);
        } catch (error) {
            console.error('Load error:', error);
            // Если данные повреждены, удаляем их
            this.remove(key);
            return null;
        }
    }

    /**
     * Удалить ключ из localStorage
     */
    static remove(key) {
        if (!this.isAvailable()) {
            return { success: false };
        }

        try {
            localStorage.removeItem(key);
            return { success: true };
        } catch (error) {
            console.error('Remove error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Очистить все ключи приложения
     */
    static clear() {
        if (!this.isAvailable()) {
            return { success: false };
        }

        try {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return { success: true };
        } catch (error) {
            console.error('Clear error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Получить размер занятого хранилища
     */
    static getStorageSize() {
        if (!this.isAvailable()) {
            return { bytes: 0, kb: '0.00', mb: '0.00' };
        }

        let total = 0;
        for (let key in localStorage) {
            if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
                total += localStorage[key].length + key.length;
            }
        }

        return {
            bytes: total,
            kb: (total / 1024).toFixed(2),
            mb: (total / (1024 * 1024)).toFixed(2)
        };
    }

    /**
     * Очистить старые автосохранения
     */
    static cleanupOldAutoSaves() {
        try {
            const autoSave = this.load(this.KEYS.AUTO_SAVE);
            if (autoSave && autoSave.timestamp) {
                const saveDate = new Date(autoSave.timestamp);
                const now = new Date();
                const diffDays = (now - saveDate) / (1000 * 60 * 60 * 24);

                if (diffDays > this.MAX_AUTO_SAVE_AGE_DAYS) {
                    this.remove(this.KEYS.AUTO_SAVE);
                    console.log('Old autosave removed');
                }
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    /**
     * Получить все ключи приложения
     */
    static getAllKeys() {
        if (!this.isAvailable()) {
            return [];
        }

        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (Object.values(this.KEYS).includes(key)) {
                keys.push(key);
            }
        }
        return keys;
    }
}

export default StorageService;
