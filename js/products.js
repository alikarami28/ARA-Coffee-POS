// products.js - Product & Category Management (GitHub Version)
class ProductManager {
    static async addProduct(productData) {
        if (!productData.name?.trim()) throw new Error('نام محصول الزامی است');
        if (!productData.categoryId) throw new Error('دسته‌بندی را انتخاب کنید');
        if (!productData.price || isNaN(productData.price) || productData.price < 0) throw new Error('قیمت نامعتبر است');

        const product = {
            id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            name: productData.name.trim(),
            categoryId: productData.categoryId,
            price: parseFloat(productData.price),
            description: productData.description || '',
            image: productData.image || '',
            isActive: productData.isActive !== false,
            displayOrder: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await DB.addProduct(product);
        if (result.success !== false) {
            UI.showToast('success', '✅ محصول در GitHub ذخیره شد');
        } else {
            UI.showToast('warning', '⚠️ محصول فقط در حافظه محلی ذخیره شد');
        }
        return product;
    }

    static async updateProduct(productId, updates) {
        const result = await DB.updateProduct(productId, updates);
        if (result) {
            UI.showToast('success', '✅ محصول بروزرسانی شد');
        } else {
            UI.showToast('error', '❌ محصول یافت نشد');
        }
        return result;
    }

    static async deleteProduct(productId) {
        await DB.deleteProduct(productId);
        UI.showToast('success', '🗑️ محصول حذف شد');
        return true;
    }

    static async toggleProductStatus(productId) {
        const product = await DB.toggleProductStatus(productId);
        if (product) {
            UI.showToast('info', `محصول "${product.name}" ${product.isActive ? 'فعال' : 'غیرفعال'} شد`);
        }
        return product;
    }
}

class CategoryManager {
    static async addCategory(name, icon = '📂') {
        if (!name?.trim()) throw new Error('نام دسته‌بندی الزامی است');
        
        const category = {
            id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            name: name.trim(),
            icon: icon,
            isDefault: false,
            displayOrder: (await DB.getCategories()).length,
            createdAt: new Date().toISOString()
        };

        await DB.addCategory(category);
        UI.showToast('success', '✅ دسته‌بندی اضافه شد');
        return category;
    }

    static async updateCategory(categoryId, updates) {
        await DB.updateCategory(categoryId, updates);
        UI.showToast('success', '✅ دسته‌بندی بروزرسانی شد');
    }

    static async deleteCategory(categoryId) {
        const category = (await DB.getCategories()).find(c => c.id === categoryId);
        if (category?.isDefault) throw new Error('دسته‌بندی پیش‌فرض قابل حذف نیست');
        
        const products = (await DB.getProducts()).filter(p => p.categoryId === categoryId);
        if (products.length > 0) throw new Error(`این دسته ${products.length} محصول دارد`);
        
        await DB.deleteCategory(categoryId);
        UI.showToast('success', '🗑️ دسته‌بندی حذف شد');
    }

    static async ensureDefaults() {
        const categories = await DB.getCategories();
        if (categories.length === 0) {
            const defaults = [
                { name: 'اسپرسو', icon: '☕' },
                { name: 'قهوه گرم', icon: '🫖' },
                { name: 'قهوه سرد', icon: '🧊' },
                { name: 'چای', icon: '🍵' },
                { name: 'مچا', icon: '🍃' },
                { name: 'نوشیدنی سرد', icon: '🥤' },
                { name: 'دسر', icon: '🍰' },
                { name: 'شیرینی', icon: '🥐' }
            ];
            
            const newCategories = defaults.map((d, i) => ({
                id: 'cat-default-' + i,
                name: d.name,
                icon: d.icon,
                isDefault: true,
                displayOrder: i,
                createdAt: new Date().toISOString()
            }));
            
            await DB.saveCategories(newCategories);
            console.log('✅ Default categories created');
        }
    }
}

// ==================== Admin Panel ====================
class AdminPanel {
    static allProducts = [];
    static allCategories = [];
    static allUsers = [];

