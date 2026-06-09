// ui.js - UI Utilities with Dynamic Role-Based UI
// Version: 3.0 - Fixed Permission Check

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
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) { return dateString; }
    }

    // ==================== TOAST ====================
    
    static showToast(type, message, duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) { console.log('Toast:', type, message); return; }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease forwards';
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
        }, duration);
    }

    // ==================== THEME ====================
    
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
    }

    static updateThemeToggleButton() {
        const icon = document.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark' ? '☀️' : '🌙';
        }
    }

    // ==================== USER INFO & PERMISSIONS ====================
    
    static displayUserInfo() {
        const user = AuthManager.getCurrentUser();
        if (!user) return;

        const nameEl = document.getElementById('current-user-display');
        const avatarEl = document.getElementById('user-avatar');
        
        if (nameEl) nameEl.textContent = user.username + (user.role === 'admin' ? ' 👑' : ' 💼');
        if (avatarEl) {
            avatarEl.textContent = user.username.charAt(0).toUpperCase();
            avatarEl.style.background = user.role === 'admin' ? '#8B4513' : '#2196F3';
        }

        // برای غیر مدیر، دسترسی‌ها رو اعمال کن
        if (user.role !== 'admin') {
            this.applyRolePermissions(user.role);
        }
    }

    /**
     * اعمال محدودیت دسترسی بر اساس نقش
     * چک می‌کنه کدوم صفحات مجاز هستن و کدوم نیستن
     */
    static applyRolePermissions(role) {
        // گرفتن تنظیمات دسترسی از AuthManager
        const permissions = AuthManager._getPermissions();
        const rolePerms = permissions[role] || {};
        
        console.log('🔒 Role:', role);
        console.log('📋 Permissions:', JSON.stringify(rolePerms));
        
        // لیست تمام صفحات و mapping
        const pageMapping = {
            'index.html': 'pos',
            'pos': 'pos',
            'admin.html': 'admin.html',
            'orders.html': 'orders.html',
            'reports.html': 'reports.html',
            'settings.html': 'settings.html',
            'menu.html': 'menu.html'
        };
        
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            // استخراج نام فایل از href
            let fileName = href.replace('./', '').split('?')[0].split('#')[0];
            
            // پیدا کردن کلید permissions
            let permKey = pageMapping[fileName] || fileName;
            
            // چک دسترسی - اگه false باشه مخفی کن
            // اگه true باشه یا undefined باشه (تنظیم نشده) نشون بده
            const allowed = rolePerms[permKey];
            
            console.log(`🔍 ${fileName} → ${permKey}: ${allowed === false ? '❌ مخفی' : '✅ نمایش'}`);
            
            if (allowed === false) {
                link.style.display = 'none';
            } else {
                link.style.display = '';
            }
        });
    }

    // ==================== SHORTCUTS ====================
    
    static setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2') { e.preventDefault(); const s = document.getElementById('pos-search') || document.getElementById('product-search'); if(s) s.focus(); }
            if (e.key === 'F4') { e.preventDefault(); if (typeof Cart !== 'undefined') { Cart.clearCart(); this.showToast('info', 'سبد خرید خالی شد'); } }
            if (e.key === 'F8') { e.preventDefault(); const c = document.getElementById('checkout-btn'); if(c) c.click(); }
            if (e.ctrlKey && e.key === 't') { e.preventDefault(); this.toggleTheme(); }
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.open, .modal.open').forEach(m => m.classList.remove('open'));
                const sn = document.getElementById('side-nav'), ov = document.getElementById('side-nav-overlay');
                if (sn?.classList.contains('open')) { sn.classList.remove('open'); if(ov) ov.classList.remove('active'); }
            }
        });
    }

    // ==================== DATE TIME ====================
    
    static updateDateTime() {
        const el = document.getElementById('current-datetime');
        if (!el) return;
        const update = () => {
            try { el.textContent = new Date().toLocaleString('fa-IR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }); } catch(e) {}
        };
        update(); setInterval(update, 1000);
    }

    // ==================== THEME TOGGLE ====================
    
    static initThemeToggle() {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleTheme(); });
        }
    }

    // ==================== INIT ====================
    
    static init() {
        this.applySavedTheme();
        this.updateDateTime();
        this.initThemeToggle();
        this.setupShortcuts();
        if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
            this.displayUserInfo();
        }
        console.log('✅ UI initialized');
    }

    // ==================== UTILS ====================
    
    static confirm(msg) { return window.confirm(msg); }
    
    static showLoading(msg = '⏳ لطفاً صبر کنید...') {
        const ex = document.getElementById('global-loading'); if(ex) ex.remove();
        const ld = document.createElement('div'); ld.id = 'global-loading';
        ld.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Tahoma;';
        ld.innerHTML = `<div style="background:#fff;border-radius:16px;padding:30px 40px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.3);"><div style="font-size:3rem;margin-bottom:12px;">⏳</div><p style="color:#333;">${msg}</p></div>`;
        document.body.appendChild(ld);
    }
    
    static hideLoading() { const ld = document.getElementById('global-loading'); if(ld) ld.remove(); }
    
    static debounce(func, delay = 300) { let t; return function(...a) { clearTimeout(t); t = setTimeout(() => func.apply(this, a), delay); }; }
}

// Auto init
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => UI.init()); }
else { UI.init(); }

if (typeof window !== 'undefined') { window.UI = UI; }

console.log('🎨 UI module v3.0 loaded');