// github-db.js - نسخه اصلاح شده Write
class GitHubDB {
    constructor() {
        this.cache = {};
        this.cacheTime = 5000;
        console.log('📦 GitHubDB Ready');
    }

    get OWNER() { return localStorage.getItem('ara_github_owner') || 'alikarami28'; }
    get REPO() { return localStorage.getItem('ara_github_repo') || 'ARA-Coffee-POS'; }
    get BRANCH() { return localStorage.getItem('ara_github_branch') || 'main'; }
    get BASE_PATH() { return 'data'; }

    _getToken() { return localStorage.getItem('ara_github_token') || ''; }

    _getHeaders() {
        const token = this._getToken();
        const h = { 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
        if (token) h['Authorization'] = 'Bearer ' + token;
        return h;
    }

    // ==================== READ ====================
    async read(fileName) {
        // اول از localStorage
        const local = this._localGet(fileName);
        
        // در پس‌زمینه از GitHub آپدیت کن
        this._fetchGH(fileName).then(data => {
            if (data) {
                this._localSet(fileName, data);
                this.cache[fileName] = { data, time: Date.now() };
            }
        }).catch(() => {});
        
        if (local) return local;
        
        // اگه localStorage خالی بود
        try {
            const data = await this._fetchGH(fileName);
            if (data) {
                this._localSet(fileName, data);
                return data;
            }
        } catch (e) {}
        
        return this._getDefault(fileName);
    }

    async _fetchGH(fileName) {
        try {
            const url = `https://raw.githubusercontent.com/${this.OWNER}/${this.REPO}/${this.BRANCH}/${this.BASE_PATH}/${fileName}.json?t=${Date.now()}`;
            const response = await fetch(url);
            if (response.ok) return await response.json();
        } catch (e) {}
        return null;
    }

    async getProducts() { const d = await this.read('products'); return d?.products || []; }
    async getCategories() { const d = await this.read('categories'); return d?.categories || []; }
    async getSettings() { return await this.read('settings'); }
    async getOrders() { const d = await this.read('orders'); return d?.orders || []; }

    // ==================== WRITE ====================
    async write(fileName, data) {
        // همیشه اول localStorage
        this._localSet(fileName, data);
        this.cache[fileName] = { data, time: Date.now() };
        
        const token = this._getToken();
        
        if (!token) {
            console.warn('⚠️ No token - localStorage only');
            return { success: false, message: 'توکن نیست - فقط در مرورگر ذخیره شد' };
        }

        try {
            const apiUrl = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.BASE_PATH}/${fileName}.json`;
            console.log('📝 Writing to GitHub:', apiUrl);
            
            // Get SHA
            let sha = null;
            try {
                const checkRes = await fetch(apiUrl, { headers: this._getHeaders() });
                if (checkRes.ok) {
                    const fileInfo = await checkRes.json();
                    sha = fileInfo.sha;
                    console.log('📄 File exists, SHA:', sha?.substring(0, 8));
                } else {
                    console.log('📄 File does not exist, creating new');
                }
            } catch (e) {
                console.log('📄 SHA check failed:', e.message);
            }

            const jsonStr = JSON.stringify(data, null, 2);
            const content = btoa(unescape(encodeURIComponent(jsonStr)));
            
            const body = {
                message: '📝 Update ' + fileName + '.json - ' + new Date().toLocaleString('fa-IR'),
                content: content,
                branch: this.BRANCH
            };
            if (sha) body.sha = sha;

            console.log('📤 Sending to GitHub...');
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: this._getHeaders(),
                body: JSON.stringify(body)
            });

            console.log('📡 Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Successfully saved to GitHub!');
                console.log('📝 Commit:', result.commit?.message);
                console.log('🔗 URL:', result.content?.html_url);
                
                return { 
                    success: true, 
                    message: '✅ در GitHub ذخیره شد',
                    url: result.content?.html_url
                };
            } else {
                const error = await response.json();
                console.error('❌ GitHub API Error:', error);
                throw new Error(error.message || 'Unknown error');
            }
            
        } catch (error) {
            console.error('❌ GitHub write failed:', error.message);
            return { 
                success: false, 
                message: '❌ GitHub: ' + error.message + ' - فقط در مرورگر ذخیره شد'
            };
        }
    }

    async saveProducts(products) { 
        const data = { version: '1.0', lastUpdated: new Date().toISOString(), products };
        return await this.write('products', data); 
    }
    async saveCategories(categories) { 
        const data = { version: '1.0', lastUpdated: new Date().toISOString(), categories };
        return await this.write('categories', data); 
    }
    async saveSettings(settings) { return await this.write('settings', settings); }
    async saveOrders(orders) { 
        const data = { version: '1.0', orders };
        return await this.write('orders', data); 
    }

    // ==================== CRUD ====================
    async addProduct(p) { 
        const prods = await this.getProducts(); 
        prods.push(p); 
        const result = await this.saveProducts(prods);
        console.log('📦 addProduct result:', result);
        return { product: p, result: result };
    }
    
    async updateProduct(id, updates) { 
        const prods = await this.getProducts(); 
        const i = prods.findIndex(x => x.id === id); 
        if (i > -1) { 
            prods[i] = { ...prods[i], ...updates, updatedAt: new Date().toISOString() }; 
            const result = await this.saveProducts(prods);
            return { product: prods[i], result: result };
        } 
        return null; 
    }
    
    async deleteProduct(id) { 
        const prods = await this.getProducts(); 
        const result = await this.saveProducts(prods.filter(p => p.id !== id)); 
        return { success: true, result: result }; 
    }
    
    async toggleProductStatus(id) { 
        const prods = await this.getProducts(); 
        const p = prods.find(x => x.id === id); 
        if (p) { 
            p.isActive = !p.isActive; 
            p.updatedAt = new Date().toISOString(); 
            const result = await this.saveProducts(prods);
            return { product: p, result: result }; 
        } 
        return null; 
    }
    
    async addCategory(c) { 
        const cats = await this.getCategories(); 
        cats.push(c); 
        return await this.saveCategories(cats); 
    }
    
    async updateCategory(id, updates) { 
        const cats = await this.getCategories(); 
        const i = cats.findIndex(x => x.id === id); 
        if (i > -1) { 
            cats[i] = { ...cats[i], ...updates }; 
            return await this.saveCategories(cats); 
        } 
        return null; 
    }
    
    async deleteCategory(id) { 
        const cats = await this.getCategories(); 
        return await this.saveCategories(cats.filter(c => c.id !== id)); 
    }
    
    async addOrder(o) { 
        const orders = await this.getOrders(); 
        orders.push(o); 
        return await this.saveOrders(orders); 
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
    async getById(store, id) { const items = await this.getAll(store); return items.find(i => i.id === id) || null; }
    
    async add(store, item) {
        switch (store) {
            case 'products': const r1 = await this.addProduct(item); return r1.product || item;
            case 'categories': return await this.addCategory(item);
            case 'orders': return await this.addOrder(item);
            case 'users': { const u = this._localGet('users') || []; u.push(item); this._localSet('users', u); return item; }
            default: return item;
        }
    }
    
    async update(store, item) {
        switch (store) {
            case 'products': const r2 = await this.updateProduct(item.id, item); return r2?.product || item;
            case 'categories': return await this.updateCategory(item.id, item);
            case 'users': { const u = this._localGet('users') || []; const i = u.findIndex(x => x.id === item.id); if (i > -1) u[i] = item; this._localSet('users', u); return item; }
            default: return item;
        }
    }
    
    async delete(store, id) {
        switch (store) {
            case 'products': return await this.deleteProduct(id);
            case 'categories': return await this.deleteCategory(id);
            case 'users': { this._localSet('users', (this._localGet('users') || []).filter(u => u.id !== id)); return true; }
            default: return true;
        }
    }
    
    async getByIndex(store, field, val) { const items = await this.getAll(store); return items.filter(i => i[field] === val); }
    async count(store) { return (await this.getAll(store)).length; }
    async getOrdersByDateRange(start, end) { const orders = await this.getOrders(); return orders.filter(o => { const d = new Date(o.createdAt); return d >= new Date(start) && d <= new Date(end); }); }
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
    _localSet(key, data) { try { localStorage.setItem('ara_' + key, JSON.stringify(data)); } catch (e) {} }
    _localGet(key) { try { const r = localStorage.getItem('ara_' + key); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
    _getDefault(fileName) {
        if (fileName === 'products') return { products: [] };
        if (fileName === 'categories') return { categories: [] };
        if (fileName === 'orders') return { orders: [] };
        if (fileName === 'settings') return { cafeName: 'ARA Coffee', currency: 'تومان', taxRate: 9, theme: 'light' };
        return {};
    }

    async testConnection() {
        const token = this._getToken();
        if (!token) return { success: false, message: '❌ توکن وارد نشده' };
        try {
            const res = await fetch(`https://api.github.com/repos/${this.OWNER}/${this.REPO}`, { headers: this._getHeaders() });
            if (res.ok) {
                const d = await res.json();
                return { success: true, repo: d.full_name, message: '✅ متصل به ' + d.full_name };
            }
            if (res.status === 401) return { success: false, message: '❌ توکن نامعتبر' };
            if (res.status === 404) return { success: false, message: '❌ مخزن یافت نشد' };
            return { success: false, message: '❌ خطای ' + res.status };
        } catch (e) {
            return { success: false, message: '❌ ' + e.message };
        }
    }

    clearCache() { this.cache = {}; }
}

const DB = new GitHubDB();

const SettingsManager = {
    get(key, def) {
        try { const v = localStorage.getItem('ara_' + key); return v === null ? (def !== undefined ? def : null) : JSON.parse(v); } catch (e) { return def !== undefined ? def : null; }
    },
    set(key, val) { try { localStorage.setItem('ara_' + key, JSON.stringify(val)); } catch (e) {} },
    getAll() {
        const s = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith('ara_')) try { s[k.replace('ara_', '')] = JSON.parse(localStorage.getItem(k)); } catch (e) {}
        }
        return s;
    },
    remove(key) { localStorage.removeItem('ara_' + key); }
};

['cafeName','currency','taxRate','theme'].forEach(k => {
    if (SettingsManager.get(k) === null) {
        const defaults = { cafeName: 'ARA Coffee', currency: 'تومان', taxRate: 9, theme: 'light' };
        SettingsManager.set(k, defaults[k]);
    }
});

console.log('✅ GitHubDB Ready');