    static async init() {
        console.log('🔧 AdminPanel init');
        
        if (typeof AuthManager !== 'undefined' && !AuthManager.isLoggedIn()) {
            window.location.href = '/login.html';
            return;
        }
        
        if (typeof UI !== 'undefined') UI.displayUserInfo();
        
        await CategoryManager.ensureDefaults();
        await this.loadAll();
        this.setupListeners();
        
        console.log('✅ AdminPanel ready');
    }

    static async loadAll() {
        await this.loadCategories();
        await this.loadProducts();
        await this.loadUsers();
    }

    static async loadCategories() {
        this.allCategories = await DB.getCategories();
        this.allCategories.sort((a, b) => a.displayOrder - b.displayOrder);
        
        // Update select
        const select = document.getElementById('product-category');
        if (select) {
            select.innerHTML = '<option value="">انتخاب کنید...</option>' +
                this.allCategories.map(c => `<option value="${c.id}">${c.icon || ''} ${c.name}</option>`).join('');
        }
        
        // Render list
        const container = document.getElementById('categories-list');
        if (container) {
            container.innerHTML = this.allCategories.map(cat => `
                <div class="category-card-admin">
                    <div class="category-info">
                        <span class="category-icon">${cat.icon || '📂'}</span>
                        <div class="category-details">
                            <h3>${cat.name}</h3>
                            ${cat.isDefault ? '<span class="category-badge">پیش‌فرض</span>' : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn-action btn-edit" onclick="AdminPanel.editCategory('${cat.id}')">✏️</button>
                        ${!cat.isDefault ? `<button class="btn-action btn-delete" onclick="AdminPanel.deleteCategory('${cat.id}')">🗑️</button>` : ''}
                    </div>
                </div>
            `).join('');
        }
    }

    static async loadProducts(search = '') {
        this.allProducts = await DB.getProducts();
        
        let filtered = this.allProducts;
        if (search) {
            const term = search.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(term));
        }
        filtered.sort((a, b) => a.displayOrder - b.displayOrder);
        
        const container = document.getElementById('products-list');
        if (!container) return;
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">📦</span><p>محصولی یافت نشد</p></div>';
            return;
        }
        
