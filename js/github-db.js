// github-db.js - GitHub JSON Database + SettingsManager (Complete)
// Version: 2.1 - Full Compatibility

// ==================== GitHubDB Class ====================
class GitHubDB {
    constructor() {
        this.OWNER = 'YOUR_GITHUB_USERNAME';
        this.REPO = 'ARA-Coffee-POS';
        this.BRANCH = 'main';
        this.BASE_PATH = 'data';
        
        this.API_URL = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.BASE_PATH}`;
        this.RAW_URL = `https://raw.githubusercontent.com/${this.OWNER}/${this.REPO}/${this.BRANCH}/${this.BASE_PATH}`;
        
        this.cache = {};
        this.cacheTime = 10000;
        
        console.log('📦 GitHubDB initialized');
    }

    _getToken() {
        return localStorage.getItem('ara_github_token') || '';
    }

    _getHeaders() {
        const token = this._getToken();
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `token ${token}`;
        return headers;
    }

    // ==================== READ FROM GITHUB ====================
    async read(fileName) {
        const cacheKey = fileName;
        if (this.cache[cacheKey] && (Date.now() - this.cache[cacheKey].time) < this.cacheTime) {
            return this.cache[cacheKey].data;
        }

        try {
            const url = `${this.RAW_URL}/${fileName}.json?t=${Date.now()}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            this.cache[cacheKey] = { data, time: Date.now() };
            this._localSet(fileName, data);
            return data;
        } catch (error) {
            const localData = this._localGet(fileName);
            if (localData) {
                this.cache[cacheKey] = { data: localData, time: Date.now() };
                return localData;
            }
            return this._getDefault(fileName);
        }
    }

    async getProducts() { const data = await this.read('products'); return data?.products || []; }
    async getCategories() { const data = await this.read('categories'); return data?.categories || []; }
    async getSettings() { return await this.read('settings'); }
    async getOrders() { const data = await this.read('orders'); return data?.orders || []; }

    // ==================== WRITE TO GITHUB ====================
    async write(fileName, data) {
        const token = this._getToken();
        if (!token) {
            this._localSet(fileName, data);
            return { success: false, message: 'No token - saved locally' };
        }

        try {
            const url = `${this.API_URL}/${fileName}.json`;
            let sha = null;
            try {
                const checkRes = await fetch(url, { headers: this._getHeaders() });
                if (checkRes.ok) sha = (await checkRes.json()).sha;
            } catch (e) {}

            const jsonStr = JSON.stringify(data, null, 2);
            const content = btoa(unescape(encodeURIComponent(jsonStr)));
            const body = {
                message: `📝 Update ${fileName}.json - ${new Date().toLocaleString('fa-IR')}`,
                content, branch: this.BRANCH
            };
            if (sha) body.sha = sha;

            const response = await fetch(url, {
                method: 'PUT',
                headers: this._getHeaders(),
                body: JSON.stringify(body)
            });

            if (response.ok) {
                this.cache[fileName] = { data, time: Date.now() };
                this._localSet(fileName, data);
                return { success: true };
            }
            throw new Error((await response.json()).message || 'Unknown');
        } catch (error) {
            this._localSet(fileName, data);
            this.cache[fileName] = { data, time: Date.now() };
            return { success: false, message: error.message };
        }
    }

    async saveProducts(products) { return this.write('products', { version: '1.0', lastUpdated: new Date().toISOString(), products }); }
    async saveCategories(categories) { return this.write('categories', { version: '1.0', lastUpdated: new Date().toISOString(), categories }); }
    async saveSettings(settings) { return this.write('settings', settings); }
    async saveOrders(orders) { return this.write('orders', { version: '1.0', orders }); }

    // ==================== CRUD HELPERS ====================
    async addProduct(product) { const products = await this.getProducts(); products.push(product); await this.saveProducts(products); return product; }
    async updateProduct(productId, updates) { const products = await this.getProducts(); const i = products.findIndex(p => p.id === productId); if (i > -1) { products[i] = { ...products[i], ...updates, updatedAt: new Date().toISOString() }; await this.saveProducts(products); return products[i]; } return null; }
    async deleteProduct(productId) { const products = await this.getProducts(); await this.saveProducts(products.filter(p => p.id !== productId)); return true; }
    async toggleProductStatus(productId) { const products = await this.getProducts(); const p = products.find(x => x.id === productId); if (p) { p.isActive = !p.isActive; p.updatedAt = new Date().toISOString(); await this.saveProducts(products); return p; } return null; }
    async addCategory(category) { const categories = await this.getCategories(); categories.push(category); await this.saveCategories(categories); return category; }
    async updateCategory(categoryId, updates) { const categories = await this.getCategories(); const i = categories.findIndex(c => c.id === categoryId); if (i > -1) { categories[i] = { ...categories[i], ...updates }; await this.saveCategories(categories); return categories[i]; } return null; }
    async deleteCategory(categoryId) { const categories = await this.getCategories(); await this.saveCategories(categories.filter(c => c.id !== categoryId)); return true; }
    async addOrder(order) { const orders = await this.getOrders(); orders.push(order); await this.saveOrders(orders); return order; }

    // ==================== COMPATIBILITY (storage.js style) ====================
    async getAll(storeName) {
        switch (storeName) {
            case 'products': return await this.getProducts();
            case 'categories': return await this.getCategories();
            case 'orders': return await this.getOrders();
            case 'users': return this._localGet('users') || [];
            default: return [];
        }
    }

    async getById(storeName, id) {
        const items = await this.getAll(storeName);
        return items.find(item => item.id === id) || null;
    }

    async add(storeName, item) {
        switch (storeName) {
            case 'products': return await this.addProduct(item);
            case 'categories': return await this.addCategory(item);
            case 'orders': return await this.addOrder(item);
            case 'users': {
                const users = this._localGet('users') || [];
                users.push(item);
                this._localSet('users', users);
                return item;
            }
            default: return item;
        }
    }

    async update(storeName, item) {
        switch (storeName) {
            case 'products': return await this.updateProduct(item.id, item);
            case 'categories': return await this.updateCategory(item.id, item);
            case 'users': {
                const users = this._localGet('users') || [];
                const i = users.findIndex(u => u.id === item.id);
                if (i > -1) { users[i] = item; this._localSet('users', users); return item; }
                return null;
            }
            default: return item;
        }
    }

    async delete(storeName, id) {
        switch (storeName) {
            case 'products': return await this.deleteProduct(id);
            case 'categories': return await this.deleteCategory(id);
            case 'users': {
                const users = this._localGet('users') || [];
                this._localSet('users', users.filter(u => u.id !== id));
                return true;
            }
            default: return true;
        }
    }

    async getByIndex(storeName, indexName, value) {
        const items = await this.getAll(storeName);
        return items.filter(item => item[indexName] === value);
    }

    async count(storeName) {
        const items = await this.getAll(storeName);
        return items.length;
    }

    async getOrdersByDateRange(startDate, endDate) {
        const orders = await this.getOrders();
        return orders.filter(o => {
            const d = new Date(o.createdAt);
            return d >= new Date(startDate) && d <= new Date(endDate);
        });
    }

    async clearStore(storeName) {
        switch (storeName) {
            case 'products': await this.saveProducts([]); break;
            case 'categories': await this.saveCategories([]); break;
            case 'orders': await this.saveOrders([]); break;
            case 'users': this._localSet('users', []); break;
        }
        return true;
    }

    // ==================== LOCAL STORAGE ====================
    _localSet(key, data) {
        try { localStorage.setItem(`ara_${key}`, JSON.stringify(data)); } catch (e) {}
    }

    _localGet(key) {
        try {
            const raw = localStorage.getItem(`ara_${key}`);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    _getDefault(fileName) {
        switch (fileName) {
            case 'products': return { products: [] };
            case 'categories': return { categories: [] };
            case 'orders': return { orders: [] };
            case 'settings': return { cafeName: 'ARA Coffee', currency: 'تومان', taxRate: 9, printerType: '58mm', theme: 'light' };
            default: return {};
        }
    }

    async testConnection() {
        const token = this._getToken();
        if (!token) return { success: false, message: 'توکن وارد نشده' };
        try {
            const url = `https://api.github.com/repos/${this.OWNER}/${this.REPO}`;
            const res = await fetch(url, { headers: this._getHeaders() });
            if (res.ok) {
                const repo = await res.json();
                return { success: true, repo: repo.full_name, lastPush: repo.pushed_at };
            }
            return { success: false, message: 'مخزن یافت نشد' };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    clearCache() { this.cache = {}; }
}

// ==================== INSTANCE ====================
const DB = new GitHubDB();

// ==================== SettingsManager ====================
const SettingsManager = {
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(`ara_${key}`);
            if (value === null || value === undefined) return defaultValue;
            try { return JSON.parse(value); } catch (e) { return value; }
        } catch (e) { return defaultValue; }
    },
    
    set(key, value) {
        try { localStorage.setItem(`ara_${key}`, JSON.stringify(value)); } catch (e) {}
    },
    
    getAll() {
        const settings = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('ara_')) {
                try { settings[key.replace('ara_', '')] = JSON.parse(localStorage.getItem(key)); } catch (e) {}
            }
        }
        return settings;
    },
    
    remove(key) { localStorage.removeItem(`ara_${key}`); },
    
    setDefaults() {
        const defaults = { cafeName: 'ARA Coffee', currency: 'تومان', taxRate: 9, printerType: '58mm', theme: 'light' };
        for (const [k, v] of Object.entries(defaults)) {
            if (this.get(k) === null) this.set(k, v);
        }
    }
};

SettingsManager.setDefaults();
console.log('✅ GitHubDB + SettingsManager ready');
