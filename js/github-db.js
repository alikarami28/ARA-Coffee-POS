// github-db.js - نسخه نهایی و تست شده
class GitHubDB {
    constructor() {
        this.cache = {};
        this.cacheTime = 10000;
        console.log('📦 GitHubDB initialized');
        console.log('👤 Owner:', this.OWNER);
        console.log('📁 Repo:', this.REPO);
    }

    get OWNER() {
        return localStorage.getItem('ara_github_owner') || 'alikarami28';
    }
    
    get REPO() {
        return localStorage.getItem('ara_github_repo') || 'ARA-Coffee-POS';
    }
    
    get BRANCH() {
        return localStorage.getItem('ara_github_branch') || 'main';
    }
    
    get BASE_PATH() {
        return 'data';
    }

    _getToken() {
        const token = localStorage.getItem('ara_github_token') || '';
        return token;
    }

    _getHeaders() {
        const token = this._getToken();
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        return headers;
    }

    // ==================== READ ====================
    async read(fileName) {
        // Try cache
        if (this.cache[fileName] && (Date.now() - this.cache[fileName].time) < this.cacheTime) {
            return this.cache[fileName].data;
        }

        // Try GitHub Raw
        try {
            const url = `https://raw.githubusercontent.com/${this.OWNER}/${this.REPO}/${this.BRANCH}/${this.BASE_PATH}/${fileName}.json?t=${Date.now()}`;
            console.log('🌐 Reading:', url);
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                this.cache[fileName] = { data, time: Date.now() };
                this._localSet(fileName, data);
                console.log('✅', fileName, 'loaded from GitHub');
                return data;
            }
        } catch (e) {
            console.warn('GitHub read failed:', e.message);
        }

        // Fallback to localStorage
        const local = this._localGet(fileName);
        if (local) {
            this.cache[fileName] = { data: local, time: Date.now() };
            return local;
        }

