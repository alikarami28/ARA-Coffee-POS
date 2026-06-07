// menu.js - Menu Page Logic
class MenuPage {
    static allProducts = [];
    static allCategories = [];
    static activeCategoryId = null;

    static async init() {
        console.log('🍽️ MenuPage initializing...');
        
        // Apply theme
        this.applyTheme();
        
        // Setup theme toggle
        this.setupThemeToggle();
        
        // Load data
        await this.loadSettings();
        await this.loadCategories();
        await this.loadProducts();
        
        // Setup filters
        this.setupCategoryFilters();
        
        console.log('✅ MenuPage ready');
    }

    // ==================== Theme ====================
    static applyTheme() {
        const theme = localStorage.getItem('ara_theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeIcon();
    }

    static toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('ara_theme', next);
        this.updateThemeIcon();
    }

    static updateThemeIcon() {
        const icon = document.querySelector('.theme-icon');
        if (icon) {
            const theme = document.documentElement.getAttribute('data-theme') || 'light';
            icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    static setupThemeToggle() {
        const btn = document.getElementById('menu-theme-toggle');
        if (btn) {
            btn.addEventListener('click', () => this.toggleTheme());
        }
    }

    // ==================== Load Settings ====================
    static async loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('ara_cafeName') || '"ARA Coffee"');
            const address = JSON.parse(localStorage.getItem('ara_address') || '"تهران، خیابان ولیعصر"');
            const phone = JSON.parse(localStorage.getItem('ara_phone') || '"۰۲۱-۱۲۳۴۵۶۷۸"');
            const instagram = JSON.parse(localStorage.getItem('ara_instagram') || '""');
            const website = JSON.parse(localStorage.getItem('ara_website') || '""');

            document.getElementById('menu-address').textContent = address.replace(/"/g, '');
            document.getElementById('menu-phone').textContent = phone.replace(/"/g, '');
            document.getElementById('footer-address').textContent = address.replace(/"/g, '');
            document.getElementById('footer-phone').textContent = '📞 ' + phone.replace(/"/g, '');

            const instaLink = document.getElementById('menu-instagram');
            if (instaLink && instagram.replace(/"/g, '')) {
                instaLink.href = 'https://instagram.com/' + instagram.replace(/"/g, '').replace('@', '');
            }

            const webLink = document.getElementById('menu-website');
            if (webLink && website.replace(/"/g, '')) {
                webLink.href = website.replace(/"/g, '');
            }
        } catch (e) {
            console.warn('Could not load settings:', e);
        }
    }

    // ==================== Load Data ====================
    static async loadCategories() {
        try {
            // Check if DB is available
            if (typeof DB !== 'undefined') {
                this.allCategories = await DB.getAll('categories');
                this.allCategories.sort((a, b) => a.displayOrder - b.displayOrder);
            } else {
                // Fallback: try localStorage
                const cats = localStorage.getItem('ara_categories');
                this.allCategories = cats ? JSON.parse(cats) : [];
            }
        } catch (e) {
            console.warn('Could not load categories:', e);
            this.allCategories = [];
        }
    }

    static async loadProducts() {
        try {
            if (typeof DB !== 'undefined') {
                this.allProducts = await DB.getAll('products');
            } else {
                const prods = localStorage.getItem('ara_products');
                this.allProducts = prods ? JSON.parse(prods) : [];
            }
            
            // Only show active products
            this.allProducts = this.allProducts.filter(p => p.isActive !== false);
            
            console.log(`📦 Loaded ${this.allProducts.length} active products`);
            this.renderProducts(this.allProducts);
        } catch (e) {
            console.warn('Could not load products:', e);
            this.renderProducts([]);
        }
    }

    // ==================== Render ====================
    static setupCategoryFilters() {
        const container = document.getElementById('menu-categories');
        if (!container) return;

        let html = '<button class="menu-cat-btn active" data-cat="all">📋 همه</button>';
        
        this.allCategories.forEach(cat => {
            // Check if category has active products
            const hasProducts = this.allProducts.some(p => p.categoryId === cat.id);
            if (hasProducts) {
                html += `<button class="menu-cat-btn" data-cat="${cat.id}">${cat.icon || '📂'} ${cat.name}</button>`;
            }
        });

        container.innerHTML = html;

        // Add event listeners
        container.querySelectorAll('.menu-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.menu-cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const catId = btn.dataset.cat;
                if (catId === 'all') {
                    this.renderProducts(this.allProducts);
                } else {
                    const filtered = this.allProducts.filter(p => p.categoryId === catId);
                    this.renderProducts(filtered);
                }

                // Scroll to products
                document.querySelector('.menu-products-section')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            });
        });
    }

    static renderProducts(products) {
        const container = document.getElementById('menu-products');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 4rem; margin-bottom: 16px;">🍽️</div>
                    <h3 style="color: var(--menu-text); margin-bottom: 8px;">محصولی یافت نشد</h3>
                    <p style="color: #888;">لطفاً بعداً مراجعه کنید</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(product => {
            // Find category name
            const category = this.allCategories.find(c => c.id === product.categoryId);
            const categoryName = category ? `${category.icon || ''} ${category.name}` : '';
            
            return `
                <div class="menu-product-card">
                    <div class="product-image-wrapper">
                        <img src="${product.image || '/assets/images/logo-placeholder.png'}" 
                             alt="${product.name}"
                             loading="lazy"
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%23FFF0E0%22 width=%22300%22 height=%22200%22/><text fill=%22%238B4513%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2250%22>☕</text></svg>'">
                        ${product.price > 50000 ? '<span class="product-badge">⭐ ویژه</span>' : ''}
                    </div>
                    <div class="product-details">
                        <h3 class="product-name">${product.name}</h3>
                        ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
                        <div class="product-price-row">
                            <span class="product-price">${this.formatPrice(product.price)}</span>
                            ${categoryName ? `<span class="product-category-tag">${categoryName}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ==================== Helpers ====================
    static formatPrice(price) {
        try {
            const currency = JSON.parse(localStorage.getItem('ara_currency') || '"تومان"');
            return new Intl.NumberFormat('fa-IR').format(Math.round(price)) + ' ' + currency.replace(/"/g, '');
        } catch (e) {
            return new Intl.NumberFormat('fa-IR').format(Math.round(price)) + ' تومان';
        }
    }
}

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
    MenuPage.init();
});