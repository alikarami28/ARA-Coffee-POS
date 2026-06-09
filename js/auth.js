// auth.js - Authentication with Role-Based Access Control
class AuthManager {
    static currentUser = null;
    static sessionTimeout = 8 * 60 * 60 * 1000;

    // ==================== PAGE PERMISSIONS ====================
    static PAGE_PERMISSIONS = {
        'index.html': ['admin', 'cashier'],
        'pos': ['admin', 'cashier'],
        'admin.html': ['admin'],
        'orders.html': ['admin'],
        'reports.html': ['admin'],
        'settings.html': ['admin'],
        'menu.html': ['admin', 'cashier'],
        'login.html': ['admin', 'cashier']
    };

    // ==================== INIT LOGIN FORM ====================
    static async initLoginForm() {
        if (this.isLoggedIn()) {
            window.location.href = './index.html';
            return;
        }
        await this.ensureDefaultAdmin();

        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('login-error');
            errorEl.style.display = 'none';

            if (!username) {
                errorEl.textContent = 'لطفاً نام کاربری را وارد کنید';
                errorEl.style.display = 'block';
                return;
            }
            if (!password) {
                errorEl.textContent = 'لطفاً رمز عبور را وارد کنید';
                errorEl.style.display = 'block';
                return;
            }

            const btn = form.querySelector('button[type="submit"]');
            const orig = btn.textContent;
            btn.textContent = '⏳ در حال ورود...';
            btn.disabled = true;

            try {
                await this.login(username, password);
                btn.textContent = '✅ ورود موفق!';
                setTimeout(() => { window.location.href = './index.html'; }, 300);
            } catch (err) {
                errorEl.textContent = err.message;
                errorEl.style.display = 'block';
                btn.textContent = orig;
                btn.disabled = false;
            }
        });
    }

    // ==================== LOGIN ====================
    static async login(username, password) {
        const users = this._getUsers();
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.isActive);

        if (!user) {
            throw new Error('❌ نام کاربری یا رمز عبور اشتباه است');
        }

        const hash = await this._hashPassword(password);
        if (hash !== user.passwordHash) {
            await new Promise(r => setTimeout(r, 1500));
            throw new Error('❌ نام کاربری یا رمز عبور اشتباه است');
        }

        this.currentUser = { id: user.id, username: user.username, role: user.role };

        const session = {
            userId: user.id,
            username: user.username,
            role: user.role,
            loginTime: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.sessionTimeout).toISOString()
        };
        localStorage.setItem('ara_session', JSON.stringify(session));
        console.log('✅ Login:', username, 'Role:', user.role);
        return this.currentUser;
    }

    // ==================== PERMISSION CHECK ====================
    static canAccess(page) {
        const user = this.getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin') return true;
        const allowedRoles = this.PAGE_PERMISSIONS[page];
        if (!allowedRoles) return false;
        return allowedRoles.includes(user.role);
    }

    static checkPageAccess() {
        const currentPage = document.body.getAttribute('data-page');
        const pageName = currentPage || window.location.pathname.split('/').pop() || 'index.html';
        if (pageName === 'login' || pageName === 'login.html') return true;

        if (!this.canAccess(pageName)) {
            console.warn('⛔ Access denied for:', pageName);
            document.body.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Tahoma;direction:rtl;background:#FFF8F0;">
                    <div style="text-align:center;padding:40px;max-width:500px;">
                        <div style="font-size:5rem;margin-bottom:20px;">🔒</div>
                        <h1 style="color:#8B4513;margin-bottom:16px;">دسترسی غیرمجاز</h1>
                        <p style="color:#666;margin-bottom:24px;font-size:1.1rem;">شما مجوز دسترسی به این بخش را ندارید.</p>
                        <p style="color:#888;margin-bottom:24px;font-size:0.9rem;">نقش شما: <strong>${this.getCurrentUser()?.role === 'cashier' ? 'صندوق‌دار' : 'نامشخص'}</strong></p>
                        <a href="./index.html" style="display:inline-block;padding:12px 24px;background:#8B4513;color:#fff;text-decoration:none;border-radius:8px;font-size:1rem;">بازگشت به صندوق فروش</a>
                    </div>
                </div>`;
            return false;
        }
        return true;
    }

    // ==================== USERS CRUD ====================
    static _getUsers() {
        try { return JSON.parse(localStorage.getItem('ara_users') || '[]'); } catch (e) { return []; }
    }

    static _saveUsers(users) {
        localStorage.setItem('ara_users', JSON.stringify(users));
    }

    static async ensureDefaultAdmin() {
        const users = this._getUsers();
        if (users.length === 0) {
            const hash = await this._hashPassword('admin123');
            this._saveUsers([{
                id: 'user-admin-default',
                username: 'admin',
                passwordHash: hash,
                role: 'admin',
                isActive: true,
                createdAt: new Date().toISOString()
            }]);
            console.log('✅ Default admin created');
        }
    }

    static async createUser(username, password, role = 'cashier') {
        if (!username || username.length < 3) throw new Error('نام کاربری حداقل ۳ کاراکتر');
        if (!password || password.length < 4) throw new Error('رمز عبور حداقل ۴ کاراکتر');
        const users = this._getUsers();
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            throw new Error('این نام کاربری قبلاً استفاده شده');
        }
        const hash = await this._hashPassword(password);
        const newUser = {
            id: 'user-' + Date.now(),
            username: username.trim(),
            passwordHash: hash,
            role: role,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        this._saveUsers(users);
        return newUser;
    }

    static async updateUser(userId, updates) {
        const users = this._getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index === -1) throw new Error('کاربر یافت نشد');
        if (updates.username) users[index].username = updates.username.trim();
        if (updates.role) users[index].role = updates.role;
        if (updates.password) users[index].passwordHash = await this._hashPassword(updates.password);
        if (updates.isActive !== undefined) users[index].isActive = updates.isActive;
        this._saveUsers(users);
        return users[index];
    }

    static async deleteUser(userId) {
        const users = this._getUsers();
        this._saveUsers(users.filter(u => u.id !== userId));
    }

    // ==================== HASH ====================
    static async _hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'ARA_Coffee_Salt_2026');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ==================== SESSION ====================
    static logout() {
        localStorage.removeItem('ara_session');
        window.location.href = './login.html';
    }

    static isLoggedIn() {
        try {
            const s = localStorage.getItem('ara_session');
            if (!s) return false;
            const d = JSON.parse(s);
            return new Date() < new Date(d.expiresAt);
        } catch (e) { return false; }
    }

    static getCurrentUser() {
        if (!this.currentUser) {
            try {
                const s = localStorage.getItem('ara_session');
                if (s) this.currentUser = JSON.parse(s);
            } catch (e) {}
        }
        return this.currentUser;
    }

    static getUserRole() {
        const user = this.getCurrentUser();
        return user ? user.role : null;
    }

    static isAdmin() {
        return this.getUserRole() === 'admin';
    }

    static isCashier() {
        return this.getUserRole() === 'cashier';
    }
}