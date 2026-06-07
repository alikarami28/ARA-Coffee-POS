// products.js - Product & Category Management (Complete)
// Version: 4.0 - With Image Upload to GitHub + Drag & Drop + Delete Category

// ==================== PRODUCT MANAGER ====================
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

        const products = await DB.getProducts();
        
        const product = {
            id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            name: productData.name.trim(),
            categoryId: productData.categoryId,
            price: parseFloat(productData.price),
            description: productData.description || '',
            image: productData.image || '',
            isActive: productData.isActive !== false,
            displayOrder: products.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await DB.addProduct(product);
        
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
        await DB.deleteProduct(productId);
        UI.showToast('success', '🗑️ محصول حذف شد');
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

    // ==================== ترتیب‌بندی ====================
    static async updateProductsOrder(products) {
        const allProducts = await DB.getProducts();
        
        products.forEach(({ id, displayOrder }) => {
            const product = allProducts.find(p => p.id === id);
            if (product) {
                product.displayOrder = displayOrder;
                product.updatedAt = new Date().toISOString();
            }
        });
        
        const result = await DB.saveProducts(allProducts);
        
        if (result && result.success) {
            UI.showToast('success', '✅ ترتیب محصولات ذخیره شد');
        }
        
        return allProducts;
    }

    static async moveProductUp(productId) {
        const products = await DB.getProducts();
        products.sort((a, b) => a.displayOrder - b.displayOrder);
        
        const index = products.findIndex(p => p.id === productId);
        if (index > 0) {
            const temp = products[index].displayOrder;
            products[index].displayOrder = products[index - 1].displayOrder;
            products[index - 1].displayOrder = temp;
            await DB.saveProducts(products);
            return products;
        }
        return products;
    }

    static async moveProductDown(productId) {
        const products = await DB.getProducts();
        products.sort((a, b) => a.displayOrder - b.displayOrder);
        
        const index = products.findIndex(p => p.id === productId);
        if (index < products.length - 1) {
            const temp = products[index].displayOrder;
            products[index].displayOrder = products[index + 1].displayOrder;
            products[index + 1].displayOrder = temp;
            await DB.saveProducts(products);
            return products;
        }
        return products;
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
            UI.showToast('success', '✅ دسته‌بندی بروزرسانی شد');
        }
    }

    static async deleteCategory(categoryId) {
        const categories = await DB.getCategories();
        const category = categories.find(c => c.id === categoryId);
        
        if (!category) {
            throw new Error('دسته‌بندی یافت نشد');
        }
        
        if (category.isDefault) {
            throw new Error('❌ دسته‌بندی‌های پیش‌فرض قابل حذف نیستند');
        }

        const products = await DB.getProducts();
        const productsInCategory = products.filter(p => p.categoryId === categoryId);
        
        if (productsInCategory.length > 0) {
            const productNames = productsInCategory.map(p => p.name).join('، ');
            throw new Error(
                `❌ این دسته‌بندی ${productsInCategory.length} محصول دارد:\n\n` +
                `${productNames}\n\n` +
                `ابتدا محصولات را حذف یا به دسته دیگر منتقل کنید.`
            );
        }

        const result = await DB.deleteCategory(categoryId);
        
        if (result && result.success) {
            UI.showToast('success', '🗑️ دسته‌بندی حذف شد');
        }
        
        return true;
    }

    // ==================== ۳ دسته‌بندی پیش‌فرض ====================
    static async getDefaultCategories() {
        return [
            { name: 'نوشیدنی گرم', icon: '☕' },
            { name: 'نوشیدنی سرد', icon: '🧊' },
            { name: 'چای و دمنوش', icon: '🍵' }
        ];
    }

    static async ensureDefaults() {
        const categories = await DB.getCategories();
        
        if (categories.length === 0) {
            console.log('📂 Creating 3 default categories...');
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
            console.log('✅ Default categories created: ☕ نوشیدنی گرم | 🧊 نوشیدنی سرد | 🍵 چای و دمنوش');
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

        if (typeof AuthManager !== 'undefined' && !AuthManager.isLoggedIn()) {
            window.location.href = '/login.html';
            return;
        }

        if (typeof UI !== 'undefined') {
            UI.displayUserInfo();
        }

        await CategoryManager.ensureDefaults();
        await this.loadAll();
        this.setupEventListeners();
        this.setupDragAndDrop();

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

        const select = document.getElementById('product-category');
        if (select) {
            select.innerHTML = '<option value="">انتخاب دسته‌بندی...</option>' +
                this.allCategories.map(c => 
                    `<option value="${c.id}">${c.icon || '📂'} ${c.name}</option>`
                ).join('');
        }

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
                            ${cat.isDefault ? 
                                '<span class="category-badge">🔒 پیش‌فرض</span>' : 
                                '<span class="category-badge" style="background:rgba(76,175,80,0.1);color:#4CAF50;">✅ سفارشی</span>'
                            }
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn-action btn-edit" onclick="AdminPanel.editCategory('${cat.id}')" title="ویرایش">✏️</button>
                        ${!cat.isDefault ? 
                            `<button class="btn-action btn-delete" onclick="AdminPanel.deleteCategory('${cat.id}')" title="حذف">🗑️</button>` : 
                            ''
                        }
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

        let filtered = [...this.allProducts];
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
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
                    <p>${searchTerm ? 'محصولی با این مشخصات یافت نشد' : 'هنوز هیچ محصولی ثبت نشده'}</p>
                    ${!searchTerm ? '<p style="font-size:0.9rem;color:var(--text-light);">روی "افزودن محصول جدید" کلیک کنید</p>' : ''}
                </div>`;
            return;
        }

        container.innerHTML = filtered.map((product, index) => {
            const category = this.allCategories.find(c => c.id === product.categoryId);
            const categoryName = category ? `${category.icon || ''} ${category.name}` : 'بدون دسته';
            const isFirst = index === 0;
            const isLast = index === filtered.length - 1;

            return `
                <div class="product-card-admin" 
                     draggable="true" 
                     data-product-id="${product.id}"
                     data-display-order="${product.displayOrder}">
                    <div class="drag-handle" title="بکشید برای جابجایی">
                        <span style="font-size:1.2rem;">⋮⋮</span>
                    </div>
                    <img src="${product.image || '/assets/images/logo-placeholder.png'}" 
                         alt="${product.name}"
                         onerror="this.src='/assets/images/logo-placeholder.png'"
                         style="width:90px;height:90px;border-radius:8px;object-fit:cover;background:var(--bg-secondary);flex-shrink:0;">
                    <div class="product-info-admin">
                        <h3>${product.name}</h3>
                        <div class="product-price">💰 ${UI.formatCurrency(product.price)}</div>
                        <div class="product-category">📂 ${categoryName}</div>
                        <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
                            <span class="product-status ${product.isActive ? 'active' : 'inactive'}">
                                ${product.isActive ? '✅ فعال' : '❌ غیرفعال'}
                            </span>
                            <span style="font-size:0.7rem;color:var(--text-light);">
                                📍 اولویت: ${product.displayOrder}
                            </span>
                        </div>
                        <div class="product-actions">
                            <button class="btn-action btn-order" onclick="AdminPanel.moveProductUp('${product.id}')" ${isFirst ? 'disabled' : ''} title="اولویت بیشتر (بالاتر)">⬆️</button>
                            <button class="btn-action btn-order" onclick="AdminPanel.moveProductDown('${product.id}')" ${isLast ? 'disabled' : ''} title="اولویت کمتر (پایین‌تر)">⬇️</button>
                            <button class="btn-action btn-edit" onclick="AdminPanel.openEditModal('${product.id}')" title="ویرایش">✏️</button>
                            <button class="btn-action btn-toggle" onclick="AdminPanel.toggleProduct('${product.id}')" title="${product.isActive ? 'غیرفعال کردن' : 'فعال کردن'}">
                                ${product.isActive ? '🚫' : '✅'}
                            </button>
                            <button class="btn-action btn-delete" onclick="AdminPanel.deleteProduct('${product.id}')" title="حذف">🗑️</button>
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
                    ${user.role !== 'admin' ? 
                        `<button class="btn-action btn-delete" onclick="AdminPanel.deleteUser('${user.id}')">🗑️</button>` : 
                        ''
                    }
                </div>
            </div>
        `).join('');
    }

    // ==================== DRAG & DROP ====================
    static setupDragAndDrop() {
        const container = document.getElementById('products-list');
        if (!container) return;

        let draggedItem = null;

        container.addEventListener('dragstart', (e) => {
            const card = e.target.closest('.product-card-admin');
            if (!card) return;
            draggedItem = card;
            card.style.opacity = '0.5';
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const card = e.target.closest('.product-card-admin');
            if (card && card !== draggedItem) {
                card.classList.add('drag-over');
            }
            e.dataTransfer.dropEffect = 'move';
        });

        container.addEventListener('dragleave', (e) => {
            const card = e.target.closest('.product-card-admin');
            if (card) card.classList.remove('drag-over');
        });

        container.addEventListener('drop', async (e) => {
            e.preventDefault();
            
            const targetCard = e.target.closest('.product-card-admin');
            container.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));

            if (!targetCard || !draggedItem || draggedItem === targetCard) {
                if (draggedItem) {
                    draggedItem.style.opacity = '1';
                    draggedItem.classList.remove('dragging');
                }
                return;
            }

            const cards = [...container.querySelectorAll('.product-card-admin')];
            const draggedIndex = cards.indexOf(draggedItem);
            const targetIndex = cards.indexOf(targetCard);

            if (draggedIndex === -1 || targetIndex === -1) return;

            if (draggedIndex < targetIndex) {
                container.insertBefore(draggedItem, targetCard.nextSibling);
            } else {
                container.insertBefore(draggedItem, targetCard);
            }

            const newCards = [...container.querySelectorAll('.product-card-admin')];
            const updates = newCards.map((card, index) => ({
                id: card.dataset.productId,
                displayOrder: index
            }));

            await ProductManager.updateProductsOrder(updates);

            draggedItem.style.opacity = '1';
            draggedItem.classList.remove('dragging');
            draggedItem = null;

            await this.loadProducts();
        });

        container.addEventListener('dragend', (e) => {
            const card = e.target.closest('.product-card-admin');
            if (card) {
                card.style.opacity = '1';
                card.classList.remove('dragging');
            }
            container.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
            draggedItem = null;
        });
    }

    // ==================== MOVE PRODUCTS ====================
    static async moveProductUp(productId) {
        await ProductManager.moveProductUp(productId);
        await this.loadProducts();
    }

    static async moveProductDown(productId) {
        await ProductManager.moveProductDown(productId);
        await this.loadProducts();
    }

    // ==================== EVENT LISTENERS ====================
    static setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                document.getElementById('tab-' + this.dataset.tab)?.classList.add('active');
            });
        });

        // Buttons
        document.getElementById('add-product-btn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('add-category-btn')?.addEventListener('click', () => this.addCategoryDialog());
        document.getElementById('add-user-btn')?.addEventListener('click', () => this.openUserModal());

        // Search
        document.getElementById('product-search')?.addEventListener('input', (e) => this.loadProducts(e.target.value));

        // Forms
        document.getElementById('product-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProduct();
        });

        document.getElementById('user-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveUser();
        });

        // Modals
        document.getElementById('modal-close')?.addEventListener('click', () => this.closeProductModal());
        document.getElementById('user-modal-close')?.addEventListener('click', () => this.closeUserModal());

        document.getElementById('product-modal')?.addEventListener('click', function(e) {
            if (e.target === this) AdminPanel.closeProductModal();
        });

        document.getElementById('user-modal')?.addEventListener('click', function(e) {
            if (e.target === this) AdminPanel.closeUserModal();
        });

        // Image preview
        document.getElementById('product-image')?.addEventListener('change', function(e) {
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

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeProductModal();
                this.closeUserModal();
            }
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
        const product = await DB.getById('products', productId);
        if (!product) {
            UI.showToast('error', 'محصول یافت نشد');
            return;
        }

        document.getElementById('modal-title').textContent = '✏️ ویرایش محصول';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-price').value = product.price || 0;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-active').checked = product.isActive !== false;

        const preview = document.getElementById('image-preview');
        if (preview && product.image) {
            preview.src = product.image;
            preview.style.display = 'block';
        } else if (preview) {
            preview.style.display = 'none';
        }

        await this.loadCategories();
        document.getElementById('product-category').value = product.categoryId || '';
        document.getElementById('product-modal').classList.add('open');
    }

    static closeProductModal() {
        document.getElementById('product-modal')?.classList.remove('open');
    }

    static async saveProduct() {
        const productId = document.getElementById('product-id').value;
        const name = document.getElementById('product-name').value.trim();
        const categoryId = document.getElementById('product-category').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const description = document.getElementById('product-description').value.trim();
        const isActive = document.getElementById('product-active').checked;

        if (!name) { UI.showToast('error', '❌ نام محصول الزامی است'); return; }
        if (!categoryId) { UI.showToast('error', '❌ دسته‌بندی را انتخاب کنید'); return; }
        if (isNaN(price) || price < 0) { UI.showToast('error', '❌ قیمت نامعتبر است'); return; }

        const productData = { name, categoryId, price, description, isActive };

        try {
            const imageFile = document.getElementById('product-image').files[0];
            
            if (imageFile) {
                // عکس‌های کوچک (< 100KB) رو Base64 ذخیره کن
                if (imageFile.size < 100 * 1024) {
                    productData.image = await this.fileToBase64(imageFile);
                    console.log('📷 Small image stored as Base64');
                } else {
                    // عکس‌های بزرگ رو توی GitHub آپلود کن
                    UI.showToast('info', '⏳ در حال آپلود عکس در GitHub...');
                    const imageUrl = await this.uploadImageToGitHub(imageFile);
                    productData.image = imageUrl;
                    console.log('📷 Large image uploaded to GitHub:', imageUrl);
                }
            } else if (productId) {
                // حفظ عکس قبلی
                const existing = await DB.getById('products', productId);
                if (existing && existing.image) {
                    productData.image = existing.image;
                }
            }

            if (productId) {
                await ProductManager.updateProduct(productId, productData);
            } else {
                await ProductManager.addProduct(productData);
            }

            this.closeProductModal();
            await this.loadProducts();
        } catch (error) {
            UI.showToast('error', '❌ ' + error.message);
        }
    }

    // ==================== UPLOAD IMAGE TO GITHUB ====================
    static async uploadImageToGitHub(imageFile) {
        const token = localStorage.getItem('ara_github_token');
        const owner = localStorage.getItem('ara_github_owner') || 'alikarami28';
        const repo = localStorage.getItem('ara_github_repo') || 'ARA-Coffee-POS';
        const branch = localStorage.getItem('ara_github_branch') || 'main';
        
        if (!token) {
            console.warn('⚠️ No GitHub token, using Base64');
            return await this.fileToBase64(imageFile);
        }

        try {
            const base64 = await this.fileToBase64(imageFile);
            const content = base64.split(',')[1]; // Remove data:image/... prefix
            
            const ext = imageFile.name.split('.').pop() || 'jpg';
            const fileName = 'product-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5) + '.' + ext;
            const path = 'assets/images/products/' + fileName;
            
            const apiUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path;
            
            const body = {
                message: '📷 Upload product image: ' + fileName,
                content: content,
                branch: branch
            };

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const result = await response.json();
                const rawUrl = 'https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + branch + '/assets/images/products/' + fileName;
                console.log('✅ Image uploaded to GitHub:', rawUrl);
                UI.showToast('success', '✅ عکس در GitHub ذخیره شد');
                return rawUrl;
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Upload failed');
            }
        } catch (error) {
            console.error('❌ Image upload failed:', error.message);
            UI.showToast('warning', '⚠️ آپلود عکس ناموفق - به صورت فشرده ذخیره شد');
            return await this.fileToBase64(imageFile);
        }
    }

    // ==================== PRODUCT ACTIONS ====================
    static async toggleProduct(productId) {
        await ProductManager.toggleProductStatus(productId);
        await this.loadProducts();
    }

    static async deleteProduct(productId) {
        const product = await DB.getById('products', productId);
        if (!product) return;

        if (!confirm(`آیا از حذف "${product.name}" اطمینان دارید؟\nاین عملیات قابل بازگشت نیست!`)) return;

        await ProductManager.deleteProduct(productId);
        await this.loadProducts();
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
        const form = document.getElementById('user-form');
        const title = document.getElementById('user-modal-title');
        if (!form || !title) return;

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

        if (!username) { UI.showToast('error', '❌ نام کاربری الزامی است'); return; }
        if (!userId && (!password || password.length < 4)) { UI.showToast('error', '❌ رمز عبور حداقل ۴ کاراکتر'); return; }

        try {
            let users = this.allUsers;

            if (userId) {
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
                users.push({
                    id: 'user-' + Date.now(),
                    username: username,
                    passwordHash: await this.hashPassword(password),
                    role: role,
                    isActive: true,
                    createdAt: new Date().toISOString()
                });
                UI.showToast('success', '✅ کاربر اضافه شد');
            }

            localStorage.setItem('ara_users', JSON.stringify(users));
            this.allUsers = users;
            this.closeUserModal();
            await this.loadUsers();
        } catch (error) {
            UI.showToast('error', '❌ ' + error.message);
        }
    }

    static async editUser(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (user) this.openUserModal(user);
    }

    static async deleteUser(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        if (user.role === 'admin' && this.allUsers.filter(u => u.role === 'admin').length <= 1) {
            UI.showToast('warning', '⚠️ حداقل یک مدیر باید وجود داشته باشد');
            return;
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
