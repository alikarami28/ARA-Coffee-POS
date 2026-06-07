// menu.js - Menu Page with GitHub Support
class MenuPage {
    static allProducts = [];
    static allCategories = [];

    static async init() {
        console.log('🍽️ MenuPage init');
        
        this.applyTheme();
        this.setupThemeToggle();
        
        await this.loadSettings();
        await this.loadData();
        this.setupFilters();
        
        // Refresh every 30 seconds
        setInterval(() => this.loadData(), 30000);
        
        console.log('✅ MenuPage ready');
    }

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
            icon.textContent = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark' ? '☀️' : '🌙';
        }
    }

    static setupThemeToggle() {
        document.getElementById('menu-theme-toggle')?.addEventListener('click', () => this.toggleTheme());
    }

    static async loadSettings() {
        try {
            const settings = await DB.getSettings();
            if (settings) {
                document.getElementById('menu-address').textContent = settings.address || 'تهران، خیابان ولیعصر';
                document.getElementById('menu-phone').textContent = settings.phone || '۰۲۱-۱۲۳۴۵۶۷۸';
                document.getElementById('footer-address').textContent = settings.address || 'تهران، خیابان ولیعصر';
                document.getElementById('footer-phone').textContent = '📞 ' + (settings.phone || '۰۲۱-۱۲۳۴۵۶۷۸');
                
                if (settings.instagram) {
                    const link = document.getElementById('menu-instagram');
                    if (link) link.href = 'https://instagram.com/' + settings.instagram.replace('@', '');
                }
                if (settings.website) {
                    const link = document.getElementById('menu-website');
                    if (link) link.href = settings.website;
                }
            }
        } catch (e) {
            console.warn('Could not load settings');
        }
    }

    static async loadData() {
        try {
            this.allCategories = await DB.getCategories();
            this.allProducts = await DB.getProducts();
            this.allProducts = this.allProducts.filter(p => p.isActive !== false);
            
            console.log(`📦 ${this.allProducts.length} products loaded`);
            this.renderProducts(this.allProducts);
            this.setupFilters();
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }

    static setupFilters() {
        const container = document.getElementById('menu-categories');
        if (!container) return;

        let html = '<button class="menu-cat-btn active" data-cat="all">📋 همه</button>';
        
        this.allCategories.forEach(cat => {
            const hasProducts = this.allProducts.some(p => p.categoryId === cat.id);
            if (hasProducts) {
                html += `<button class="menu-cat-btn" data-cat="${cat.id}">${cat.icon || '📂'} ${cat.name}</button>`;
            }
        });

        container.innerHTML = html;

        container.querySelectorAll('.menu-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.menu-cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const catId = btn.dataset.cat;
                const filtered = catId === 'all' ? this.allProducts : this.allProducts.filter(p => p.categoryId === catId);
                this.renderProducts(filtered);
                
                document.querySelector('.menu-products-section')?.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    static renderProducts(products) {
        const container = document.getElementById('menu-products');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
                    <div style="font-size:4rem;margin-bottom:16px;">🍽️</div>
                    <h3 style="color:var(--menu-text);margin-bottom:8px;">محصولی یافت نشد</h3>
                    <p style="color:#888;">لطفاً بعداً مراجعه کنید</p>
                </div>`;
            return;
        }

        container.innerHTML = products.map(product => {
            const cat = this.allCategories.find(c => c.id === product.categoryId);
            const catName = cat ? `${cat.icon || ''} ${cat.name}` : '';
            
            return `
                <div class="menu-product-card">
                    <div class="product-image-wrapper">
                        <img src="${product.image || '/assets/images/logo-placeholder.png'}" 
                             alt="${product.name}" loading="lazy"
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%23FFF0E0%22 width=%22300%22 height=%22200%22/><text fill=%22%238B4513%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2250%22>☕</text></svg>'">
                        ${product.price > 50000 ? '<span class="product-badge">⭐ ویژه</span>' : ''}
                    </div>
                    <div class="product-details">
                        <h3 class="product-name">${product.name}</h3>
                        ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
                        <div class="product-price-row">
                            <span class="product-price">${this.formatPrice(product.price)}</span>
                            ${catName ? `<span class="product-category-tag">${catName}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    static formatPrice(price) {
        try {
            const currency = DB._localGet('settings')?.currency || 'تومان';
            return new Intl.NumberFormat('fa-IR').format(Math.round(price)) + ' ' + currency;
        } catch (e) {
            return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => MenuPage.init());