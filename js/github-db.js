// github-db.js - GitHub ONLY Database (No localStorage)
// Version: 5.0 - Pure GitHub

class GitHubDB {
    constructor() {
        this.cache = {};
        this.cacheTime = 30000; // 30 ثانیه کش
        console.log('📦 GitHubDB v5.0 - Pure GitHub Mode');
    }

    get OWNER() { return localStorage.getItem('ara_github_owner') || 'alikarami28'; }
    get REPO() { return localStorage.getItem('ara_github_repo') || 'ARA-Coffee-POS'; }
    get BRANCH() { return localStorage.getItem('ara_github_branch') || 'main'; }
    get BASE_PATH() { return 'data'; }

    _getToken() { return localStorage.getItem('ara_github_token') || ''; }

    _getHeaders() {
        const token = this._getToken();
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    }

    // ==================== READ FROM GITHUB ====================
    async read(fileName) {
        const cacheKey = fileName;
        
        // Check cache first
        if (this.cache[cacheKey] && (Date.now() - this.cache[cacheKey].time) < this.cacheTime) {
            console.log(`📦 ${fileName} from cache`);
            return this.cache[cacheKey].data;
        }

        try {
            // Read from GitHub Raw
            const rawUrl = `https://raw.githubusercontent.com/${this.OWNER}/${this.REPO}/${this.BRANCH}/${this.BASE_PATH}/${fileName}.json?t=${Date.now()}`;
            console.log(`🌐 Reading: ${rawUrl}`);
            
            const response = await fetch(rawUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update cache
            this.cache[cacheKey] = { data, time: Date.now() };
            
            console.log(`✅ ${fileName} loaded from GitHub (${data?.products?.length || data?.categories?.length || '?'} items)`);
            return data;
            
        } catch (error) {
            console.error(`❌ Failed to read ${fileName} from GitHub:`, error.message);
            
            // Try API as fallback (for private repos with token)
            try {
                const token = this._getToken();
                if (token) {
                    const apiUrl = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.BASE_PATH}/${fileName}.json`;
                    console.log(`🔄 Trying API: ${apiUrl}`);
                    
                    const response = await fetch(apiUrl, { headers: this._getHeaders() });
                    
                    if (response.ok) {
                        const fileData = await response.json();
                        const content = decodeURIComponent(escape(atob(fileData.content)));
                        const data = JSON.parse(content);
                        
                        this.cache[cacheKey] = { data, time: Date.now() };
                        console.log(`✅ ${fileName} loaded via API`);
                        return data;
                    }
                }
            } catch (apiError) {
                console.error('API fallback also failed:', apiError.message);
            }
            
            // Return defaults if everything fails
            return this._getDefault(fileName);
        }
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

    // ==================== WRITE TO GITHUB ====================
    async write(fileName, data) {
        const token = this._getToken();
        
        if (!token) {
            console.error('❌ No GitHub token! Cannot save.');
            return { success: false, message: '❌ توکن GitHub وارد نشده. نمی‌توان ذخیره کرد.' };
        }

        try {
            const apiUrl = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.BASE_PATH}/${fileName}.json`;
            console.log(`📝 Writing to: ${apiUrl}`);
            
            // Get current SHA (required for update)
            let sha = null;
            try {
                const checkRes = await fetch(apiUrl, { headers: this._getHeaders() });
                if (checkRes.ok) {
                    const fileInfo = await checkRes.json();
                    sha = fileInfo.sha;
                    console.log(`📄 File exists, SHA: ${sha?.substring(0, 8)}`);
                } else {
                    console.log('📄 Creating new file');
                }
            } catch (e) {
                console.log('📄 SHA check skipped:', e.message);
            }

            // Prepare content
            const jsonStr = JSON.stringify(data, null, 2);
            const content = btoa(unescape(encodeURIComponent(jsonStr)));
            
            const body = {
                message: `📝 Update ${fileName}.json - ${new Date().toLocaleString('fa-IR')}`,
                content: content,
                branch: this.BRANCH
            };
            if (sha) body.sha = sha;

            // Send to GitHub
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: this._getHeaders(),
                body: JSON.stringify(body)
            });

            console.log(`📡 Response: ${response.status}`);
            
            if (response.ok) {
                const result = await response.json();
                console.log(`✅ ${fileName} saved to GitHub!`);
                console.log(`📝 Commit: ${result.commit?.message}`);
                
                // Update cache
                this.cache[fileName] = { data, time: Date.now() };
                
                return { 
                    success: true, 
                    message: '✅ در GitHub ذخیره شد',
                    commit: result.commit?.html_url
                };
            } else {
                const error = await response.json();
                console.error('❌ GitHub API Error:', error);
                throw new Error(error.message || 'Unknown error');
            }
            
        } catch (error) {
            console.error('❌ Write failed:', error.message);
            return { 
                success: false, 
                message: '❌ ذخیره نشد: ' + error.message
            };
        }
    }

    async saveProducts(products) { 
        console.log(`💾 Saving ${products.length} products to GitHub...`);
        const data = { version: '1.0', lastUpdated: new Date().toISOString(), products };
        return await this.write('products', data); 
    }
    
    async saveCategories(categories) { 
        console.log(`💾 Saving ${categories.length} categories to GitHub...`);
        const data = { version: '1.0', lastUpdated: new Date().toISOString(), categories };
        return await this.write('categories', data); 
    }
    
    async saveSettings(settings) { 
        console.log('💾 Saving settings to GitHub...');
        return await this.write('settings', settings); 
    }
    
    async saveOrders(orders) { 
        console.log(`💾 Saving ${orders.length} orders to GitHub...`);
        const data = { version: '1.0', orders };
        return await this.write('orders', data); 
    }