        // Default
        return this._getDefault(fileName);
    }

    async getProducts() { 
        const data = await this.read('products'); 
        return data?.products || []; 
    }
    
    async getCategories() { 
        const data = await this.read('categories'); 
        return data?.categories || []; 
    }
    
    async getSettings() { 
        return await this.read('settings'); 
    }
    
    async getOrders() { 
        const data = await this.read('orders'); 
        return data?.orders || []; 
    }

    // ==================== WRITE ====================
    async write(fileName, data) {
        const token = this._getToken();
        
        if (!token) {
            console.warn('⚠️ No token - saving locally');
            this._localSet(fileName, data);
            return { success: false, message: 'توکن وارد نشده' };
        }

        try {
            const apiUrl = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.BASE_PATH}/${fileName}.json`;
            console.log('📝 Writing to:', apiUrl);
            
            // Get SHA if exists
            let sha = null;
            try {
                const checkRes = await fetch(apiUrl, { headers: this._getHeaders() });
                if (checkRes.ok) {
                    const fileInfo = await checkRes.json();
                    sha = fileInfo.sha;
                }
            } catch (e) {}

            // Prepare content
            const jsonStr = JSON.stringify(data, null, 2);
            const content = btoa(unescape(encodeURIComponent(jsonStr)));

            const body = {
                message: '📝 Update ' + fileName + '.json',
                content: content,
                branch: this.BRANCH
            };
            if (sha) body.sha = sha;

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: this._getHeaders(),
                body: JSON.stringify(body)
            });

            if (response.ok) {
                this.cache[fileName] = { data, time: Date.now() };
                this._localSet(fileName, data);
                console.log('✅ Saved to GitHub');
                return { success: true, message: '✅ در GitHub ذخیره شد' };
            } else {
                const err = await response.json();
                throw new Error(err.message);
            }
        } catch (error) {
            console.error('❌ Write error:', error.message);
            this._localSet(fileName, data);
            return { success: false, message: error.message };
        }
    }

    async saveProducts(products) { 
        return this.write('products', { 
            version: '1.0', 
            lastUpdated: new Date().toISOString(), 
            products 
        }); 
    }
    
    async saveCategories(categories) { 
        return this.write('categories', { 
            version: '1.0', 
            lastUpdated: new Date().toISOString(), 
            categories 
        }); 
    }
    
    async saveSettings(settings) { 
        return this.write('settings', settings); 
    }
    
    async saveOrders(orders) { 
        return this.write('orders', { 
            version: '1.0', 
            orders 
        }); 
    }

    // ==================== CRUD ====================
    async addProduct(p) { 
        const products = await this.getProducts(); 
        products.push(p); 
        await this.saveProducts(products); 
        return p; 
    }
    
    async updateProduct(id, updates) { 
        const products = await this.getProducts(); 
        const i = products.findIndex(p => p.id === id); 
        if (i > -1) { 
            products[i] = { ...products[i], ...updates, updatedAt: new Date().toISOString() }; 
            await this.saveProducts(products); 
            return products[i]; 
        } 
        return null; 
    }
    
    async deleteProduct(id) { 
        const products = await this.getProducts(); 
        await this.saveProducts(products.filter(p => p.id !== id)); 
        return true; 
    }
    
    async toggleProductStatus(id) { 
        const products = await this.getProducts(); 
        const p = products.find(x => x.id === id); 
        if (p) { 
            p.isActive = !p.isActive; 
            p.updatedAt = new Date().toISOString(); 
            await this.saveProducts(products); 
            return p; 
        } 
        return null; 
    }
    
    async addCategory(c) { 
        const categories = await this.getCategories(); 
        categories.push(c); 
        await this.saveCategories(categories); 
        return c; 
    }
    
    async updateCategory(id, updates) { 
        const categories = await this.getCategories(); 
        const i = categories.findIndex(c => c.id === id); 
        if (i > -1) { 
            categories[i] = { ...categories[i], ...updates }; 
            await this.saveCategories(categories); 
            return categories[i]; 
        } 
        return null; 
    }
    
    async deleteCategory(id) { 
        const categories = await this.getCategories(); 
        await this.saveCategories(categories.filter(c => c.id !== id)); 
        return true; 
    }
    
    async addOrder(o) { 
        const orders = await this.getOrders(); 
        orders.push(o); 
        await this.saveOrders(orders); 
        return o; 
    }

    // ==================== COMPATIBILITY ====================
    async getAll(store) {
        switch (store) {
            case 'products': return await this.getProducts();
            case 'categories': return await this.getCategories();
            case 'orders': return await this.getOrders();
            case 'users': return this._localGet('users') || [];
            default: return [];
        }
    }
    
    async getById(store, id) { 
        const items = await this.getAll(store); 
        return items.find(i => i.id === id) || null; 
    }
    
    async add(store, item) {
        switch (store) {
            case 'products': return await this.addProduct(item);
            case 'categories': return await this.addCategory(item);
            case 'orders': return await this.addOrder(item);
            case 'users': { 
                const u = this._localGet('users') || []; 
                u.push(item); 
                this._localSet('users', u); 
                return item; 
            }
            default: return item;
        }
    }
    
    async update(store, item) {
        switch (store) {
            case 'products': return await this.updateProduct(item.id, item);
            case 'categories': return await this.updateCategory(item.id, item);
            case 'users': { 
                const u = this._localGet('users') || []; 
                const i = u.findIndex(x => x.id === item.id); 
                if (i > -1) { u[i] = item; this._localSet('users', u); } 
                return item; 
            }
            default: return item;
        }
    }
    
    async delete(store, id) {
        switch (store) {
            case 'products': return await this.deleteProduct(id);
            case 'categories': return await this.deleteCategory(id);
            case 'users': { 
                this._localSet('users', (this._localGet('users') || []).filter(u => u.id !== id)); 
                return true; 
            }
            default: return true;
        }
    }
    
    async getByIndex(store, field, val) { 
        const items = await this.getAll(store); 
        return items.filter(i => i[field] === val); 
    }
    
    async count(store) { 
        return (await this.getAll(store)).length; 
    }
    
    async getOrdersByDateRange(start, end) { 
        const orders = await this.getOrders(); 
        return orders.filter(o => { 
            const d = new Date(o.createdAt); 
            return d >= new Date(start) && d <= new Date(end); 
        }); 
    }
    
    async clearStore(store) {
        switch (store) {
            case 'products': await this.saveProducts([]); break;
            case 'categories': await this.saveCategories([]); break;
            case 'orders': await this.saveOrders([]); break;
            case 'users': this._localSet('users', []); break;
        }
        return true;
    }

    // ==================== LOCAL ====================
    _localSet(key, data) { 
        try { 
            localStorage.setItem('ara_' + key, JSON.stringify(data)); 
        } catch (e) {} 
    }
    
    _localGet(key) { 
        try { 
            const raw = localStorage.getItem('ara_' + key); 
            return raw ? JSON.parse(raw) : null; 
        } catch (e) { 
            return null; 
        } 
    }
    
    _getDefault(fileName) {
        if (fileName === 'products') return { products: [] };
        if (fileName === 'categories') return { categories: [] };
        if (fileName === 'orders') return { orders: [] };
        if (fileName === 'settings') return { 
            cafeName: 'ARA Coffee', 
            currency: 'تومان', 
            taxRate: 9, 
            printerType: '58mm', 
            theme: 'light' 
        };
        return {};
    }

    // ==================== TEST CONNECTION ====================
    async testConnection() {
        const owner = this.OWNER;
        const repo = this.REPO;
        const token = this._getToken();
        
        console.log('🔍 Testing...');
        console.log('Owner:', owner);
        console.log('Repo:', repo);
        console.log('Token:', token ? token.substring(0, 12) + '...' : 'MISSING');
        
        if (!token) {
            return { success: false, message: '❌ توکن را وارد کنید' };
        }

        try {
            // تست ساده - چک کردن مخزن
            const url = 'https://api.github.com/repos/' + owner + '/' + repo;
            console.log('URL:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            console.log('Status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                return { 
                    success: true, 
                    repo: data.full_name,
                    message: '✅ متصل به ' + data.full_name
                };
            }
            
            if (response.status === 401) {
                return { success: false, message: '❌ توکن نامعتبر' };
            }
            
            if (response.status === 404) {
                return { success: false, message: '❌ مخزن یافت نشد: ' + owner + '/' + repo };
            }
            
            return { success: false, message: '❌ خطای ' + response.status };
            
        } catch (error) {
            return { success: false, message: '❌ ' + error.message };
        }
    }

    clearCache() { 
        this.cache = {}; 
    }
}

// ==================== INSTANCE ====================
const DB = new GitHubDB();

// ==================== SettingsManager ====================
const SettingsManager = {
    get(key, def) {
        try {
            const v = localStorage.getItem('ara_' + key);
            if (v === null || v === undefined) return def !== undefined ? def : null;
            try { return JSON.parse(v); } catch (e) { return v; }
        } catch (e) { return def !== undefined ? def : null; }
    },
    set(key, val) {
        try { localStorage.setItem('ara_' + key, JSON.stringify(val)); } catch (e) {}
    },
    getAll() {
        const s = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('ara_')) {
                try { s[k.replace('ara_', '')] = JSON.parse(localStorage.getItem(k)); } catch (e) {}
            }
        }
        return s;
    },
    remove(key) { localStorage.removeItem('ara_' + key); }
};

SettingsManager.setDefaults = function() {
    if (this.get('cafeName') === null) this.set('cafeName', 'ARA Coffee');
    if (this.get('currency') === null) this.set('currency', 'تومان');
    if (this.get('taxRate') === null) this.set('taxRate', 9);
    if (this.get('theme') === null) this.set('theme', 'light');
};
SettingsManager.setDefaults();

console.log('✅ GitHubDB Ready - alikarami28/ARA-Coffee-POS');