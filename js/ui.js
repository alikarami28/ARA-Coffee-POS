// ui.js - UI Utilities, Theme Management & Keyboard Shortcuts
class UI {
    static formatCurrency(amount, currency = null) {
        const curr = currency || SettingsManager.get('currency', 'تومان');
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
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    static applySavedTheme() {
        const theme = SettingsManager.get('theme', 'light');
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeToggleButton();
    }

    static toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        SettingsManager.set('theme', newTheme);
        
        this.updateThemeToggleButton();
        console.log('Theme changed to:', newTheme);
    }

    static updateThemeToggleButton() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const toggleBtn = document.getElementById('theme-toggle');
        
        if (toggleBtn) {
            const iconSpan = toggleBtn.querySelector('.theme-icon');
            if (iconSpan) {
                iconSpan.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
            }
            toggleBtn.title = currentTheme === 'dark' ? 'حالت روشن' : 'حالت تاریک';
        }
    }

    static displayUserInfo() {
        const user = AuthManager.getCurrentUser();
        if (!user) return;

        const nameEl = document.getElementById('current-user-display');
        const avatarEl = document.getElementById('user-avatar');
        
        if (nameEl) nameEl.textContent = user.username || 'کاربر';
        if (avatarEl) avatarEl.textContent = (user.username || 'U').charAt(0).toUpperCase();
    }

    static setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                const searchInput = document.getElementById('pos-search') || document.getElementById('product-search');
                if (searchInput) searchInput.focus();
            }
            
            if (e.key === 'F4') {
                e.preventDefault();
                if (typeof Cart !== 'undefined') {
                    Cart.clearCart();
                    this.showToast('info', 'سبد خرید خالی شد');
                }
            }
            
            if (e.key === 'F8') {
                e.preventDefault();
                const checkoutBtn = document.getElementById('checkout-btn');
                if (checkoutBtn) checkoutBtn.click();
            }
            
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal-overlay.open');
                if (modals.length > 0) {
                    e.preventDefault();
                    modals.forEach(modal => modal.classList.remove('open'));
                }
            }
            
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

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

    static init() {
        this.applySavedTheme();
        this.updateDateTime();
        this.initThemeToggle();
        this.setupShortcuts();
        console.log('UI initialized');
    }

    static initThemeToggle() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            const newBtn = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleTheme();
            });
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
} else {
    UI.init();
}