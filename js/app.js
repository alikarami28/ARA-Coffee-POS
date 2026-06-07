// app.js - Main Application Controller (Complete)
// Version: 5.0 - All features working

class ARAApp {
    constructor() {
        const pageAttr = document.body.getAttribute('data-page');
        this.currentPage = pageAttr || 'pos';
        console.log('📄 Current page:', this.currentPage);
        this.init();
    }

    async init() {
        try {
            console.log('🚀 ARAApp initializing for:', this.currentPage);
            
            // Apply theme first
            if (typeof UI !== 'undefined') {
                UI.applySavedTheme();
                UI.updateDateTime();
            }
            
            // Check auth (except login page)
            if (this.currentPage !== 'login') {
                if (typeof AuthManager !== 'undefined' && !AuthManager.isLoggedIn()) {
                    console.log('🔒 Not logged in, redirecting...');
                    window.location.href = '/login.html';
                    return;
                }
                console.log('✅ User authenticated');
            }

            // Initialize UI components
            if (typeof UI !== 'undefined') {
                UI.displayUserInfo();
                UI.setupShortcuts();
            }
            
            // Initialize sidebar navigation
            this.initSideNavigation();
            
            // Initialize logout button
            this.initLogoutButton();

            // Route to page-specific logic
            console.log('🔀 Routing to:', this.currentPage);
            
            switch (this.currentPage) {
                case 'login':
                    if (typeof AuthManager !== 'undefined') {
                        AuthManager.initLoginForm();
                    }
                    break;
                    
                case 'pos':
                    await this.initPOSPage();
                    break;
                    
                case 'admin':
                    if (typeof AdminPanel !== 'undefined') {
                        await AdminPanel.init();
                    } else {
                        console.error('❌ AdminPanel not found');
                    }
                    break;
                    
                case 'orders':
                    if (typeof OrderHistory !== 'undefined') {
                        await OrderHistory.init();
                    } else {
                        console.error('❌ OrderHistory not found');
                    }
                    break;
                    
                case 'reports':
                    if (typeof ReportManager !== 'undefined') {
                        await ReportManager.init();
                    } else {
                        console.error('❌ ReportManager not found');
                    }
                    break;
                    
                case 'settings':
                    if (typeof SettingsPage !== 'undefined') {
                        SettingsPage.init();
                    } else {
                        console.error('❌ SettingsPage not found');
                    }
                    break;
                    
                case 'menu':
                    if (typeof MenuPage !== 'undefined') {
                        await MenuPage.init();
                    } else {
                        console.error('❌ MenuPage not found');
                    }
                    break;
                    
                default:
                    console.warn('⚠️ Unknown page:', this.currentPage);
            }
            
            console.log('✅ ARAApp ready');
            
        } catch (error) {
            console.error('❌ Init error:', error);
            if (typeof UI !== 'undefined') {
                UI.showToast('error', 'خطا در راه‌اندازی: ' + error.message);
            }
        }
    }

