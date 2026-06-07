// products.js - Product & Category Management (GitHub Version)
// Version: 2.0 - Complete

// ==================== PRODUCT MANAGER ====================
class ProductManager {
    static async addProduct(productData) {
        // اعتبارسنجی
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

        const result = await DB.addProduct(product);
        
        // نتیجه ذخیره‌سازی رو چک کن
        if (result && result.result && result.result.success) {
            UI.showToast('success', '✅ محصول در GitHub ذخیره شد');
        } else if (result && result.result && !result.result.success) {
            UI.showToast('warning', '⚠️ ' + (result.result.message || 'فقط در مرورگر ذخیره شد'));
        } else {
            UI.showToast('success', '✅ محصول اضافه شد');
        }
        
        return product;
    }

    static async updateProduct(productId, updates) {
        const result = await DB.updateProduct(productId, updates);
        
        if (result) {
            if (result.result && result.result.success) {
                UI.showToast('success', '✅ محصول در GitHub بروزرسانی شد');
            } else if (result.result && !result.result.success) {
                UI.showToast('warning', '⚠️ ' + (result.result.message || 'فقط در مرورگر ذخیره شد'));
            } else {
                UI.showToast('success', '✅ محصول بروزرسانی شد');
            }
            return result.product || result;
        } else {
            UI.showToast('error', '❌ محصول یافت نشد');
            return null;
        }
    }

    static async deleteProduct(productId) {
        const result = await DB.deleteProduct(productId);
        
        if (result && result.result && result.result.success) {
            UI.showToast('success', '🗑️ محصول از GitHub حذف شد');
        } else {
            UI.showToast('success', '🗑️ محصول حذف شد');
        }
        
        return true;
    }

    static async toggleProductStatus(productId) {
        const result = await DB.toggleProductStatus(productId);
        
        if (result && result.product) {
            const status = result.product.isActive ? 'فعال' : 'غیرفعال';
            UI.showToast('info', `محصول "${result.product.name}" ${status} شد`);
            return result.product;
        }
        
        return null;
    }
}

// ==================== CATEGORY MANAGER ====================
class CategoryManager {
    static async addCategory(name, icon = '📂') {
        if (!name || !name.trim()) {
            throw new Error('نام دسته‌بندی الزامی است');
        }

        const categories = await DB.getCategories();
        const category = {
            id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            name: name.trim(),
            icon: icon,
            isDefault: false,
            displayOrder: categories.length,
            createdAt: new Date().toISOString()
        };

        const result = await DB.addCategory(category);
        
        if (result && result.success) {
            UI.showToast('success', '✅ دسته‌بندی در GitHub اضافه شد');
        } else {
            UI.showToast('success', '✅ دسته‌بندی اضافه شد');
        }
        
        return category;
    }

    static async updateCategory(categoryId, updates) {
        const result = await DB.updateCategory(categoryId, updates);
        
        if (result && result.success) {
            UI.showToast('success', '✅ دسته‌بندی در GitHub بروزرسانی شد');
        } else {
            UI.showToast('success', '✅ دسته‌بندی بروزرسانی شد');
        }
    }

    static async deleteCategory(categoryId) {
        // چک کن دسته‌بندی پیش‌فرض نباشه
        const categories = await DB.getCategories();
        const category = categories.find(c => c.id === categoryId);
        
        if (!category) {
            throw new Error('دسته‌بندی یافت نشد');
        }
        
        if (category.isDefault) {
            throw new Error('دسته‌بندی‌های پیش‌فرض قابل حذف نیستند');
        }

        // چک کن محصولی توش نباشه
        const products = await DB.getProducts();
        const productsInCategory = products.filter(p => p.categoryId === categoryId);
        
        if (productsInCategory.length > 0) {
            throw new Error(`این دسته‌بندی ${productsInCategory.length} محصول دارد و قابل حذف نیست`);
        }

        const result = await DB.deleteCategory(categoryId);
        
        if (result && result.success) {
            UI.showToast('success', '🗑️ دسته‌بندی از GitHub حذف شد');
        } else {
            UI.showToast('success', '🗑️ دسته‌بندی حذف شد');
        }
        
        return true;
    }

