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
        return this._transaction(storeName, 'readwrite', async store => {
            const index = store.index(indexName);
            const cursor = await index.openCursor(IDBKeyRange.only(value));
            while (cursor) {
                const data = cursor.value;
                updateFn(data);
                cursor.update(data);
                cursor.continue();
            }
        });
    }

    async delete(storeName, indexName, value) {
        return this._transaction(storeName, 'readwrite', async store => {
            const index = store.index(indexName);
            const cursor = await index.openCursor(IDBKeyRange.only(value));
            while (cursor) {
                cursor.delete();
                cursor.continue();
            }
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
        return this._transaction(storeName, 'readwrite', async store => {
            // 获取当前表的主键配置
            const keyPath = store.keyPath;
            
            // 优先使用指定索引验证存在性
            if (indexName) {
                const index = store.index(indexName);
                const existingItems = await index.getAll(item[indexName]);
                
                if (existingItems.length > 0) {
                    // 存在则更新第一条匹配记录（需根据业务需求调整）
                    const merged = { ...existingItems[0], ...item };
                    return store.put(merged);
                }
            } 
            // 默认主键验证
            else if (item[keyPath]) {
                const existing = await store.get(item[keyPath]);
                if (existing) {
                    return store.put({ ...existing, ...item });
                }
            }
            
            // 新增记录
            return store.add(item);
        });
    }
}

// 导出供其他模块使用
export default DBHelper;