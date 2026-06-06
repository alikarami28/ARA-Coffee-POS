// products.js - Product, Category & User Management
class ProductManager {
    static async addProduct(productData) {
        if (!productData.name || !productData.name.trim()) {
            throw new Error('نام محصول الزامی است');
        }
        if (!productData.categoryId) {
            throw new Error('دسته‌بندی را انتخاب کنید');
        }
        if (!productData.price || isNaN(productData.price) || productData.price < 0) {
            throw new Error('قیمت نامعتبر است');
        }

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

        await DB.add('products', product);
        return product;
    }

    static async updateProduct(productId, updates) {
        const existing = await DB.getById('products', productId);
        if (!existing) throw new Error('محصول یافت نشد');

        const updated = { ...existing, ...updates, id: productId, updatedAt: new Date().toISOString() };
        await DB.update('products', updated);
        return updated;
    }

    static async deleteProduct(productId) {
        await DB.delete('products', productId);
    }

    static async toggleProductStatus(productId) {
        const product = await DB.getById('products', productId);
        if (!product) throw new Error('محصول یافت نشد');
        
        product.isActive = !product.isActive;
        product.updatedAt = new Date().toISOString();
        await DB.update('products', product);
        return product;
    }
}

class CategoryManager {
    static async addCategory(name, icon = '📂') {
        if (!name || !name.trim()) throw new Error('نام دسته‌بندی الزامی است');
        
        const categories = await DB.getAll('categories');
        const category = {
            id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            name: name.trim(),
            icon: icon,
            isDefault: false,
            displayOrder: categories.length,
            createdAt: new Date().toISOString()
        };

        await DB.add('categories', category);
        return category;
    }

    static async updateCategory(categoryId, updates) {
        const existing = await DB.getById('categories', categoryId);
        if (!existing) throw new Error('دسته‌بندی یافت نشد');
        
        const updated = { ...existing, ...updates, id: categoryId };
        await DB.update('categories', updated);
        return updated;
    }

    static async deleteCategory(categoryId) {
        const category = await DB.getById('categories', categoryId);
        if (!category) throw new Error('دسته‌بندی یافت نشد');
        if (category.isDefault) throw new Error('دسته‌بندی پیش‌فرض قابل حذف نیست');
        
        const products = await DB.getByIndex('products', 'categoryId', categoryId);
        if (products.length > 0) {
            throw new Error(`این دسته‌بندی ${products.length} محصول دارد`);
        }
        
        await DB.delete('categories', categoryId);
    }

    static async getDefaultCategories() {
        return [
            { name: 'Espresso', icon: '☕' },
            { name: 'Hot Coffee', icon: '🫖' },
            { name: 'Iced Coffee', icon: '🧊' },
            { name: 'Tea', icon: '🍵' },
            { name: 'Matcha', icon: '🍃' },
            { name: 'Cold Drinks', icon: '🥤' },
            { name: 'Dessert', icon: '🍰' },
            { name: 'Bakery', icon: '🥐' }
        ];
    }

    static async ensureDefaults() {
        const cats = await DB.getAll('categories');
        if (cats.length === 0) {
            const defaults = this.getDefaultCategories();
            for (let i = 0; i < defaults.length; i++) {
                await DB.add('categories', {
                    id: 'cat-default-' + i,
                    name: defaults[i].name,
                    icon: defaults[i].icon,
                    isDefault: true,
                    displayOrder: i,
                    createdAt: new Date().toISOString()
                });
            }
        }
    }
}

// ==================== Admin Panel Controller ====================
class AdminPanel {
    static allProducts = [];
    static allCategories = [];
    static allUsers = [];

    static async init() {
        console.log('🔧 AdminPanel init...');
        
        // Check auth
        if (!AuthManager.isLoggedIn()) {
            window.location.href = '/login.html';
            return;
        }
        
        UI.displayUserInfo();
        
        await CategoryManager.ensureDefaults();
        await this.loadCategories();
        await this.loadProducts();
        await this.loadUsers();
        this.setupEventListeners();
        
        console.log('✅ AdminPanel ready');
    }

