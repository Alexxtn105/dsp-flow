/**
 * FileStorageService — хранение аудиофайлов в IndexedDB
 * Позволяет сохранять/восстанавливать аудиофайлы (WAV, MP3) между сессиями.
 * Ключ — nodeId блока AudioFile.
 */

const DB_NAME = 'dsp-flow-files';
const DB_VERSION = 1;
const STORE_NAME = 'audio-files';

class FileStorageService {
    static _db = null;

    static async _getDB() {
        if (this._db) return this._db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'nodeId' });
                }
            };

            request.onsuccess = (event) => {
                this._db = event.target.result;
                resolve(this._db);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Сохранить файл в IndexedDB
     * @param {string} nodeId — ID узла
     * @param {File} file — аудиофайл (WAV, MP3)
     */
    static async saveFile(nodeId, file) {
        try {
            const db = await this._getDB();
            const arrayBuffer = await file.arrayBuffer();

            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put({
                    nodeId,
                    data: arrayBuffer,
                    name: file.name,
                    type: file.type || 'audio/wav',
                    lastModified: file.lastModified
                });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.warn('FileStorageService.saveFile error:', err);
            return false;
        }
    }

    /**
     * Получить файл из IndexedDB
     * @param {string} nodeId — ID узла
     * @returns {File|null}
     */
    static async getFile(nodeId) {
        try {
            const db = await this._getDB();

            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(nodeId);

                request.onsuccess = () => {
                    const record = request.result;
                    if (!record) {
                        resolve(null);
                        return;
                    }

                    const file = new File([record.data], record.name, {
                        type: record.type || 'audio/wav',
                        lastModified: record.lastModified
                    });
                    resolve(file);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn('FileStorageService.getFile error:', err);
            return null;
        }
    }

    /**
     * Удалить файл из IndexedDB
     * @param {string} nodeId — ID узла
     */
    static async removeFile(nodeId) {
        try {
            const db = await this._getDB();

            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.delete(nodeId);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.warn('FileStorageService.removeFile error:', err);
            return false;
        }
    }
}

export default FileStorageService;