        container.innerHTML = filtered.map(product => {
            const cat = this.allCategories.find(c => c.id === product.categoryId);
            const catName = cat ? `${cat.icon || ''} ${cat.name}` : 'بدون دسته';
            
            return `
                <div class="product-card-admin">
                    <img src="${product.image || '/assets/images/logo-placeholder.png'}" alt="${product.name}" onerror="this.style.display='none'">
                    <div class="product-info-admin">
                        <h3>${product.name}</h3>
                        <div class="product-price">💰 ${UI.formatCurrency(product.price)}</div>
                        <div class="product-category">📂 ${catName}</div>
                        <span class="product-status ${product.isActive ? 'active' : 'inactive'}">${product.isActive ? '✅ فعال' : '❌ غیرفعال'}</span>
                        <div class="product-actions">
                            <button class="btn-action btn-edit" onclick="AdminPanel.openEditModal('${product.id}')">✏️ ویرایش</button>
                            <button class="btn-action btn-toggle" onclick="AdminPanel.toggleProduct('${product.id}')">${product.isActive ? '🚫 غیرفعال' : '✅ فعال'}</button>
                            <button class="btn-action btn-delete" onclick="AdminPanel.deleteProduct('${product.id}')">🗑️ حذف</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    static async loadUsers() {
        const users = DB._localGet('users') || [];
        this.allUsers = users;
        
        const container = document.getElementById('users-list');
        if (!container) return;
        
        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">👤</span><p>کاربری یافت نشد</p></div>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="user-card-admin">
                <div class="user-info">
                    <div class="user-avatar-large">${user.username.charAt(0).toUpperCase()}</div>
                    <div class="user-details">
                        <h3>${user.username}</h3>
                        <span class="user-role-badge ${user.role}">${user.role === 'admin' ? '👑 مدیر' : '💼 صندوق‌دار'}</span>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-action btn-edit" onclick="AdminPanel.editUser('${user.id}')">✏️</button>
                    ${user.role !== 'admin' ? `<button class="btn-action btn-delete" onclick="AdminPanel.deleteUser('${user.id}')">🗑️</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    // ==================== SETUP ====================
    
    static setupListeners() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                document.getElementById('tab-' + this.dataset.tab)?.classList.add('active');
            });
        });

        // Add product
        document.getElementById('add-product-btn')?.addEventListener('click', () => this.openAddModal());
        
        // Add category
        document.getElementById('add-category-btn')?.addEventListener('click', () => this.addCategoryDialog());
        
        // Add user
        document.getElementById('add-user-btn')?.addEventListener('click', () => this.openUserModal());
        
        // Search
        document.getElementById('product-search')?.addEventListener('input', (e) => this.loadProducts(e.target.value));
        
        // Product form
        document.getElementById('product-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProduct();
        });
        
        // User form
        document.getElementById('user-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveUser();
        });
        
        // Close modals
        document.getElementById('modal-close')?.addEventListener('click', () => this.closeProductModal());
        document.getElementById('user-modal-close')?.addEventListener('click', () => this.closeUserModal());
        document.getElementById('product-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeProductModal(); });
        document.getElementById('user-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeUserModal(); });
        
        // Image preview
        document.getElementById('product-image')?.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('image-preview');
            if (file && preview) {
                const reader = new FileReader();
                reader.onload = (ev) => { preview.src = ev.target.result; preview.style.display = 'block'; };
                reader.readAsDataURL(file);
            }
        });
        
        // ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { this.closeProductModal(); this.closeUserModal(); }
        });
    }

    // ==================== PRODUCT MODAL ====================
    
    static openAddModal() {
        document.getElementById('modal-title').textContent = '➕ افزودن محصول جدید';
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-active').checked = true;
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('product-modal').classList.add('open');
        this.loadCategories();
    }

    static async openEditModal(productId) {
        const product = (await DB.getProducts()).find(p => p.id === productId);
        if (!product) return UI.showToast('error', 'محصول یافت نشد');

        document.getElementById('modal-title').textContent = '✏️ ویرایش محصول';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-active').checked = product.isActive;
        
        const preview = document.getElementById('image-preview');
        if (product.image) {
            preview.src = product.image;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
        
        await this.loadCategories();
        document.getElementById('product-category').value = product.categoryId;
        document.getElementById('product-modal').classList.add('open');
    }

    static closeProductModal() {
        document.getElementById('product-modal')?.classList.remove('open');
    }

    static async saveProduct() {
        const productId = document.getElementById('product-id').value;
        const data = {
            name: document.getElementById('product-name').value.trim(),
            categoryId: document.getElementById('product-category').value,
            price: parseFloat(document.getElementById('product-price').value),
            description: document.getElementById('product-description').value.trim(),
            isActive: document.getElementById('product-active').checked
        };

        if (!data.name) return UI.showToast('error', 'نام محصول الزامی است');
        if (!data.categoryId) return UI.showToast('error', 'دسته‌بندی را انتخاب کنید');
        if (isNaN(data.price) || data.price < 0) return UI.showToast('error', 'قیمت نامعتبر است');

        // Handle image
        const imageFile = document.getElementById('product-image').files[0];
        if (imageFile) {
            data.image = await this.fileToBase64(imageFile);
        } else if (productId) {
            const existing = (await DB.getProducts()).find(p => p.id === productId);
            if (existing) data.image = existing.image;
        }

        try {
            if (productId) {
                await ProductManager.updateProduct(productId, data);
            } else {
                await ProductManager.addProduct(data);
            }
            this.closeProductModal();
            await this.loadProducts();
        } catch (error) {
            UI.showToast('error', error.message);
        }
    }

    // ==================== PRODUCT ACTIONS ====================
    
    static async toggleProduct(productId) {
        await ProductManager.toggleProductStatus(productId);
        await this.loadProducts();
    }

    static async deleteProduct(productId) {
        const product = (await DB.getProducts()).find(p => p.id === productId);
        if (!product) return;
        
        if (!confirm(`آیا از حذف "${product.name}" اطمینان دارید؟`)) return;
        
        await ProductManager.deleteProduct(productId);
        await this.loadProducts();
    }

    // ==================== CATEGORY ACTIONS ====================
    
    static async addCategoryDialog() {
        const name = prompt('نام دسته‌بندی جدید:');
        if (!name?.trim()) return;
        const icon = prompt('آیکون (مثال: ☕ 🍰):', '📂');
        try {
            await CategoryManager.addCategory(name, icon || '📂');
            await this.loadCategories();
        } catch (error) {
            UI.showToast('error', error.message);
        }
    }

    static async editCategory(categoryId) {
        const category = (await DB.getCategories()).find(c => c.id === categoryId);
        if (!category) return UI.showToast('error', 'دسته‌بندی یافت نشد');
        
        const name = prompt('نام جدید:', category.name);
        if (!name?.trim()) return;
        const icon = prompt('آیکون جدید:', category.icon || '📂');
        
        try {
            await CategoryManager.updateCategory(categoryId, { name: name.trim(), icon: icon || category.icon });
            await this.loadCategories();
        } catch (error) {
            UI.showToast('error', error.message);
        }
    }

    static async deleteCategory(categoryId) {
        try {
            await CategoryManager.deleteCategory(categoryId);
            await this.loadCategories();
        } catch (error) {
            UI.showToast('error', error.message);
        }
    }

    // ==================== USER ACTIONS ====================
    
    static openUserModal(userData = null) {
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = '';
        
        if (userData) {
            document.getElementById('user-modal-title').textContent = '✏️ ویرایش کاربر';
            document.getElementById('user-id').value = userData.id;
            document.getElementById('user-username').value = userData.username;
            document.getElementById('user-password').required = false;
            document.getElementById('user-role').value = userData.role;
        } else {
            document.getElementById('user-modal-title').textContent = '➕ افزودن کاربر جدید';
            document.getElementById('user-password').required = true;
        }
        
        document.getElementById('user-modal').classList.add('open');
    }

    static closeUserModal() {
        document.getElementById('user-modal')?.classList.remove('open');
    }

    static async saveUser() {
        const userId = document.getElementById('user-id').value;
        const username = document.getElementById('user-username').value.trim();
        const password = document.getElementById('user-password').value;
        const role = document.getElementById('user-role').value;

        if (!username) return UI.showToast('error', 'نام کاربری الزامی است');
        if (!userId && (!password || password.length < 4)) return UI.showToast('error', 'رمز عبور حداقل ۴ کاراکتر');

        let users = this.allUsers;
        
        if (userId) {
            const index = users.findIndex(u => u.id === userId);
            if (index > -1) {
                users[index].username = username;
                users[index].role = role;
                if (password) {
                    users[index].passwordHash = await AuthManager._hashPassword(password);
                }
            }
        } else {
            users.push({
                id: 'user-' + Date.now(),
                username,
                passwordHash: await AuthManager._hashPassword(password),
                role,
                isActive: true,
                createdAt: new Date().toISOString()
            });
        }

        DB._localSet('users', users);
        this.allUsers = users;
        UI.showToast('success', '✅ کاربر ذخیره شد');
        this.closeUserModal();
        await this.loadUsers();
    }

    static async editUser(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (user) this.openUserModal(user);
    }

    static async deleteUser(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;
        if (user.role === 'admin' && this.allUsers.filter(u => u.role === 'admin').length <= 1) {
            return UI.showToast('warning', 'حداقل یک مدیر باید وجود داشته باشد');
        }
        if (!confirm(`حذف کاربر "${user.username}"؟`)) return;
        
        this.allUsers = this.allUsers.filter(u => u.id !== userId);
        DB._localSet('users', this.allUsers);
        UI.showToast('success', '🗑️ کاربر حذف شد');
        await this.loadUsers();
    }

    // ==================== UTILITY ====================
    
    static fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}