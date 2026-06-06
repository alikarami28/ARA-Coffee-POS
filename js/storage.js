// storage.js - لایه انتزاعی ذخیره‌سازی با IndexedDB و LocalStorage
class ARADatabase {
    constructor() {
        this.dbName = 'ARACoffeeDB';
        this.dbVersion = 2;
        this.db = null;
        this.ready = this._initDB();
    }

    _initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(new Error('Could not open database'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('ARA Coffee Database connected successfully.');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('Creating/Upgrading database...');

                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id' });
                    productStore.createIndex('categoryId', 'categoryId', { unique: false });
                    productStore.createIndex('displayOrder', 'displayOrder', { unique: false });
                    productStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains('categories')) {
                    const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
                    categoryStore.createIndex('displayOrder', 'displayOrder', { unique: false });
                }

                if (!db.objectStoreNames.contains('orders')) {
                    const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
                    orderStore.createIndex('createdAt', 'createdAt', { unique: false });
                    orderStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: true });
                }

                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'id' });
                }
            };
        });
    }

    async _performTransaction(storeName, mode, callback) {
        await this.ready;
        return new Promise((resolve, reject) => {
            if (!this.db.objectStoreNames.contains(storeName)) {
                reject(new Error(`Object store "${storeName}" not found`));
                return;
            }
            
            const transaction = this.db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            
            let result;
            try {
                result = callback(store);
            } catch (error) {
                reject(error);
                return;
            }

            transaction.oncomplete = () => {
                resolve(result);
            };
            
            transaction.onerror = (event) => {
                console.error('Transaction error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async add(storeName, item) {
        return this._performTransaction(storeName, 'readwrite', (store) => {
            const request = store.add(item);
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(item);
                request.onerror = () => reject(request.error);
            });
        });
    }

    async getAll(storeName) {
        return this._performTransaction(storeName, 'readonly', (store) => {
            const request = store.getAll();
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        });
    }

    async getById(storeName, id) {
        return this._performTransaction(storeName, 'readonly', (store) => {
            const request = store.get(id);
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        });
    }

    async update(storeName, item) {
        return this._performTransaction(storeName, 'readwrite', (store) => {
            const request = store.put(item);
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(item);
                request.onerror = () => reject(request.error);
            });
        });
    }

    async delete(storeName, id) {
        return this._performTransaction(storeName, 'readwrite', (store) => {
            const request = store.delete(id);
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        });
    }

    async getByIndex(storeName, indexName, value) {
        return this._performTransaction(storeName, 'readonly', (store) => {
            const index = store.index(indexName);
            const request = index.getAll(value);
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        });
    }
    
    async count(storeName) {
        return this._performTransaction(storeName, 'readonly', (store) => {
            const request = store.count();
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        });
    }

    async getOrdersByDateRange(startDate, endDate) {
        await this.ready;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('orders', 'readonly');
            const store = transaction.objectStore('orders');
            const index = store.index('createdAt');
            const range = IDBKeyRange.bound(startDate, endDate);
            const request = index.getAll(range);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async clearStore(storeName) {
        return this._performTransaction(storeName, 'readwrite', (store) => {
            const request = store.clear();
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        });
    }
}

const DB = new ARADatabase();

// مدیریت LocalStorage برای تنظیمات - اصلاح شده
const SettingsManager = {
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(`ara_${key}`);
            if (value === null || value === undefined) {
                return defaultValue;
            }
            return JSON.parse(value);
        } catch (error) {
            console.warn(`Error getting setting "${key}":`, error.message);
            // حذف مقدار خراب
            localStorage.removeItem(`ara_${key}`);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(`ara_${key}`, JSON.stringify(value));
        } catch (error) {
            console.error(`Error setting "${key}":`, error);
        }
    },
    
    getAll() {
        const settings = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ara_')) {
                try {
                    const value = localStorage.getItem(key);
                    if (value) {
                        settings[key.replace('ara_', '')] = JSON.parse(value);
                    }
                } catch (e) {
                    // حذف مقدار خراب
                    localStorage.removeItem(key);
                }
            }
        }
        return settings;
    },
    
    remove(key) {
        localStorage.removeItem(`ara_${key}`);
    },
    
    setDefaults() {
        if (this.get('cafeName') === null) this.set('cafeName', 'ARA Coffee');
        if (this.get('currency') === null) this.set('currency', 'تومان');
        if (this.get('taxRate') === null) this.set('taxRate', 9);
        if (this.get('printerType') === null) this.set('printerType', '58mm');
        if (this.get('theme') === null) this.set('theme', 'light');
    }
};

// اعمال تنظیمات پیش‌فرض
SettingsManager.setDefaults();