    static async getDefaultCategories() {
        return [
            { name: 'اسپرسو', icon: '☕' },
            { name: 'قهوه گرم', icon: '🫖' },
            { name: 'قهوه سرد', icon: '🧊' },
            { name: 'چای', icon: '🍵' },
            { name: 'مچا', icon: '🍃' },
            { name: 'نوشیدنی سرد', icon: '🥤' },
            { name: 'دسر', icon: '🍰' },
            { name: 'شیرینی', icon: '🥐' }
        ];
    }

    static async ensureDefaults() {
        const categories = await DB.getCategories();
        
        if (categories.length === 0) {
            console.log('📂 Creating default categories...');
            const defaults = await this.getDefaultCategories();
            
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

// ==================== ADMIN PANEL ====================
class AdminPanel {
    static allProducts = [];
    static allCategories = [];
    static allUsers = [];

    static async init() {
        console.log('🔧 AdminPanel initializing...');

        // Check auth
        if (typeof AuthManager !== 'undefined' && !AuthManager.isLoggedIn()) {
            window.location.href = '/login.html';
            return;
        }

        // Display user info
        if (typeof UI !== 'undefined') {
            UI.displayUserInfo();
        }

        // Ensure default categories exist
        await CategoryManager.ensureDefaults();

        // Load all data
        await this.loadAll();

        // Setup event listeners
        this.setupEventListeners();

        console.log('✅ AdminPanel ready');
    }

    // ==================== LOAD DATA ====================
    
    static async loadAll() {
        await Promise.all([
            this.loadCategories(),
            this.loadProducts(),
            this.loadUsers()
        ]);
    }

    static async loadCategories() {
        try {
            this.allCategories = await DB.getCategories();
            this.allCategories.sort((a, b) => a.displayOrder - b.displayOrder);
        } catch (e) {
            console.error('Error loading categories:', e);
            this.allCategories = [];
        }

        // Update select in product form
        const select = document.getElementById('product-category');
        if (select) {
            select.innerHTML = '<option value="">انتخاب دسته‌بندی...</option>' +
                this.allCategories.map(c => 
                    `<option value="${c.id}">${c.icon || '📂'} ${c.name}</option>`
                ).join('');
        }

        // Render categories list
        const container = document.getElementById('categories-list');
        if (container) {
            if (this.allCategories.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">📂</span>
                        <p>هیچ دسته‌بندی یافت نشد</p>
                    </div>`;
                return;
            }

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

    static async loadProducts(searchTerm = '') {
        try {
            this.allProducts = await DB.getProducts();
        } catch (e) {
            console.error('Error loading products:', e);
            this.allProducts = [];
        }

        // Apply search filter
        let filtered = [...this.allProducts];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(term) ||
                (p.description && p.description.toLowerCase().includes(term))
            );
        }

        // Sort by display order
        filtered.sort((a, b) => a.displayOrder - b.displayOrder);

        // Render
        const container = document.getElementById('products-list');
        if (!container) return;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📦</span>
                    <p>${searchTerm ? 'محصولی با این مشخصات یافت نشد' : 'هنوز هیچ محصولی ثبت نشده'}</p>
                    ${!searchTerm ? '<p style="font-size:0.9rem;color:var(--text-light);">روی "افزودن محصول جدید" کلیک کنید</p>' : ''}
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(product => {
            const category = this.allCategories.find(c => c.id === product.categoryId);
            const categoryName = category ? `${category.icon || ''} ${category.name}` : 'بدون دسته';

            return `
                <div class="product-card-admin">
                    <img src="${product.image || '/assets/images/logo-placeholder.png'}" 
                         alt="${product.name}"
                         onerror="this.style.display='none'">
                    <div class="product-info-admin">
                        <h3>${product.name}</h3>
                        <div class="product-price">💰 ${UI.formatCurrency(product.price)}</div>
                        <div class="product-category">📂 ${categoryName}</div>
                        <span class="product-status ${product.isActive ? 'active' : 'inactive'}">
                            ${product.isActive ? '✅ فعال' : '❌ غیرفعال'}
                        </span>
                        <div class="product-actions">
                            <button class="btn-action btn-edit" onclick="AdminPanel.openEditModal('${product.id}')">
                                ✏️ ویرایش
                            </button>
                            <button class="btn-action btn-toggle" onclick="AdminPanel.toggleProduct('${product.id}')">
                                ${product.isActive ? '🚫 غیرفعال' : '✅ فعال'}
                            </button>
                            <button class="btn-action btn-delete" onclick="AdminPanel.deleteProduct('${product.id}')">
                                🗑️ حذف
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    static async loadUsers() {
        try {
            this.allUsers = JSON.parse(localStorage.getItem('ara_users') || '[]');
        } catch (e) {
            this.allUsers = [];
        }

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
                        <span class="user-role-badge ${user.role}">
                            ${user.role === 'admin' ? '👑 مدیر' : '💼 صندوق‌دار'}
                        </span>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-action btn-edit" onclick="AdminPanel.editUser('${user.id}')">✏️</button>
                    ${user.role !== 'admin' ? `<button class="btn-action btn-delete" onclick="AdminPanel.deleteUser('${user.id}')">🗑️</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    // ==================== EVENT LISTENERS ====================
    
    static setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                const tabId = 'tab-' + this.dataset.tab;
                const tabContent = document.getElementById(tabId);
                if (tabContent) tabContent.classList.add('active');
            });
        });

        // Add product button
        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.openAddModal());
        }

        // Add category button
        const addCategoryBtn = document.getElementById('add-category-btn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.addCategoryDialog());
        }

        // Add user button
        const addUserBtn = document.getElementById('add-user-btn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.openUserModal());
        }

        // Product search
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.loadProducts(e.target.value));
        }

        // Product form submit
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveProduct();
            });
        }

        // User form submit
        const userForm = document.getElementById('user-form');
        if (userForm) {
            userForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveUser();
            });
        }

        // Modal close buttons
        const modalClose = document.getElementById('modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeProductModal());
        }

        const userModalClose = document.getElementById('user-modal-close');
        if (userModalClose) {
            userModalClose.addEventListener('click', () => this.closeUserModal());
        }

        // Close modals on overlay click
        const productModal = document.getElementById('product-modal');
        if (productModal) {
            productModal.addEventListener('click', function(e) {
                if (e.target === this) AdminPanel.closeProductModal();
            });
        }

        const userModal = document.getElementById('user-modal');
        if (userModal) {
            userModal.addEventListener('click', function(e) {
                if (e.target === this) AdminPanel.closeUserModal();
            });
        }

        // Image preview
        const imageInput = document.getElementById('product-image');
        if (imageInput) {
            imageInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                const preview = document.getElementById('image-preview');
                if (file && preview) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        preview.src = ev.target.result;
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                } else if (preview) {
                    preview.style.display = 'none';
                }
            });
        }

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeProductModal();
                this.closeUserModal();
            }
        });
    }

    // ==================== PRODUCT MODAL ====================
    
    static openAddModal() {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('product-form');
        
        if (!modal || !title || !form) return;

        title.textContent = '➕ افزودن محصول جدید';
        form.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-active').checked = true;
        
        const preview = document.getElementById('image-preview');
        if (preview) preview.style.display = 'none';
        
        modal.classList.add('open');
        
        // Refresh categories in select
        this.loadCategories();
    }

    static async openEditModal(productId) {
        try {
            const product = await DB.getById('products', productId);
            
            if (!product) {
                UI.showToast('error', 'محصول یافت نشد');
                return;
            }

            const modal = document.getElementById('product-modal');
            const title = document.getElementById('modal-title');
            
            if (!modal || !title) return;

            title.textContent = '✏️ ویرایش محصول';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-price').value = product.price || 0;
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-active').checked = product.isActive !== false;

            // Show existing image
            const preview = document.getElementById('image-preview');
            if (preview && product.image) {
                preview.src = product.image;
                preview.style.display = 'block';
            } else if (preview) {
                preview.style.display = 'none';
            }

            // Refresh and set category
            await this.loadCategories();
            document.getElementById('product-category').value = product.categoryId || '';

            modal.classList.add('open');
            
        } catch (error) {
            console.error('Error opening edit modal:', error);
            UI.showToast('error', 'خطا در بارگذاری محصول');
        }
    }

    static closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) modal.classList.remove('open');
    }

    static async saveProduct() {
        const productId = document.getElementById('product-id').value;
        const name = document.getElementById('product-name').value.trim();
        const categoryId = document.getElementById('product-category').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const description = document.getElementById('product-description').value.trim();
        const isActive = document.getElementById('product-active').checked;

        // Validation
        if (!name) {
            UI.showToast('error', '❌ نام محصول الزامی است');
            return;
        }
        if (!categoryId) {
            UI.showToast('error', '❌ دسته‌بندی را انتخاب کنید');
            return;
        }
        if (isNaN(price) || price < 0) {
            UI.showToast('error', '❌ قیمت نامعتبر است');
            return;
        }

        const productData = {
            name: name,
            categoryId: categoryId,
            price: price,
            description: description,
            isActive: isActive
        };

        try {
            // Handle image
            const imageFile = document.getElementById('product-image').files[0];
            if (imageFile) {
                productData.image = await this.fileToBase64(imageFile);
            } else if (productId) {
                // Keep existing image when editing
                const existing = await DB.getById('products', productId);
                if (existing && existing.image) {
                    productData.image = existing.image;
                }
            }

            let result;
            if (productId) {
                // Update existing product
                result = await ProductManager.updateProduct(productId, productData);
            } else {
                // Add new product
                result = await ProductManager.addProduct(productData);
            }

            // Close modal and reload
            this.closeProductModal();
            await this.loadProducts();

            // Keep search term if any
            const searchInput = document.getElementById('product-search');
            if (searchInput && searchInput.value) {
                await this.loadProducts(searchInput.value);
            }

        } catch (error) {
            console.error('Error saving product:', error);
            UI.showToast('error', '❌ خطا: ' + error.message);
        }
    }

    // ==================== PRODUCT ACTIONS ====================
    
    static async toggleProduct(productId) {
        try {
            await ProductManager.toggleProductStatus(productId);
            await this.loadProducts();
            
            // Keep search term
            const searchInput = document.getElementById('product-search');
            if (searchInput && searchInput.value) {
                await this.loadProducts(searchInput.value);
            }
        } catch (error) {
            console.error('Error toggling product:', error);
            UI.showToast('error', 'خطا: ' + error.message);
        }
    }

    static async deleteProduct(productId) {
        try {
            const product = await DB.getById('products', productId);
            if (!product) {
                UI.showToast('error', 'محصول یافت نشد');
                return;
            }

            if (!confirm(`آیا از حذف "${product.name}" اطمینان دارید؟\nاین عملیات قابل بازگشت نیست!`)) {
                return;
            }

            await ProductManager.deleteProduct(productId);
            await this.loadProducts();
            
        } catch (error) {
            console.error('Error deleting product:', error);
            UI.showToast('error', 'خطا: ' + error.message);
        }
    }

    // ==================== CATEGORY ACTIONS ====================
    
    static async addCategoryDialog() {
        const name = prompt('📂 نام دسته‌بندی جدید:');
        if (!name || !name.trim()) return;

        const icon = prompt('🎨 آیکون (مثال: ☕ 🍰 🥤):', '📂');

        try {
            await CategoryManager.addCategory(name.trim(), icon || '📂');
            await this.loadCategories();
        } catch (error) {
            UI.showToast('error', error.message);
        }
    }

    static async editCategory(categoryId) {
        try {
            const category = await DB.getById('categories', categoryId);
            if (!category) {
                UI.showToast('error', 'دسته‌بندی یافت نشد');
                return;
            }

            const newName = prompt('📝 نام جدید:', category.name);
            if (!newName || !newName.trim()) return;

            const newIcon = prompt('🎨 آیکون جدید:', category.icon || '📂');

            await CategoryManager.updateCategory(categoryId, {
                name: newName.trim(),
                icon: newIcon || category.icon
            });

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

    // ==================== USER MODAL ====================
    
    static openUserModal(userData = null) {
        const modal = document.getElementById('user-modal');
        const form = document.getElementById('user-form');
        const title = document.getElementById('user-modal-title');
        
        if (!modal || !form || !title) return;

        form.reset();
        document.getElementById('user-id').value = '';

        if (userData) {
            title.textContent = '✏️ ویرایش کاربر';
            document.getElementById('user-id').value = userData.id;
            document.getElementById('user-username').value = userData.username;
            document.getElementById('user-password').value = '';
            document.getElementById('user-password').placeholder = 'رمز جدید (خالی = بدون تغییر)';
            document.getElementById('user-password').required = false;
            document.getElementById('user-role').value = userData.role;
        } else {
            title.textContent = '➕ افزودن کاربر جدید';
            document.getElementById('user-password').placeholder = 'حداقل ۴ کاراکتر';
            document.getElementById('user-password').required = true;
        }

        modal.classList.add('open');
    }

    static closeUserModal() {
        const modal = document.getElementById('user-modal');
        if (modal) modal.classList.remove('open');
    }

    static async saveUser() {
        const userId = document.getElementById('user-id').value;
        const username = document.getElementById('user-username').value.trim();
        const password = document.getElementById('user-password').value;
        const role = document.getElementById('user-role').value;

        if (!username) {
            UI.showToast('error', '❌ نام کاربری الزامی است');
            return;
        }

        if (!userId && (!password || password.length < 4)) {
            UI.showToast('error', '❌ رمز عبور حداقل ۴ کاراکتر');
            return;
        }

        try {
            let users = JSON.parse(localStorage.getItem('ara_users') || '[]');

            if (userId) {
                // Edit existing user
                const index = users.findIndex(u => u.id === userId);
                if (index > -1) {
                    users[index].username = username;
                    users[index].role = role;
                    if (password) {
                        users[index].passwordHash = await this.hashPassword(password);
                    }
                }
                UI.showToast('success', '✅ کاربر بروزرسانی شد');
            } else {
                // Add new user
                const hashedPassword = await this.hashPassword(password);
                users.push({
                    id: 'user-' + Date.now(),
                    username: username,
                    passwordHash: hashedPassword,
                    role: role,
                    isActive: true,
                    createdAt: new Date().toISOString()
                });
                UI.showToast('success', '✅ کاربر جدید اضافه شد');
            }

            localStorage.setItem('ara_users', JSON.stringify(users));
            this.allUsers = users;
            
            this.closeUserModal();
            await this.loadUsers();
            
        } catch (error) {
            console.error('Error saving user:', error);
            UI.showToast('error', '❌ خطا: ' + error.message);
        }
    }

    static async editUser(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (user) {
            this.openUserModal(user);
        }
    }

    static async deleteUser(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        // Prevent deleting last admin
        if (user.role === 'admin') {
            const adminCount = this.allUsers.filter(u => u.role === 'admin').length;
            if (adminCount <= 1) {
                UI.showToast('warning', '⚠️ حداقل یک مدیر باید وجود داشته باشد');
                return;
            }
        }

        if (!confirm(`آیا از حذف کاربر "${user.username}" اطمینان دارید؟`)) return;

        this.allUsers = this.allUsers.filter(u => u.id !== userId);
        localStorage.setItem('ara_users', JSON.stringify(this.allUsers));
        
        UI.showToast('success', '🗑️ کاربر حذف شد');
        await this.loadUsers();
    }

    // ==================== UTILITY ====================
    
    static fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    static async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}