// github-db.js - GitHub JSON Database
// این فایل جایگزین storage.js میشه

class GitHubDB {
    constructor() {
        // ⚠️ این مقادیر رو با اطلاعات خودت جایگزین کن
        this.OWNER = 'YOUR_GITHUB_USERNAME';      // نام کاربری GitHub
        this.REPO = 'ARA-Coffee-POS';              // نام مخزن
        this.BRANCH = 'main';                      // برنچ اصلی
        this.BASE_PATH = 'data';                   // پوشه فایل‌های JSON
        
        this.API_URL = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.BASE_PATH}`;
        this.RAW_URL = `https://raw.githubusercontent.com/${this.OWNER}/${this.REPO}/${this.BRANCH}/${this.BASE_PATH}`;
        
        // کش برای کاهش درخواست‌ها
        this.cache = {};
        this.cacheTime = 10000; // 10 ثانیه
        
        console.log('📦 GitHubDB initialized');
        console.log('📡 API:', this.API_URL);
        console.log('🌐 RAW:', this.RAW_URL);
    }

    // ==================== TOKEN ====================
    
    _getToken() {
        return localStorage.getItem('ara_github_token') || '';
    }

    _getHeaders() {
        const token = this._getToken();
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }
        return headers;
    }

    // ==================== READ ====================
    
    async read(fileName) {
        // Check cache
        const cacheKey = fileName;
        if (this.cache[cacheKey] && (Date.now() - this.cache[cacheKey].time) < this.cacheTime) {
            console.log(`📦 ${fileName} from cache`);
            return this.cache[cacheKey].data;
        }

        try {
            const url = `${this.RAW_URL}/${fileName}.json?t=${Date.now()}`;
            console.log(`🌐 Fetching: ${url}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update cache
            this.cache[cacheKey] = { data, time: Date.now() };
            
            // Backup to localStorage
            this._localSet(fileName, data);
            
            console.log(`✅ ${fileName} loaded from GitHub`);
            return data;
            
        } catch (error) {
            console.warn(`⚠️ GitHub failed for ${fileName}:`, error.message);
            console.log(`📦 Loading ${fileName} from localStorage...`);
            
            // Fallback to localStorage
            const localData = this._localGet(fileName);
            if (localData) {
                this.cache[cacheKey] = { data: localData, time: Date.now() };
                return localData;
            }
            
            // Return defaults
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

    // ==================== WRITE ====================
    
    async write(fileName, data) {
        const token = this._getToken();
        
        if (!token) {
            console.warn('⚠️ No GitHub token. Saving locally only.');
            this._localSet(fileName, data);
            return { success: false, message: 'No token - saved locally' };
        }

        try {
            const path = `${this.BASE_PATH}/${fileName}.json`;
            const url = `${this.API_URL}/${fileName}.json`;
            
            // Get SHA if file exists
            let sha = null;
            try {
                const checkRes = await fetch(url, { headers: this._getHeaders() });
                if (checkRes.ok) {
                    const fileInfo = await checkRes.json();
                    sha = fileInfo.sha;
                }
            } catch (e) {
                // File doesn't exist yet
            }

            // Prepare content
            const jsonStr = JSON.stringify(data, null, 2);
            const content = btoa(unescape(encodeURIComponent(jsonStr)));

            // Create/Update file
            const body = {
                message: `📝 Update ${fileName}.json - ${new Date().toLocaleString('fa-IR')}`,
                content: content,
                branch: this.BRANCH
            };
            
            if (sha) body.sha = sha;

            const response = await fetch(url, {
                method: 'PUT',
                headers: this._getHeaders(),
                body: JSON.stringify(body)
            });

            if (response.ok) {
                // Update cache and localStorage
                this.cache[fileName] = { data, time: Date.now() };
                this._localSet(fileName, data);
                
                console.log(`✅ ${fileName}.json saved to GitHub`);
                return { success: true, message: 'Saved to GitHub ✅' };
            } else {
                const err = await response.json();
                throw new Error(err.message || 'Unknown error');
            }
            
        } catch (error) {
            console.error(`❌ GitHub write failed:`, error.message);
            
            // Save locally as fallback
            this._localSet(fileName, data);
            this.cache[fileName] = { data, time: Date.now() };
            
            return { success: false, message: error.message };
        }
    }

    async saveProducts(products) {
        const data = {
            version: '1.0',
            lastUpdated: new Date().toISOString(),
            products: products
        };
        return this.write('products', data);
    }

    async saveCategories(categories) {
        const data = {
            version: '1.0',
            lastUpdated: new Date().toISOString(),
            categories: categories
        };
        return this.write('categories', data);
    }

    async saveSettings(settings) {
        return this.write('settings', settings);
    }

    async saveOrders(orders) {
        const data = {
            version: '1.0',
            orders: orders
        };
        return this.write('orders', data);
    }

    // ==================== CRUD HELPERS ====================
    
    async addProduct(product) {
        const products = await this.getProducts();
        products.push(product);
        await this.saveProducts(products);
        return product;
    }

    async updateProduct(productId, updates) {
        const products = await this.getProducts();
        const index = products.findIndex(p => p.id === productId);
        if (index > -1) {
            products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
            await this.saveProducts(products);
            return products[index];
        }
        return null;
    }

    async deleteProduct(productId) {
        const products = await this.getProducts();
        const filtered = products.filter(p => p.id !== productId);
        await this.saveProducts(filtered);
        return true;
    }

    async toggleProductStatus(productId) {
        const products = await this.getProducts();
        const product = products.find(p => p.id === productId);
        if (product) {
            product.isActive = !product.isActive;
            product.updatedAt = new Date().toISOString();
            await this.saveProducts(products);
            return product;
        }
        return null;
    }

    async addCategory(category) {
        const categories = await this.getCategories();
        categories.push(category);
        await this.saveCategories(categories);
        return category;
    }

    async updateCategory(categoryId, updates) {
        const categories = await this.getCategories();
        const index = categories.findIndex(c => c.id === categoryId);
        if (index > -1) {
            categories[index] = { ...categories[index], ...updates };
            await this.saveCategories(categories);
            return categories[index];
        }
        return null;
    }

    async deleteCategory(categoryId) {
        const categories = await this.getCategories();
        const filtered = categories.filter(c => c.id !== categoryId);
        await this.saveCategories(filtered);
        return true;
    }

    async addOrder(order) {
        const orders = await this.getOrders();
        orders.push(order);
        await this.saveOrders(orders);
        return order;
    }

    // ==================== LOCAL STORAGE ====================
    
    _localSet(key, data) {
        try {
            localStorage.setItem(`ara_${key}`, JSON.stringify(data));
        } catch (e) {
            console.warn('localStorage full');
        }
    }

    _localGet(key) {
        try {
            const raw = localStorage.getItem(`ara_${key}`);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    _getDefault(fileName) {
        switch (fileName) {
            case 'products': return { products: [] };
            case 'categories': return { categories: [] };
            case 'orders': return { orders: [] };
            case 'settings': return {
                cafeName: 'ARA Coffee',
                currency: 'تومان',
                taxRate: 9,
                printerType: '58mm',
                theme: 'light'
            };
            default: return {};
        }
    }

    // ==================== TEST ====================
    
    async testConnection() {
        const token = this._getToken();
        if (!token) {
            return { success: false, message: 'توکن وارد نشده است' };
        }

        try {
            const url = `https://api.github.com/repos/${this.OWNER}/${this.REPO}`;
            const response = await fetch(url, {
                headers: this._getHeaders()
            });
            
            if (response.ok) {
                const repo = await response.json();
                return {
                    success: true,
                    repo: repo.full_name,
                    stars: repo.stargazers_count,
                    lastPush: repo.pushed_at
                };
            } else {
                return { success: false, message: 'مخزن یافت نشد یا توکن نامعتبر است' };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    clearCache() {
        this.cache = {};
        console.log('🗑️ Cache cleared');
    }
}

// ==================== INSTANCE ====================
const DB = new GitHubDB();

// ==================== برای تست در Console ====================
console.log('📦 GitHubDB ready! Use:');
console.log('  DB.getProducts().then(console.log)');
console.log('  DB.testConnection().then(console.log)');