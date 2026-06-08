// auth.js - Secure Authentication System
class AuthManager {
    static currentUser = null;
    static sessionTimeout = 8 * 60 * 60 * 1000;

    static async initLoginForm() {
        if (this.isLoggedIn()) { window.location.href = '/index.html'; return; }
        await this.ensureDefaultAdmin();

        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('login-error');
            errorEl.style.display = 'none';

            if (!username) { this._showError('لطفاً نام کاربری را وارد کنید'); return; }
            if (!password) { this._showError('لطفاً رمز عبور را وارد کنید'); return; }

            const btn = form.querySelector('button[type="submit"]');
            const orig = btn.textContent;
            btn.textContent = '⏳ در حال ورود...';
            btn.disabled = true;

            try {
                await this.login(username, password);
                btn.textContent = '✅ ورود موفق!';
                setTimeout(() => { window.location.href = '/index.html'; }, 500);
            } catch (err) {
                this._showError(err.message);
                btn.textContent = orig;
                btn.disabled = false;
                form.style.animation = 'none'; form.offsetHeight; form.style.animation = 'shake 0.5s ease';
            }
        });
    }

    // ==================== DEFAULT ADMIN ====================
    static async ensureDefaultAdmin() {
        try {
            let users = [];
            try { users = JSON.parse(localStorage.getItem('ara_users') || '[]'); } catch (e) {}

            if (users.length === 0) {
                console.log('🔧 Creating default admin...');
                const hash = await this._hashPassword('admin123');
                users = [{ id: 'user-admin-default', username: 'admin', passwordHash: hash, role: 'admin', isActive: true, createdAt: new Date().toISOString() }];
                localStorage.setItem('ara_users', JSON.stringify(users));
                console.log('✅ Default admin created: admin / admin123');
            }
        } catch (e) { console.error(e); }
    }

    // ==================== LOGIN ====================
    static async login(username, password) {
        let users = [];
        try { users = JSON.parse(localStorage.getItem('ara_users') || '[]'); } catch (e) {}

        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.isActive);
        if (!user) { throw new Error('❌ نام کاربری یا رمز عبور اشتباه است'); }

        const hash = await this._hashPassword(password);
        if (hash !== user.passwordHash) {
            await new Promise(r => setTimeout(r, 1000));
            throw new Error('❌ نام کاربری یا رمز عبور اشتباه است');
        }

        this.currentUser = { id: user.id, username: user.username, role: user.role };
        const session = { userId: user.id, username: user.username, role: user.role, loginTime: new Date().toISOString(), expiresAt: new Date(Date.now() + this.sessionTimeout).toISOString() };
        localStorage.setItem('ara_session', JSON.stringify(session));
        console.log('✅ Login:', username);
        return this.currentUser;
    }

    static logout() { this.currentUser = null; localStorage.removeItem('ara_session'); window.location.href = '/login.html'; }

    static isLoggedIn() {
        try {
            const s = localStorage.getItem('ara_session');
            if (!s) return false;
            const d = JSON.parse(s);
            if (new Date() > new Date(d.expiresAt)) { localStorage.removeItem('ara_session'); return false; }
            return true;
        } catch (e) { return false; }
    }

    static getCurrentUser() {
        if (!this.currentUser) {
            try { const s = localStorage.getItem('ara_session'); if (s) this.currentUser = JSON.parse(s); } catch (e) {}
        }
        return this.currentUser;
    }

    // ==================== HASH ====================
    static async _hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'ARA_Coffee_Salt_2026');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ==================== CRUD ====================
    static _getUsers() {
        try { return JSON.parse(localStorage.getItem('ara_users') || '[]'); } catch (e) { return []; }
    }
    static _saveUsers(users) { localStorage.setItem('ara_users', JSON.stringify(users)); }

    static async createUser(username, password, role = 'cashier') {
        const users = this._getUsers();
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) throw new Error('نام کاربری تکراری است');
        if (!username || username.length < 3) throw new Error('نام کاربری حداقل ۳ کاراکتر');
        if (!password || password.length < 4) throw new Error('رمز عبور حداقل ۴ کاراکتر');
        users.push({ id: 'user-' + Date.now(), username: username.trim(), passwordHash: await this._hashPassword(password), role, isActive: true, createdAt: new Date().toISOString() });
        this._saveUsers(users);
        return users[users.length - 1];
    }

    static async updateUser(userId, updates) {
        const users = this._getUsers();
        const i = users.findIndex(u => u.id === userId);
        if (i === -1) throw new Error('کاربر یافت نشد');
        if (updates.username) users[i].username = updates.username.trim();
        if (updates.role) users[i].role = updates.role;
        if (updates.password) users[i].passwordHash = await this._hashPassword(updates.password);
        if (updates.isActive !== undefined) users[i].isActive = updates.isActive;
        this._saveUsers(users);
        return users[i];
    }

    static async deleteUser(userId) {
        this._saveUsers(this._getUsers().filter(u => u.id !== userId));
    }

    static _showError(msg) {
        const el = document.getElementById('login-error');
        if (el) { el.textContent = msg; el.style.display = 'block'; }
    }
}
