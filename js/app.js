// app.js - Main Application Controller with Access Control
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
            
            if (typeof UI !== 'undefined') {
                UI.applySavedTheme();
                UI.updateDateTime();
            }
            
            if (this.currentPage !== 'login') {
                if (typeof AuthManager !== 'undefined' && !AuthManager.isLoggedIn()) {
                    window.location.href = './login.html';
                    return;
                }
                
                // ⛔ CHECK PAGE ACCESS
                if (typeof AuthManager !== 'undefined' && !AuthManager.checkPageAccess()) {
                    return;
                }
                
                console.log('✅ User authenticated');
            }

            if (typeof UI !== 'undefined') {
                UI.displayUserInfo();
                UI.setupShortcuts();
            }
            
            this.initSideNavigation();
            this.initLogoutButton();

            switch (this.currentPage) {
                case 'login':
                    if (typeof AuthManager !== 'undefined') AuthManager.initLoginForm();
                    break;
                case 'pos':
                    await this.initPOSPage();
                    break;
                case 'admin':
                    if (typeof AdminPanel !== 'undefined') await AdminPanel.init();
                    break;
                case 'orders':
                    if (typeof OrderHistory !== 'undefined') await OrderHistory.init();
                    break;
                case 'reports':
                    if (typeof ReportManager !== 'undefined') await ReportManager.init();
                    break;
                case 'settings':
                    if (typeof SettingsPage !== 'undefined') SettingsPage.init();
                    break;
                case 'menu':
                    if (typeof MenuPage !== 'undefined') await MenuPage.init();
                    break;
            }
            
            console.log('✅ ARAApp ready');
        } catch (error) {
            console.error('❌ Init error:', error);
        }
    }

    // ==================== SIDEBAR ====================
    initSideNavigation() {
        const menuToggle = document.getElementById('menu-toggle');
        const sideNav = document.getElementById('side-nav');
        const overlay = document.getElementById('side-nav-overlay');
        if (!menuToggle || !sideNav) return;

        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sideNav.classList.toggle('open');
            if (overlay) overlay.classList.toggle('active');
        });

        if (overlay) {
            overlay.addEventListener('click', () => {
                sideNav.classList.remove('open');
                overlay.classList.remove('active');
            });
        }

        sideNav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                sideNav.classList.remove('open');
                if (overlay) overlay.classList.remove('active');
            });
        });
    }

    // ==================== LOGOUT ====================
    initLogoutButton() {
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            if (confirm('آیا از خروج اطمینان دارید؟')) {
                if (typeof AuthManager !== 'undefined') AuthManager.logout();
            }
        });
    }

    // ==================== POS PAGE ====================
    async initPOSPage() {
        console.log('🛒 POS page initializing...');
        
        const productGrid = document.getElementById('product-grid');
        const cartItemsContainer = document.getElementById('cart-items');
        if (!productGrid || !cartItemsContainer) return;

        let allProducts = [];
        let activeCategoryId = null;

        const loadCategories = async () => {
            try {
                let cats = [];
                if (typeof DB !== 'undefined') cats = await DB.getCategories();
                if (cats.length === 0) {
                    try {
                        const owner = localStorage.getItem('ara_github_owner') || 'alikarami28';
                        const repo = localStorage.getItem('ara_github_repo') || 'ARA-Coffee-POS';
                        const branch = localStorage.getItem('ara_github_branch') || 'main';
                        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/categories.json?t=${Date.now()}`;
                        const response = await fetch(url);
                        if (response.ok) { const data = await response.json(); cats = data.categories || []; }
                    } catch (e) {}
                }
                const container = document.getElementById('category-tabs');
                if (!container) return;
                container.innerHTML = `<button class="category-tab active" data-cat="all">📋 همه</button>` +
                    cats.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map(c => 
                        `<button class="category-tab" data-cat="${c.id}">${c.icon || '☕'} ${c.name}</button>`
                    ).join('');
                container.querySelectorAll('.category-tab').forEach(btn => {
                    btn.addEventListener('click', () => {
                        container.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        activeCategoryId = btn.dataset.cat === 'all' ? null : btn.dataset.cat;
                        filterProducts();
                    });
                });
            } catch (e) {}
        };

        const loadProducts = async () => {
            try {
                if (typeof DB !== 'undefined') allProducts = await DB.getProducts();
                if (allProducts.length === 0) {
                    try {
                        const owner = localStorage.getItem('ara_github_owner') || 'alikarami28';
                        const repo = localStorage.getItem('ara_github_repo') || 'ARA-Coffee-POS';
                        const branch = localStorage.getItem('ara_github_branch') || 'main';
                        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/products.json?t=${Date.now()}`;
                        const response = await fetch(url);
                        if (response.ok) { const data = await response.json(); allProducts = data.products || []; }
                    } catch (e) {}
                }
                console.log('📦 Products:', allProducts.length);
                renderProducts(allProducts);
            } catch (e) { renderProducts([]); }
        };

        const renderProducts = (products) => {
            if (!productGrid) return;
            const activeProducts = products.filter(p => p.isActive !== false);
            if (activeProducts.length === 0) {
                productGrid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-light);">محصولی یافت نشد</p>';
                return;
            }
            productGrid.innerHTML = activeProducts.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map(p => `
                <div class="product-card glass" data-pid="${p.id}">
                    <div class="product-image" style="background-image:url('${p.image || './assets/images/logo-placeholder.png'}')"></div>
                    <div class="product-info"><h3>${p.name}</h3><p class="price">${UI.formatCurrency(p.price)}</p></div>
                </div>`).join('');
            productGrid.querySelectorAll('.product-card').forEach(card => {
                card.addEventListener('click', () => {
                    const product = allProducts.find(p => p.id === card.dataset.pid);
                    if (product && typeof Cart !== 'undefined') Cart.addItem(product);
                });
            });
        };

        const filterProducts = () => {
            let filtered = [...allProducts].filter(p => p.isActive !== false);
            if (activeCategoryId) filtered = filtered.filter(p => p.categoryId === activeCategoryId);
            const search = document.getElementById('pos-search')?.value?.trim()?.toLowerCase();
            if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
            renderProducts(filtered);
        };

        if (typeof Cart !== 'undefined') {
            Cart.onChange((ev, data) => {
                if (ev === 'change') {
                    const { items, subtotalOriginal, taxAmount, discountAmount, finalAmount } = data;
                    const hasDiscount = discountAmount > 0;
                    if (items.length === 0) {
                        cartItemsContainer.innerHTML = '<p class="empty-cart">سبد خرید خالی است</p>';
                    } else {
                        cartItemsContainer.innerHTML = items.map(item => `
                            <div class="cart-item">
                                <div class="item-details">
                                    <span class="item-name">${item.productName}</span>
                                    <span class="item-price">${UI.formatCurrency(item.unitPrice)}</span>
                                    ${item.discountedUnitPrice < item.unitPrice ? `<span style="color:#e74c3c;font-size:0.7rem;">${UI.formatCurrency(item.discountedUnitPrice)}</span>` : ''}
                                </div>
                                <div class="item-quantity">
                                    <button class="qty-btn dec" data-pid="${item.productId}">−</button>
                                    <span class="qty-value">${item.quantity}</span>
                                    <button class="qty-btn inc" data-pid="${item.productId}">+</button>
                                    <button class="delete-btn" data-pid="${item.productId}">🗑️</button>
                                </div>
                                <span class="item-total">${UI.formatCurrency(item.discountedTotal || item.totalPrice)}</span>
                            </div>`).join('');
                        cartItemsContainer.querySelectorAll('.qty-btn.inc').forEach(b => { b.onclick = (e) => { e.stopPropagation(); Cart.increaseQuantity(b.dataset.pid); }; });
                        cartItemsContainer.querySelectorAll('.qty-btn.dec').forEach(b => { b.onclick = (e) => { e.stopPropagation(); Cart.decreaseQuantity(b.dataset.pid); }; });
                        cartItemsContainer.querySelectorAll('.delete-btn').forEach(b => { b.onclick = (e) => { e.stopPropagation(); Cart.removeItem(b.dataset.pid); }; });
                    }
                    document.getElementById('subtotal-amount').textContent = UI.formatCurrency(subtotalOriginal);
                    document.getElementById('tax-amount').textContent = UI.formatCurrency(taxAmount);
                    document.getElementById('discount-amount').textContent = hasDiscount ? '-' + UI.formatCurrency(discountAmount) : '۰ تومان';
                    document.getElementById('total-amount').textContent = UI.formatCurrency(finalAmount);
                }
            });
        }

        document.getElementById('pos-search')?.addEventListener('input', filterProducts);
        document.getElementById('clear-cart-btn')?.addEventListener('click', () => { Cart?.clearCart(); UI.showToast('info', 'سبد خرید خالی شد'); });
        document.getElementById('apply-discount-percent')?.addEventListener('click', () => {
            const p = parseFloat(document.getElementById('discount-percent')?.value) || 0;
            if (p <= 0 || p > 100) { UI.showToast('warning', 'درصد تخفیف باید بین ۱ تا ۱۰۰ باشد'); return; }
            Cart.setDiscountPercent(p);
            UI.showToast('info', `🏷️ تخفیف ${p}% اعمال شد`);
        });
        document.getElementById('apply-discount-amount')?.addEventListener('click', () => {
            const a = parseFloat(document.getElementById('discount-amount-input')?.value) || 0;
            if (a <= 0) { UI.showToast('warning', 'مبلغ تخفیف باید بیشتر از صفر باشد'); return; }
            Cart.setDiscountAmount(a);
            UI.showToast('info', `🏷️ تخفیف ${UI.formatCurrency(a)} اعمال شد`);
        });
        document.getElementById('remove-discount')?.addEventListener('click', () => { Cart.removeDiscount(); UI.showToast('info', 'تخفیف حذف شد'); });
        document.getElementById('checkout-btn')?.addEventListener('click', async () => {
            if (!Cart || Cart.getCartSummary().items.length === 0) { UI.showToast('warning', 'سبد خرید خالی است'); return; }
            try {
                const method = document.querySelector('input[name="payment-method"]:checked')?.value || 'Cash';
                const order = await Cart.checkout(method);
                if (typeof PrintService !== 'undefined') PrintService.previewReceipt(order);
                UI.showToast('success', `✅ سفارش ${order.invoiceNumber} ثبت شد`);
            } catch (e) { UI.showToast('error', '❌ ' + e.message); }
        });

        await loadCategories();
        await loadProducts();
        console.log('✅ POS ready');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ARA_App = new ARAApp();
});