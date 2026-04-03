// IndexedDB 数据库操作封装
class DBHelper {
    constructor(dbName, dbVersion, stores) {
        this.DB_NAME = dbName || 'myDatabase';
        this.DB_VERSION = dbVersion || 1;
        this.STORES = stores || [{
            name: 'users',
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'name', keyPath: 'name', options: { unique: false } },
                { name: 'email', keyPath: 'email', options: { unique: true } }
            ]
        }];
        this.db = null;
    }

    async init() {
        this.db = await this._openDB();
        return this;
    }

    _openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.STORES.forEach(storeConfig => {
                    if (!db.objectStoreNames.contains(storeConfig.name)) {
                        // 创建新表
                        const store = db.createObjectStore(
                            storeConfig.name, 
                            { 
                                keyPath: storeConfig.keyPath,
                                autoIncrement: storeConfig.autoIncrement 
                            }
                        );
                        // 创建索引
                        storeConfig.indexes.forEach(index => {
                            store.createIndex(
                                index.name, 
                                index.keyPath, 
                                index.options
                            );
                        });
                    } else {
                        // 更新现有表的索引
                        const store = event.target.transaction.objectStore(storeConfig.name);
                        storeConfig.indexes.forEach(index => {
                            if (!store.indexNames.contains(index.name)) {
                                store.createIndex(
                                    index.name, 
                                    index.keyPath, 
                                    index.options
                                );
                            }
                        });
                    }
                });
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async add(storeName, item) {
        return this._transaction(storeName, 'readwrite', store => store.add(item));
    }

    async get(storeName, id) {
        return this._transaction(storeName, 'readonly', store => store.get(id));
    }

    async getByIndex(storeName, indexName, value) {
        return this._transaction(storeName, 'readonly', store => {
            const index = store.index(indexName);
            return index.getAll(value);
        });
    }

    async getAll(storeName, query = null, count = null) {
        return this._transaction(storeName, 'readonly', store => {
            return store.getAll(query, count);
        });
    }

    async update(storeName, indexName, value, updateFn) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.openCursor(IDBKeyRange.only(value));

            request.onsuccess = event => {
                const cursor = event.target.result;
                if (!cursor) {
                    return;
                }

                const data = cursor.value;
                updateFn(data);
                cursor.update(data);
                cursor.continue();
            };

            request.onerror = event => reject(event.target.error);
            tx.oncomplete = () => resolve();
            tx.onerror = event => reject(event.target.error || tx.error);
        });
    }

    async delete(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.openCursor(IDBKeyRange.only(value));

            request.onsuccess = event => {
                const cursor = event.target.result;
                if (!cursor) {
                    return;
                }

                cursor.delete();
                cursor.continue();
            };

            request.onerror = event => reject(event.target.error);
            tx.oncomplete = () => resolve();
            tx.onerror = event => reject(event.target.error || tx.error);
        });
    }

    async _transaction(storeName, mode, operation) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            const request = operation(store);
            
            tx.oncomplete = () => resolve(request.result);
            tx.onerror = () => reject(tx.error);
            request.onerror = () => reject(request.error);
        });
    }

    async upsert(storeName, item, indexName) {
        if (indexName && item[indexName] !== undefined) {
            const existingItems = await this.getByIndex(storeName, indexName, item[indexName]);

            if (existingItems.length > 0) {
                const merged = { ...existingItems[0], ...item };
                return this._transaction(storeName, 'readwrite', store => store.put(merged));
            }
        }

        const storeConfig = this.STORES.find(store => store.name === storeName);
        const keyPath = storeConfig?.keyPath;

        if (keyPath && item[keyPath] !== undefined) {
            const existing = await this.get(storeName, item[keyPath]);
            if (existing) {
                return this._transaction(storeName, 'readwrite', store => store.put({ ...existing, ...item }));
            }
        }

        return this._transaction(storeName, 'readwrite', store => store.add(item));
    }
}

// 导出供其他模块使用
export default DBHelper;