    // ==================== Load Data ====================
    static async loadCategories() {
        this.allCategories = await DB.getAll('categories');
        this.allCategories.sort((a, b) => a.displayOrder - b.displayOrder);
        
        // Update select in product form
        const select = document.getElementById('product-category');
        if (select) {
            select.innerHTML = '<option value="">انتخاب دسته‌بندی...</option>' +
                this.allCategories.map(c => `<option value="${c.id}">${c.icon || ''} ${c.name}</option>`).join('');
        }
        
        // Render categories list
        const container = document.getElementById('categories-list');
        if (!container) return;
        
        container.innerHTML = this.allCategories.map(cat => `
            <div class="category-card-admin">
                <div class="category-info">
                    <span class="category-icon">${cat.icon || '📂'}</span>
                    <div class="category-details">
                        <h3>${cat.name}</h3>
                        ${cat.isDefault ? '<span class="category-badge">پیش‌فرض</span>' : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-action btn-edit" onclick="AdminPanel.editCategory('${cat.id}')">✏️</button>
                    ${!cat.isDefault ? `<button class="btn-action btn-delete" onclick="AdminPanel.deleteCategory('${cat.id}')">🗑️</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    static async loadProducts(searchTerm = '') {
        this.allProducts = await DB.getAll('products');
        
        let filtered = this.allProducts;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = this.allProducts.filter(p => 
                p.name.toLowerCase().includes(term) ||
                (p.description && p.description.toLowerCase().includes(term))
            );
        }
        
        filtered.sort((a, b) => a.displayOrder - b.displayOrder);
        
        const container = document.getElementById('products-list');
        if (!container) return;
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📦</span>
                    <p>${searchTerm ? 'محصولی یافت نشد' : 'هنوز محصولی ثبت نشده'}</p>
                </div>`;
            return;
        }
        
        container.innerHTML = filtered.map(product => {
            const cat = this.allCategories.find(c => c.id === product.categoryId);
            const catName = cat ? `${cat.icon || ''} ${cat.name}` : 'بدون دسته';
            
            return `
                <div class="product-card-admin">
                    <img src="${product.image || '/assets/images/logo-placeholder.png'}" 
                         alt="${product.name}"
                         onerror="this.style.display='none'">
                    <div class="product-info-admin">
                        <h3>${product.name}</h3>
                        <div class="product-price">💰 ${UI.formatCurrency(product.price)}</div>
                        <div class="product-category">📂 ${catName}</div>
                        <span class="product-status ${product.isActive ? 'active' : 'inactive'}">
                            ${product.isActive ? '✅ فعال' : '❌ غیرفعال'}
                        </span>
                        <div class="product-actions">
                            <button class="btn-action btn-edit" onclick="AdminPanel.openEditModal('${product.id}')">✏️ ویرایش</button>
                            <button class="btn-action btn-toggle" onclick="AdminPanel.toggleProduct('${product.id}')">
                                ${product.isActive ? '🚫 غیرفعال' : '✅ فعال'}
                            </button>
                            <button class="btn-action btn-delete" onclick="AdminPanel.deleteProduct('${product.id}')">🗑️ حذف</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    static async loadUsers() {
        this.allUsers = await DB.getAll('users');
        
        const container = document.getElementById('users-list');
        if (!container) return;
        
        if (this.allUsers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">👤</span>
                    <p>هیچ کاربری یافت نشد</p>
                </div>`;
            return;
        }
        
        container.innerHTML = this.allUsers.map(user => `
            <div class="user-card-admin">
                <div class="user-info">
                    <div class="user-avatar-large">${user.username.charAt(0).toUpperCase()}</div>
                    <div class="user-details">
                        <h3>${user.username}</h3>
                        <span class="user-role-badge ${user.role}">${user.role === 'admin' ? '👑 مدیر' : '💼 صندوق‌دار'}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-action btn-edit" onclick="AdminPanel.editUser('${user.id}')">✏️</button>
                    ${user.role !== 'admin' ? `<button class="btn-action btn-delete" onclick="AdminPanel.deleteUser('${user.id}')">🗑️</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    // ==================== Event Listeners ====================
    static setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                const tabContent = document.getElementById('tab-' + this.dataset.tab);
                if (tabContent) tabContent.classList.add('active');
            });
        });

        // Add product button
        document.getElementById('add-product-btn')?.addEventListener('click', () => this.openAddModal());

        // Add category button
        document.getElementById('add-category-btn')?.addEventListener('click', () => this.addCategoryDialog());

        // Add user button
        document.getElementById('add-user-btn')?.addEventListener('click', () => this.openUserModal());

        // Product search
        document.getElementById('product-search')?.addEventListener('input', (e) => this.loadProducts(e.target.value));

        // Product form submit
        document.getElementById('product-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProduct();
        });

        // User form submit
        document.getElementById('user-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveUser();
        });

        // Modal close buttons
        document.getElementById('modal-close')?.addEventListener('click', () => this.closeProductModal());
        document.getElementById('user-modal-close')?.addEventListener('click', () => this.closeUserModal());

        // Close modals on overlay click
        document.getElementById('product-modal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeProductModal();
        });
        document.getElementById('user-modal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeUserModal();
        });

        // Image preview
        document.getElementById('product-image')?.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('image-preview');
            if (file && preview) {
                const reader = new FileReader();
                reader.onload = (ev) => { preview.src = ev.target.result; preview.style.display = 'block'; };
                reader.readAsDataURL(file);
            } else if (preview) {
                preview.style.display = 'none';
            }
        });

        // ESC to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeProductModal();
                this.closeUserModal();
            }
        });
    }

    // ==================== Product Modal ====================
    static openAddModal() {
        document.getElementById('modal-title').textContent = '➕ افزودن محصول جدید';
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-active').checked = true;
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('product-modal').classList.add('open');
        this.loadCategories(); // Refresh categories in select
    }

    static async openEditModal(productId) {
        const product = await DB.getById('products', productId);
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
        document.getElementById('product-modal').classList.remove('open');
    }

    static async saveProduct() {
        const productId = document.getElementById('product-id').value;
        const name = document.getElementById('product-name').value.trim();
        const categoryId = document.getElementById('product-category').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const description = document.getElementById('product-description').value.trim();
        const isActive = document.getElementById('product-active').checked;

        if (!name) return UI.showToast('error', 'نام محصول الزامی است');
        if (!categoryId) return UI.showToast('error', 'دسته‌بندی را انتخاب کنید');
        if (isNaN(price) || price < 0) return UI.showToast('error', 'قیمت نامعتبر است');

        try {
            const data = { name, categoryId, price, description, isActive };
            
            const imageFile = document.getElementById('product-image').files[0];
            if (imageFile) {
                data.image = await this.fileToBase64(imageFile);
            } else if (productId) {
                const existing = await DB.getById('products', productId);
                if (existing) data.image = existing.image;
            }

            if (productId) {
                await ProductManager.updateProduct(productId, data);
                UI.showToast('success', '✅ محصول بروزرسانی شد');
            } else {
                await ProductManager.addProduct(data);
                UI.showToast('success', '✅ محصول جدید اضافه شد');
            }

            this.closeProductModal();
            await this.loadProducts();
        } catch (error) {
            UI.showToast('error', '❌ ' + error.message);
        }
    }

    // ==================== Product Actions ====================
    static async toggleProduct(productId) {
        try {
            const product = await ProductManager.toggleProductStatus(productId);
            UI.showToast('info', `محصول "${product.name}" ${product.isActive ? 'فعال' : 'غیرفعال'} شد`);
            await this.loadProducts();
        } catch (error) {
            UI.showToast('error', error.message);
        }
    }

    static async deleteProduct(productId) {
        const product = await DB.getById('products', productId);
        if (!product) return UI.showToast('error', 'محصول یافت نشد');
        
        if (!confirm(`آیا از حذف "${product.name}" اطمینان دارید؟`)) return;
        
        try {
            await ProductManager.deleteProduct(productId);
            UI.showToast('success', '🗑️ محصول حذف شد');
            await this.loadProducts();
        } catch (error) {
            UI.showToast('error', error.message);
        }
    }

    // ==================== Category Actions ====================
    static async addCategoryDialog() {
        const name = prompt('نام دسته‌بندی جدید:');
        if (!name || !name.trim()) return;
        
        const icon = prompt('آیکون (مثال: ☕ 🍰):', '📂');
        
        try {
            await CategoryManager.addCategory(name, icon || '📂');
            UI.showToast('success', '✅ دسته‌بندی اضافه شد');
            await this.loadCategories();
        } catch (error) {
            UI.showToast('error', error.message);
        }
    }

    static async editCategory(categoryId) {
        const category = await DB.getById('categories', categoryId);
        if (!category) return UI.showToast('error', 'دسته‌بندی یافت نشد');
        
        const name = prompt('نام جدید:', category.name);
        if (!name || !name.trim()) return;
        
        const icon = prompt('آیکون جدید:', category.icon || '📂');
        
        try {
            await CategoryManager.updateCategory(categoryId, { name: name.trim(), icon: icon || category.icon });
            UI.showToast('success', '✅ دسته‌بندی بروزرسانی شد');
            await this.loadCategories();
        } catch (error) {
            UI.showToast('error', error.message);
        }
    }

    static async deleteCategory(categoryId) {
        try {
            await CategoryManager.deleteCategory(categoryId);
            UI.showToast('success', '🗑️ دسته‌بندی حذف شد');
            await this.loadCategories();
        } catch (error) {
            UI.showToast('error', error.message);
        }
    }

    // ==================== User Modal ====================
    static openUserModal(userData = null) {
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = '';
        
        if (userData) {
            document.getElementById('user-modal-title').textContent = '✏️ ویرایش کاربر';
            document.getElementById('user-id').value = userData.id;
            document.getElementById('user-username').value = userData.username;
            document.getElementById('user-password').value = '';
            document.getElementById('user-password').placeholder = 'رمز جدید (خالی = بدون تغییر)';
            document.getElementById('user-password').required = false;
            document.getElementById('user-role').value = userData.role;
        } else {
            document.getElementById('user-modal-title').textContent = '➕ افزودن کاربر جدید';
            document.getElementById('user-password').placeholder = 'حداقل ۴ کاراکتر';
            document.getElementById('user-password').required = true;
        }
        
        document.getElementById('user-modal').classList.add('open');
    }

    static closeUserModal() {
        document.getElementById('user-modal').classList.remove('open');
    }

    static async saveUser() {
        const userId = document.getElementById('user-id').value;
        const username = document.getElementById('user-username').value.trim();
        const password = document.getElementById('user-password').value;
        const role = document.getElementById('user-role').value;

        if (!username) return UI.showToast('error', 'نام کاربری الزامی است');
        if (!userId && (!password || password.length < 4)) return UI.showToast('error', 'رمز عبور حداقل ۴ کاراکتر');

        try {
            if (userId) {
                if (password) {
                    const hashedPassword = await AuthManager._hashPassword(password);
                    await DB.update('users', { id: userId, username, passwordHash: hashedPassword, role });
                } else {
                    const existing = await DB.getById('users', userId);
                    await DB.update('users', { ...existing, username, role });
                }
                UI.showToast('success', '✅ کاربر بروزرسانی شد');
            } else {
                await AuthManager.createUser(username, password, role);
                UI.showToast('success', '✅ کاربر جدید اضافه شد');
            }
            
            this.closeUserModal();
            await this.loadUsers();
        } catch (error) {
            UI.showToast('error', '❌ ' + error.message);
        }
    }

    static async editUser(userId) {
        const user = await DB.getById('users', userId);
        if (!user) return UI.showToast('error', 'کاربر یافت نشد');
        this.openUserModal(user);
    }

    static async deleteUser(userId) {
        const user = await DB.getById('users', userId);
        if (!user) return UI.showToast('error', 'کاربر یافت نشد');
        
        if (user.role === 'admin') {
            const admins = this.allUsers.filter(u => u.role === 'admin' && u.id !== userId);
            if (admins.length === 0) return UI.showToast('warning', 'حداقل یک مدیر باید وجود داشته باشد');
        }
        
        if (!confirm(`آیا از حذف کاربر "${user.username}" اطمینان دارید؟`)) return;
        
        try {
            await DB.delete('users', userId);
            UI.showToast('success', '🗑️ کاربر حذف شد');
            await this.loadUsers();
        } catch (error) {
            UI.showToast('error', error.message);
        }
    }

    // ==================== Utility ====================
    static fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}