    // ==================== CRUD ====================
    async addProduct(p) { 
        const products = await this.getProducts(); 
        products.push(p); 
        const result = await this.saveProducts(products);
        return { product: p, result }; 
    }
    
    async updateProduct(id, updates) { 
        const products = await this.getProducts(); 
        const index = products.findIndex(p => p.id === id); 
        if (index > -1) { 
            products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() }; 
            const result = await this.saveProducts(products);
            return { product: products[index], result }; 
        } 
        return null; 
    }
    
    async deleteProduct(id) { 
        const products = await this.getProducts(); 
        const result = await this.saveProducts(products.filter(p => p.id !== id)); 
        return { result }; 
    }
    
    async toggleProductStatus(id) { 
        const products = await this.getProducts(); 
        const p = products.find(x => x.id === id); 
        if (p) { 
            p.isActive = !p.isActive; 
            p.updatedAt = new Date().toISOString(); 
            const result = await this.saveProducts(products);
            return { product: p, result }; 
        } 
        return null; 
    }
    
    async addCategory(c) { 
        const categories = await this.getCategories(); 
        categories.push(c); 
        return await this.saveCategories(categories); 
    }
    
    async updateCategory(id, updates) { 
        const categories = await this.getCategories(); 
        const index = categories.findIndex(c => c.id === id); 
        if (index > -1) { 
            categories[index] = { ...categories[index], ...updates }; 
            return await this.saveCategories(categories); 
        } 
        return null; 
    }
    
    async deleteCategory(id) { 
        const categories = await this.getCategories(); 
        return await this.saveCategories(categories.filter(c => c.id !== id)); 
    }
    
    async addOrder(o) { 
        const orders = await this.getOrders(); 
        orders.push(o); 
        return await this.saveOrders(orders); 
    }

    // ==================== COMPATIBILITY (Same API as old storage.js) ====================
    async getAll(store) {
        switch (store) {
            case 'products': return await this.getProducts();
            case 'categories': return await this.getCategories();
            case 'orders': return await this.getOrders();
            case 'users': return []; // Users not stored in GitHub
            default: return [];
        }
    }
    
    async getById(store, id) { 
        const items = await this.getAll(store); 
        return items.find(i => i.id === id) || null; 
    }
    
    async add(store, item) {
        switch (store) {
            case 'products': const r1 = await this.addProduct(item); return r1.product || item;
            case 'categories': return await this.addCategory(item);
            case 'orders': return await this.addOrder(item);
            default: return item;
        }
    }
    
    async update(store, item) {
        switch (store) {
            case 'products': const r2 = await this.updateProduct(item.id, item); return r2?.product || item;
            case 'categories': return await this.updateCategory(item.id, item);
            default: return item;
        }
    }
    
    async delete(store, id) {
        switch (store) {
            case 'products': return await this.deleteProduct(id);
            case 'categories': return await this.deleteCategory(id);
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
        }
        return true;
    }

    // ==================== DEFAULTS ====================
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
        const token = this._getToken();
        
        console.log('🔍 Testing GitHub connection...');
        console.log('👤 Owner:', this.OWNER);
        console.log('📁 Repo:', this.REPO);
        console.log('🔑 Token:', token ? token.substring(0, 12) + '...' : 'MISSING');
        
        if (!token) {
            return { success: false, message: '❌ توکن وارد نشده است' };
        }

        try {
            const url = `https://api.github.com/repos/${this.OWNER}/${this.REPO}`;
            const response = await fetch(url, { headers: this._getHeaders() });
            
            console.log('📡 Status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                return { 
                    success: true, 
                    repo: data.full_name,
                    message: '✅ متصل به ' + data.full_name 
                };
            }
            
            if (response.status === 401) {
                return { success: false, message: '❌ توکن نامعتبر است' };
            }
            
            if (response.status === 404) {
                return { success: false, message: '❌ مخزن یافت نشد: ' + this.OWNER + '/' + this.REPO };
            }
            
            return { success: false, message: '❌ خطای ' + response.status };
            
        } catch (error) {
            return { success: false, message: '❌ ' + error.message };
        }
    }

    clearCache() { 
        this.cache = {}; 
        console.log('🗑️ Cache cleared');
    }
}

// ==================== INSTANCE ====================
const DB = new GitHubDB();

// ==================== SettingsManager (Only for GitHub config) ====================
const SettingsManager = {
    get(key, def) {
        // Only return GitHub config from localStorage
        const ghKeys = ['github_owner', 'github_repo', 'github_branch', 'github_token', 'theme'];
        if (ghKeys.includes(key)) {
            try {
                const v = localStorage.getItem('ara_' + key);
                return v !== null ? JSON.parse(v) : (def !== undefined ? def : null);
            } catch (e) { return def !== undefined ? def : null; }
        }
        return def !== undefined ? def : null;
    },
    set(key, val) {
        // Only save GitHub config to localStorage
        const ghKeys = ['github_owner', 'github_repo', 'github_branch', 'github_token', 'theme'];
        if (ghKeys.includes(key)) {
            try { localStorage.setItem('ara_' + key, JSON.stringify(val)); } catch (e) {}
        }
    },
    getAll() {
        const s = {};
        const ghKeys = ['github_owner', 'github_repo', 'github_branch', 'github_token', 'theme'];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith('ara_') && ghKeys.some(gk => k === 'ara_' + gk)) {
                try { s[k.replace('ara_', '')] = JSON.parse(localStorage.getItem(k)); } catch (e) {}
            }
        }
        return s;
    },
    remove(key) { localStorage.removeItem('ara_' + key); }
};

console.log('✅ GitHubDB v5.0 Ready - Pure GitHub Mode');
console.log('📌 Data is stored ONLY on GitHub');
console.log('🔑 Only GitHub config is in localStorage');