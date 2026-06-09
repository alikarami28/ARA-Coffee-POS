// ui.js - UI Utilities with Role-Based UI
class UI {
    static formatCurrency(amount, currency = null) {
        const curr = currency || (() => { try { return JSON.parse(localStorage.getItem('ara_currency') || '"تومان"'); } catch(e) { return 'تومان'; } })();
        if (isNaN(amount)) amount = 0;
        try { return new Intl.NumberFormat('fa-IR').format(Math.round(amount)) + ' ' + curr; } catch (e) { return Math.round(amount) + ' ' + curr; }
    }

    static formatDate(dateString) {
        if (!dateString) return '';
        try { return new Date(dateString).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return dateString; }
    }

    static showToast(type, message, duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.style.animation = 'slideDown 0.3s ease forwards'; setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300); }, duration);
    }

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
        if (icon) icon.textContent = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark' ? '☀️' : '🌙';
    }

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
        // Hide admin links for cashier
        if (user.role !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            const adminPages = ['admin.html', 'orders.html', 'reports.html', 'settings.html'];
            document.querySelectorAll('.nav-link').forEach(link => {
                const href = link.getAttribute('href');
                if (adminPages.some(p => href?.includes(p))) link.style.display = 'none';
            });
        }
    }

    static setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2') { e.preventDefault(); document.getElementById('pos-search')?.focus(); }
            if (e.key === 'F4') { e.preventDefault(); if (typeof Cart !== 'undefined') Cart.clearCart(); }
            if (e.key === 'F8') { e.preventDefault(); document.getElementById('checkout-btn')?.click(); }
            if (e.ctrlKey && e.key === 't') { e.preventDefault(); this.toggleTheme(); }
        });
    }

    static updateDateTime() {
        const el = document.getElementById('current-datetime');
        if (!el) return;
        const update = () => { try { el.textContent = new Date().toLocaleString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch (e) {} };
        update(); setInterval(update, 1000);
    }

    static init() { this.applySavedTheme(); this.updateDateTime(); this.initThemeToggle(); this.setupShortcuts(); }

    static initThemeToggle() {
        const btn = document.getElementById('theme-toggle');
        if (btn) { const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn); newBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleTheme(); }); }
    }
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => UI.init()); } else { UI.init(); }