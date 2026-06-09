// ui.js - UI Utilities with Dynamic Role-Based UI
// Version: 2.0 - Complete

class UI {
    // ==================== FORMAT HELPERS ====================
    
    static formatCurrency(amount, currency = null) {
        const curr = currency || (() => {
            try { return JSON.parse(localStorage.getItem('ara_currency') || '"تومان"'); } 
            catch(e) { return 'تومان'; }
        })();
        if (isNaN(amount)) amount = 0;
        try {
            return new Intl.NumberFormat('fa-IR').format(Math.round(amount)) + ' ' + curr;
        } catch (e) {
            return Math.round(amount) + ' ' + curr;
        }
    }

    static formatDate(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('fa-IR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    // ==================== TOAST NOTIFICATIONS ====================
    
    static showToast(type, message, duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) {
            console.log('Toast:', type, message);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }, duration);
    }

    // ==================== THEME MANAGEMENT ====================
    
    static applySavedTheme() {
        const theme = localStorage.getItem('ara_theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeToggleButton();
    }

    static toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('ara_theme', next);
        this.updateThemeToggleButton();
        console.log('🌓 Theme changed to:', next);
    }

    static updateThemeToggleButton() {
        const icon = document.querySelector('.theme-icon');
        if (icon) {
            const theme = document.documentElement.getAttribute('data-theme') || 'light';
            icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    // ==================== USER INFO DISPLAY ====================
    
    static displayUserInfo() {
        const user = AuthManager.getCurrentUser();
        if (!user) return;

        const nameEl = document.getElementById('current-user-display');
        const avatarEl = document.getElementById('user-avatar');
        
        // نمایش نام کاربر
        if (nameEl) {
            nameEl.textContent = user.username + (user.role === 'admin' ? ' 👑' : ' 💼');
        }
        
        // نمایش آواتار
        if (avatarEl) {
            avatarEl.textContent = user.username.charAt(0).toUpperCase();
            avatarEl.style.background = user.role === 'admin' ? '#8B4513' : '#2196F3';
        }

        // مخفی کردن منوهای غیرمجاز برای کاربران غیر مدیر
        if (user.role !== 'admin') {
            this.applyRolePermissions(user.role);
        }
        
        // نمایش پیام خوش‌آمد برای صندوق‌دار
        if (user.role === 'cashier') {
            console.log('💼 Cashier logged in:', user.username);
            console.log('🔒 Limited access mode active');
        }
    }

    /**
     * اعمال محدودیت‌های دسترسی بر اساس نقش کاربر
     * @param {string} role - نقش کاربر (cashier, etc.)
     */
    static applyRolePermissions(role) {
        const permissions = AuthManager._getPermissions();
        const rolePerms = permissions[role] || {};
        
        console.log('🔒 Applying permissions for role:', role);
        console.log('📋 Permissions:', rolePerms);
        
        // مخفی کردن آیتم‌های منو
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            // استخراج نام صفحه از href
            let pageName = href.replace('./', '').split('?')[0].split('#')[0];
            
            // نگاشت نام‌های خاص
            if (pageName === 'index.html' || pageName === '' || pageName === 'index') {
                pageName = 'pos';
            }
            
            // چک دسترسی
            const allowed = rolePerms[pageName];
            
            if (allowed === false) {
                link.style.display = 'none';
                console.log('🙈 Hidden:', pageName);
            } else {
                link.style.display = '';
                console.log('👁️ Visible:', pageName);
            }
        });
        
        // مخفی کردن عناصر با کلاس admin-only
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
            console.log('🙈 Hidden admin-only element');
        });
    }

    // ==================== KEYBOARD SHORTCUTS ====================
    
    static setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            // F2: فوکوس روی جستجو
            if (e.key === 'F2') {
                e.preventDefault();
                const searchInput = document.getElementById('pos-search') || document.getElementById('product-search');
                if (searchInput) searchInput.focus();
            }
            
            // F4: خالی کردن سبد خرید
            if (e.key === 'F4') {
                e.preventDefault();
                if (typeof Cart !== 'undefined') {
                    Cart.clearCart();
                    this.showToast('info', 'سبد خرید خالی شد');
                }
            }
            
            // F8: پرداخت
            if (e.key === 'F8') {
                e.preventDefault();
                const checkoutBtn = document.getElementById('checkout-btn');
                if (checkoutBtn) checkoutBtn.click();
            }
            
            // Ctrl+T: تغییر تم
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
            
            // ESC: بستن مودال‌ها
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal-overlay.open, .modal.open');
                if (modals.length > 0) {
                    e.preventDefault();
                    modals.forEach(modal => modal.classList.remove('open'));
                }
                // بستن سایدبار
                const sideNav = document.getElementById('side-nav');
                const overlay = document.getElementById('side-nav-overlay');
                if (sideNav && sideNav.classList.contains('open')) {
                    sideNav.classList.remove('open');
                    if (overlay) overlay.classList.remove('active');
                }
            }
        });
    }

    // ==================== DATE & TIME ====================
    
    static updateDateTime() {
        const el = document.getElementById('current-datetime');
        if (!el) return;
        
        const update = () => {
            try {
                const now = new Date();
                el.textContent = now.toLocaleString('fa-IR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
            } catch (e) {
                el.textContent = new Date().toLocaleString();
            }
        };
        
        update();
        setInterval(update, 1000);
    }

    // ==================== THEME TOGGLE BUTTON ====================
    
    static initThemeToggle() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            // حذف event listener قبلی
            const newBtn = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleTheme();
            });
            
            console.log('🌓 Theme toggle initialized');
        }
    }

    // ==================== INITIALIZATION ====================
    
    static init() {
        this.applySavedTheme();
        this.updateDateTime();
        this.initThemeToggle();
        this.setupShortcuts();
        
        // نمایش اطلاعات کاربر بعد از لود کامل
        if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
            this.displayUserInfo();
        }
        
        console.log('✅ UI initialized');
    }

    // ==================== CONFIRM DIALOG ====================
    
    static confirm(message) {
        return window.confirm(message);
    }

    // ==================== NOTIFICATION BADGE ====================
    
    static updateCartBadge(count) {
        const badge = document.getElementById('cart-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // ==================== LOADING INDICATOR ====================
    
    static showLoading(message = '⏳ لطفاً صبر کنید...') {
        const existing = document.getElementById('global-loading');
        if (existing) existing.remove();

        const loading = document.createElement('div');
        loading.id = 'global-loading';
        loading.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            font-family: Tahoma, sans-serif;
        `;
        loading.innerHTML = `
            <div style="background: #fff; border-radius: 16px; padding: 30px 40px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
                <div style="font-size: 3rem; margin-bottom: 12px; animation: spin 1s linear infinite;">⏳</div>
                <p style="color: #333; font-size: 1rem;">${message}</p>
            </div>
        `;
        document.body.appendChild(loading);
    }

    static hideLoading() {
        const loading = document.getElementById('global-loading');
        if (loading) loading.remove();
    }

    // ==================== DEBOUNCE ====================
    
    static debounce(func, delay = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
}

// ==================== AUTO INIT ====================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
} else {
    UI.init();
}

// ==================== EXPORT FOR GLOBAL ACCESS ====================

if (typeof window !== 'undefined') {
    window.UI = UI;
}

console.log('🎨 UI module loaded');