    // ==================== SIDEBAR NAVIGATION ====================
    initSideNavigation() {
        const menuToggle = document.getElementById('menu-toggle');
        const sideNav = document.getElementById('side-nav');
        const overlay = document.getElementById('side-nav-overlay');
        
        if (!menuToggle || !sideNav) {
            console.warn('⚠️ Menu elements not found');
            return;
        }

        console.log('✅ Sidebar initialized');

        // Toggle menu
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sideNav.classList.toggle('open');
            if (overlay) overlay.classList.toggle('active');
        });

        // Close on overlay click
        if (overlay) {
            overlay.addEventListener('click', () => {
                sideNav.classList.remove('open');
                overlay.classList.remove('active');
            });
        }

        // Close on link click
        sideNav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                sideNav.classList.remove('open');
                if (overlay) overlay.classList.remove('active');
            });
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sideNav.classList.contains('open')) {
                sideNav.classList.remove('open');
                if (overlay) overlay.classList.remove('active');
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (sideNav.classList.contains('open') && 
                !sideNav.contains(e.target) && 
                e.target !== menuToggle) {
                sideNav.classList.remove('open');
                if (overlay) overlay.classList.remove('active');
            }
        });
    }

    // ==================== LOGOUT ====================
    initLogoutButton() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('آیا از خروج اطمینان دارید؟')) {
                    if (typeof AuthManager !== 'undefined') {
                        AuthManager.logout();
                    } else {
                        localStorage.removeItem('ara_session');
                        window.location.href = '/login.html';
                    }
                }
            });
        }
    }

    // ==================== POS PAGE ====================
    async initPOSPage() {
        console.log('🛒 POS page initializing...');
        
        const productGrid = document.getElementById('product-grid');
        const cartItemsContainer = document.getElementById('cart-items');
        
        if (!productGrid || !cartItemsContainer) {
            console.error('❌ POS elements missing');
            return;
        }

        let allProducts = [];
        let activeCategoryId = null;

        // ========== LOAD CATEGORIES ==========
        const loadCategories = async () => {
            try {
                let cats = [];
                
                // Try DB first
                if (typeof DB !== 'undefined') {
                    cats = await DB.getCategories();
                    console.log('📂 Categories from DB:', cats.length);
                }
                
                // Fallback to direct GitHub fetch
                if (cats.length === 0) {
                    try {
                        const owner = localStorage.getItem('ara_github_owner') || 'alikarami28';
                        const repo = localStorage.getItem('ara_github_repo') || 'ARA-Coffee-POS';
                        const branch = localStorage.getItem('ara_github_branch') || 'main';
                        
                        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/categories.json?t=${Date.now()}`;
                        console.log('🌐 Fetching categories:', url);
                        
                        const response = await fetch(url);
                        if (response.ok) {
                            const data = await response.json();
                            cats = data.categories || [];
                            console.log('📂 Categories from direct fetch:', cats.length);
                        }
                    } catch (directError) {
                        console.warn('Direct fetch failed:', directError.message);
                    }
                }
                
                const container = document.getElementById('category-tabs');
                if (!container) return;
                
                container.innerHTML = `
                    <button class="category-tab active" data-cat="all">📋 همه</button>
                    ${cats.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map(c => 
                        `<button class="category-tab" data-cat="${c.id}">${c.icon || '☕'} ${c.name}</button>`
                    ).join('')}
                `;
                
                container.querySelectorAll('.category-tab').forEach(btn => {
                    btn.addEventListener('click', () => {
                        container.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        activeCategoryId = btn.dataset.cat === 'all' ? null : btn.dataset.cat;
                        filterProducts();
                    });
                });
                
            } catch (e) {
                console.error('Error loading categories:', e);
            }
        };

        // ========== LOAD PRODUCTS ==========
        const loadProducts = async () => {
            try {
                // Try DB first
                if (typeof DB !== 'undefined') {
                    allProducts = await DB.getProducts();
                    console.log('📦 Products from DB:', allProducts.length);
                }
                
                // If empty, try direct GitHub fetch
                if (allProducts.length === 0) {
                    try {
                        const owner = localStorage.getItem('ara_github_owner') || 'alikarami28';
                        const repo = localStorage.getItem('ara_github_repo') || 'ARA-Coffee-POS';
                        const branch = localStorage.getItem('ara_github_branch') || 'main';
                        
                        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/products.json?t=${Date.now()}`;
                        console.log('🌐 Fetching products:', url);
                        
                        const response = await fetch(url);
                        if (response.ok) {
                            const data = await response.json();
                            allProducts = data.products || [];
                            console.log('📦 Products from direct fetch:', allProducts.length);
                        }
                    } catch (directError) {
                        console.warn('Direct fetch failed:', directError.message);
                    }
                }
                
                renderProducts(allProducts);
            } catch (e) {
                console.error('Error loading products:', e);
                renderProducts([]);
            }
        };

        // ========== RENDER PRODUCTS ==========
        const renderProducts = (products) => {
            if (!productGrid) return;
            
            const activeProducts = products.filter(p => p.isActive !== false);
            console.log('🎨 Rendering', activeProducts.length, 'active products');
            
            if (activeProducts.length === 0) {
                productGrid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-light);">محصولی یافت نشد</p>';
                return;
            }
            
            productGrid.innerHTML = activeProducts
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map(p => `
                    <div class="product-card glass" data-pid="${p.id}">
                        <div class="product-image" style="background-image:url('${p.image || '/assets/images/logo-placeholder.png'}')"></div>
                        <div class="product-info">
                            <h3>${p.name}</h3>
                            <p class="price">${UI.formatCurrency(p.price)}</p>
                        </div>
                    </div>
                `).join('');

            productGrid.querySelectorAll('.product-card').forEach(card => {
                card.addEventListener('click', () => {
                    const product = allProducts.find(p => p.id === card.dataset.pid);
                    if (product && typeof Cart !== 'undefined') {
                        Cart.addItem(product);
                    }
                });
            });
        };

        // ========== FILTER PRODUCTS ==========
        const filterProducts = () => {
            let filtered = [...allProducts].filter(p => p.isActive !== false);
            
            if (activeCategoryId) {
                filtered = filtered.filter(p => p.categoryId === activeCategoryId);
            }
            
            const search = document.getElementById('pos-search')?.value?.trim()?.toLowerCase();
            if (search) {
                filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
            }
            
            renderProducts(filtered);
        };

        // ========== CART RENDERING ==========
        if (typeof Cart !== 'undefined') {
            Cart.onChange((ev, data) => {
                if (ev === 'change') {
                    const { items, subtotal, taxRate } = data;
                    const tax = (subtotal * taxRate) / 100;
                    const total = subtotal + tax;
                    
                    if (items.length === 0) {
                        cartItemsContainer.innerHTML = '<p class="empty-cart">سبد خرید خالی است</p>';
                    } else {
                        cartItemsContainer.innerHTML = items.map(item => `
                            <div class="cart-item">
                                <div class="item-details">
                                    <span class="item-name">${item.productName}</span>
                                    <span class="item-price">${UI.formatCurrency(item.unitPrice)}</span>
                                </div>
                                <div class="item-quantity">
                                    <button class="qty-btn dec" data-pid="${item.productId}">−</button>
                                    <span class="qty-value">${item.quantity}</span>
                                    <button class="qty-btn inc" data-pid="${item.productId}">+</button>
                                    <button class="delete-btn" data-pid="${item.productId}">🗑️</button>
                                </div>
                                <span class="item-total">${UI.formatCurrency(item.totalPrice)}</span>
                            </div>
                        `).join('');
                        
                        // Quantity buttons
                        cartItemsContainer.querySelectorAll('.qty-btn.inc').forEach(b => {
                            b.onclick = (e) => { 
                                e.stopPropagation(); 
                                Cart.increaseQuantity(b.dataset.pid); 
                            };
                        });
                        cartItemsContainer.querySelectorAll('.qty-btn.dec').forEach(b => {
                            b.onclick = (e) => { 
                                e.stopPropagation(); 
                                Cart.decreaseQuantity(b.dataset.pid); 
                            };
                        });
                        cartItemsContainer.querySelectorAll('.delete-btn').forEach(b => {
                            b.onclick = (e) => { 
                                e.stopPropagation(); 
                                Cart.removeItem(b.dataset.pid); 
                            };
                        });
                    }
                    
                    // Update totals
                    const subtotalEl = document.getElementById('subtotal-amount');
                    const taxEl = document.getElementById('tax-amount');
                    const discountEl = document.getElementById('discount-amount');
                    const totalEl = document.getElementById('total-amount');
                    
                    if (subtotalEl) subtotalEl.textContent = UI.formatCurrency(subtotal);
                    if (taxEl) taxEl.textContent = UI.formatCurrency(tax);
                    if (discountEl) discountEl.textContent = UI.formatCurrency(0);
                    if (totalEl) totalEl.textContent = UI.formatCurrency(total);
                }
            });
        }

        // ========== EVENT LISTENERS ==========
        
        // Search
        document.getElementById('pos-search')?.addEventListener('input', filterProducts);
        
        // Clear cart
        document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
            if (typeof Cart !== 'undefined') {
                Cart.clearCart();
                UI.showToast('info', 'سبد خرید خالی شد');
            }
        });
        
        // Checkout button
        document.getElementById('checkout-btn')?.addEventListener('click', async () => {
            if (!Cart || Cart.getCartSummary().items.length === 0) {
                UI.showToast('warning', 'سبد خرید خالی است');
                return;
            }
            
            try {
                const method = document.querySelector('input[name="payment-method"]:checked')?.value || 'Cash';
                const order = await Cart.checkout(method);
                
                // Show receipt preview
                if (typeof PrintService !== 'undefined') {
                    PrintService.previewReceipt(order);
                }
                
                UI.showToast('success', `✅ سفارش ${order.invoiceNumber} ثبت شد`);
            } catch (e) {
                UI.showToast('error', '❌ ' + e.message);
            }
        });

        // ========== INITIAL LOAD ==========
        await loadCategories();
        await loadProducts();
        
        console.log('✅ POS ready');
    }
}

// ==================== START APPLICATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM ready, data-page:', document.body.getAttribute('data-page'));
    window.ARA_App = new ARAApp();
});

// ==================== EXPORT FOR GLOBAL ACCESS ====================
// Make ARAApp available globally for debugging
if (typeof window !== 'undefined') {
    window.ARAApp = ARAApp;
}