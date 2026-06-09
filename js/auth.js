// auth.js - Authentication with GitHub Storage
class AuthManager {
    static currentUser = null;
    static sessionTimeout = 8 * 60 * 60 * 1000;

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

    // ==================== INIT ====================
    static async initLoginForm() {
        if (this.isLoggedIn()) { window.location.href = './index.html'; return; }
        await this.ensureDefaultAdmin();

        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('login-error');
            errorEl.style.display = 'none';

            if (!username) { errorEl.textContent = 'نام کاربری را وارد کنید'; errorEl.style.display = 'block'; return; }
            if (!password) { errorEl.textContent = 'رمز عبور را وارد کنید'; errorEl.style.display = 'block'; return; }

            const btn = form.querySelector('button[type="submit"]');
            btn.textContent = '⏳ در حال ورود...';
            btn.disabled = true;

            try {
                await this.login(username, password);
                btn.textContent = '✅ ورود موفق!';
                setTimeout(() => { window.location.href = './index.html'; }, 300);
            } catch (err) {
                errorEl.textContent = err.message;
                errorEl.style.display = 'block';
                btn.textContent = 'ورود به سیستم';
                btn.disabled = false;
            }
        });
    }

    // ==================== LOGIN ====================
    static async login(username, password) {
        const users = await this._getUsers();
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.isActive !== false);

        if (!user) throw new Error('❌ نام کاربری یا رمز عبور اشتباه است');

        const hash = await this._hashPassword(password);
        if (hash !== user.passwordHash) {
            await new Promise(r => setTimeout(r, 1500));
            throw new Error('❌ نام کاربری یا رمز عبور اشتباه است');
        }

        this.currentUser = { id: user.id, username: user.username, role: user.role };
        localStorage.setItem('ara_session', JSON.stringify({
            userId: user.id, username: user.username, role: user.role,
            loginTime: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.sessionTimeout).toISOString()
        }));
        console.log('✅ Login:', username, 'Role:', user.role);
        return this.currentUser;
    }

    // ==================== GET USERS (GitHub + localStorage) ====================
    static async _getUsers() {
        // ۱. اول از localStorage بخون (سریع)
        let localUsers = [];
        try {
            const raw = localStorage.getItem('ara_users');
            localUsers = raw ? JSON.parse(raw) : [];
        } catch (e) { localUsers = []; }

        // ۲. بعد از GitHub هم بخون (اگه DB در دسترس باشه)
        if (typeof DB !== 'undefined') {
            try {
                const settings = await DB.getSettings();
                if (settings && settings.users && Array.isArray(settings.users)) {
                    // کاربران GitHub رو با localStorage ادغام کن
                    const githubUsers = settings.users;
                    
                    // کاربرایی که توی GitHub هستن ولی توی localStorage نیستن رو اضافه کن
                    githubUsers.forEach(gUser => {
                        if (!localUsers.find(lUser => lUser.id === gUser.id)) {
                            localUsers.push(gUser);
                        }
                    });
                    
                    // localStorage رو آپدیت کن
                    localStorage.setItem('ara_users', JSON.stringify(localUsers));
                    console.log('📦 Users merged from GitHub:', localUsers.length);
                }
            } catch (e) {
                console.warn('Could not load users from GitHub:', e.message);
            }
        }

        return localUsers;
    }

    // ==================== SAVE USERS (GitHub + localStorage) ====================
    static async _saveUsers(users) {
        // همیشه توی localStorage ذخیره کن
        localStorage.setItem('ara_users', JSON.stringify(users));
        console.log('💾 Users saved to localStorage:', users.length);

        // سعی کن توی GitHub هم ذخیره کنه
        if (typeof DB !== 'undefined') {
            try {
                const settings = await DB.getSettings();
                settings.users = users;
                await DB.saveSettings(settings);
                console.log('✅ Users saved to GitHub');
            } catch (e) {
                console.warn('Users saved to localStorage only:', e.message);
            }
        }
    }

    // ==================== ENSURE DEFAULT ADMIN ====================
    static async ensureDefaultAdmin() {
        const users = await this._getUsers();
        const adminExists = users.some(u => u.role === 'admin');

        if (!adminExists) {
            console.log('🔧 Creating default admin...');
            const hash = await this._hashPassword('admin123');
            users.push({
                id: 'user-admin-default',
                username: 'admin',
                passwordHash: hash,
                role: 'admin',
                isActive: true,
                createdAt: new Date().toISOString()
            });
            await this._saveUsers(users);
            console.log('✅ Default admin created: admin / admin123');
        }
    }

    // ==================== CRUD ====================
    static async createUser(username, password, role = 'cashier') {
        if (!username || username.length < 3) throw new Error('نام کاربری حداقل ۳ کاراکتر');
        if (!password || password.length < 4) throw new Error('رمز عبور حداقل ۴ کاراکتر');

        const users = await this._getUsers();
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
        await this._saveUsers(users);
        return newUser;
    }

    static async updateUser(userId, updates) {
        const users = await this._getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index === -1) throw new Error('کاربر یافت نشد');
        if (updates.username) users[index].username = updates.username.trim();
        if (updates.role) users[index].role = updates.role;
        if (updates.password) users[index].passwordHash = await this._hashPassword(updates.password);
        if (updates.isActive !== undefined) users[index].isActive = updates.isActive;
        await this._saveUsers(users);
        return users[index];
    }

    static async deleteUser(userId) {
        const users = await this._getUsers();
        const user = users.find(u => u.id === userId);
        if (user?.role === 'admin') {
            const adminCount = users.filter(u => u.role === 'admin').length;
            if (adminCount <= 1) throw new Error('نمی‌توان آخرین مدیر را حذف کرد');
        }
        await this._saveUsers(users.filter(u => u.id !== userId));
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
    static logout() { localStorage.removeItem('ara_session'); window.location.href = './login.html'; }

    static isLoggedIn() {
        try {
            const s = localStorage.getItem('ara_session');
            if (!s) return false;
            return new Date() < new Date(JSON.parse(s).expiresAt);
        } catch (e) { return false; }
    }

    static getCurrentUser() {
        if (!this.currentUser) {
            try { const s = localStorage.getItem('ara_session'); if (s) this.currentUser = JSON.parse(s); } catch (e) {}
        }
        return this.currentUser;
    }

    static getUserRole() { const u = this.getCurrentUser(); return u ? u.role : null; }
    static isAdmin() { return this.getUserRole() === 'admin'; }
    static isCashier() { return this.getUserRole() === 'cashier'; }

    static canAccess(page) {
        const user = this.getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin') return true;
        const allowed = this.PAGE_PERMISSIONS[page];
        return allowed ? allowed.includes(user.role) : false;
    }

    static checkPageAccess() {
        const page = document.body.getAttribute('data-page') || window.location.pathname.split('/').pop() || 'index.html';
        if (page === 'login' || page === 'login.html') return true;
        if (!this.canAccess(page)) {
            document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Tahoma;direction:rtl;background:#FFF8F0;"><div style="text-align:center;padding:40px;max-width:500px;"><div style="font-size:5rem;margin-bottom:20px;">🔒</div><h1 style="color:#8B4513;margin-bottom:16px;">دسترسی غیرمجاز</h1><p style="color:#666;margin-bottom:24px;">شما مجوز دسترسی به این بخش را ندارید.</p><a href="./index.html" style="display:inline-block;padding:12px 24px;background:#8B4513;color:#fff;text-decoration:none;border-radius:8px;">بازگشت به صندوق فروش</a></div></div>`;
            return false;
        }
        return true;
    }
}

// ==================== AUTO-FIX ON LOAD ====================
(async function() {
    const users = JSON.parse(localStorage.getItem('ara_users') || '[]');
    if (users.length === 0) {
        const encoder = new TextEncoder();
        const data = encoder.encode('admin123' + 'ARA_Coffee_Salt_2026');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem('ara_users', JSON.stringify([{
            id: 'user-admin-default', username: 'admin', passwordHash: hash,
            role: 'admin', isActive: true, createdAt: new Date().toISOString()
        }]));
        console.log('✅ Default admin auto-created');
    }
})();

console.log('🔒 AuthManager ready');
