// auth.js - Authentication with Dynamic Role-Based Access Control
class AuthManager {
    static currentUser = null;
    static sessionTimeout = 8 * 60 * 60 * 1000;

    // ==================== DEFAULT PERMISSIONS ====================
    static DEFAULT_PERMISSIONS = {
        'admin': {
            'pos': true,
            'index.html': true,
            'admin.html': true,
            'orders.html': true,
            'reports.html': true,
            'settings.html': true,
            'menu.html': true,
            'login.html': true
        },
        'cashier': {
            'pos': true,
            'index.html': true,
            'admin.html': false,
            'orders.html': true,
            'reports.html': true,
            'settings.html': false,
            'menu.html': true,
            'login.html': true
        }
    };

    // ==================== PAGE LIST FOR SETTINGS ====================
    static PAGE_LIST = [
        { id: 'pos', name: 'صندوق فروش', icon: '🛒' },
        { id: 'admin.html', name: 'مدیریت محصولات', icon: '⚙️' },
        { id: 'orders.html', name: 'تاریخچه سفارشات', icon: '📋' },
        { id: 'reports.html', name: 'گزارشات و داشبورد', icon: '📊' },
        { id: 'settings.html', name: 'تنظیمات کافه', icon: '🔧' },
        { id: 'menu.html', name: 'منوی کافه', icon: '🍽️' }
    ];

    // ==================== ROLE LIST ====================
    static ROLE_LIST = [
        { id: 'admin', name: 'مدیر', icon: '👑', color: '#8B4513' },
        { id: 'cashier', name: 'صندوق‌دار', icon: '💼', color: '#2196F3' }
    ];

    // ==================== INIT LOGIN FORM ====================
    static async initLoginForm() {
        if (this.isLoggedIn()) {
            window.location.href = './index.html';
            return;
        }
        await this.ensureDefaultAdmin();
        await this.ensureDefaultPermissions();

        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('login-error');
            errorEl.style.display = 'none';

            if (!username) { errorEl.textContent = 'لطفاً نام کاربری را وارد کنید'; errorEl.style.display = 'block'; return; }
            if (!password) { errorEl.textContent = 'لطفاً رمز عبور را وارد کنید'; errorEl.style.display = 'block'; return; }

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

    // ==================== GET USERS ====================
    static async _getUsers() {
        let users = [];
        try {
            const raw = localStorage.getItem('ara_users');
            users = raw ? JSON.parse(raw) : [];
        } catch (e) { users = []; }

        if (typeof DB !== 'undefined') {
            try {
                const settings = await DB.getSettings();
                if (settings && settings.users && Array.isArray(settings.users)) {
                    settings.users.forEach(gUser => {
                        if (!users.find(lUser => lUser.id === gUser.id)) {
                            users.push(gUser);
                        }
                    });
                    localStorage.setItem('ara_users', JSON.stringify(users));
                }
            } catch (e) {}
        }

        return users;
    }

    // ==================== SAVE USERS ====================
    static async _saveUsers(users) {
        localStorage.setItem('ara_users', JSON.stringify(users));
        if (typeof DB !== 'undefined') {
            try {
                const settings = await DB.getSettings();
                settings.users = users;
                await DB.saveSettings(settings);
            } catch (e) {}
        }
    }

    // ==================== DEFAULT ADMIN ====================
    static async ensureDefaultAdmin() {
        const users = await this._getUsers();
        const adminExists = users.some(u => u.role === 'admin');
        if (!adminExists) {
            const hash = await this._hashPassword('admin123');
            users.push({
                id: 'user-admin-default', username: 'admin', passwordHash: hash,
                role: 'admin', isActive: true, createdAt: new Date().toISOString()
            });
            await this._saveUsers(users);
        }
    }

    // ==================== PERMISSIONS MANAGEMENT ====================
    
    /**
     * گرفتن تنظیمات دسترسی از localStorage
     */
    static _getPermissions() {
        try {
            const raw = localStorage.getItem('ara_permissions');
            return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(this.DEFAULT_PERMISSIONS));
        } catch (e) {
            return JSON.parse(JSON.stringify(this.DEFAULT_PERMISSIONS));
        }
    }

    /**
     * ذخیره تنظیمات دسترسی
     */
    static _savePermissions(permissions) {
        localStorage.setItem('ara_permissions', JSON.stringify(permissions));
    }

    /**
     * اطمینان از وجود تنظیمات پیش‌فرض
     */
    static async ensureDefaultPermissions() {
        const perms = this._getPermissions();
        if (!perms || Object.keys(perms).length === 0) {
            this._savePermissions(JSON.parse(JSON.stringify(this.DEFAULT_PERMISSIONS)));
        }
    }

    /**
     * تنظیم دسترسی یک نقش به یک صفحه
     */
    static setPagePermission(role, page, allowed) {
        const permissions = this._getPermissions();
        if (!permissions[role]) {
            permissions[role] = {};
        }
        permissions[role][page] = allowed;
        this._savePermissions(permissions);
        console.log(`🔒 Permission: ${role} → ${page} = ${allowed ? '✅' : '❌'}`);
    }

    /**
     * تنظیم دسترسی یک نقش به چند صفحه
     */
    static setRolePermissions(role, pagePermissions) {
        const permissions = this._getPermissions();
        permissions[role] = pagePermissions;
        this._savePermissions(permissions);
        console.log(`🔒 Updated all permissions for: ${role}`);
    }

    /**
     * گرفتن دسترسی‌های یک نقش
     */
    static getRolePermissions(role) {
        const permissions = this._getPermissions();
        return permissions[role] || {};
    }

    /**
     * ریست کردن دسترسی‌ها به حالت پیش‌فرض
     */
    static resetPermissions() {
        this._savePermissions(JSON.parse(JSON.stringify(this.DEFAULT_PERMISSIONS)));
        console.log('🔄 Permissions reset to default');
    }

    // ==================== CHECK ACCESS ====================
    
    /**
     * چک کردن دسترسی کاربر به یک صفحه
     */
    static canAccess(page) {
        const user = this.getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin') return true; // مدیر همیشه دسترسی داره

        const permissions = this._getPermissions();
        const rolePerms = permissions[user.role];
        if (!rolePerms) return false;

        return rolePerms[page] === true;
    }

    /**
     * چک کردن دسترسی و نمایش پیام در صورت عدم دسترسی
     */
    static checkPageAccess() {
        const currentPage = document.body.getAttribute('data-page');
        const pageName = currentPage || window.location.pathname.split('/').pop() || 'index.html';
        
        if (pageName === 'login' || pageName === 'login.html') return true;

        if (!this.canAccess(pageName)) {
            document.body.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Tahoma;direction:rtl;background:#FFF8F0;">
                    <div style="text-align:center;padding:40px;max-width:500px;">
                        <div style="font-size:5rem;margin-bottom:20px;">🔒</div>
                        <h1 style="color:#8B4513;margin-bottom:16px;">دسترسی غیرمجاز</h1>
                        <p style="color:#666;margin-bottom:24px;font-size:1.1rem;">شما مجوز دسترسی به این بخش را ندارید.</p>
                        <p style="color:#888;margin-bottom:24px;font-size:0.9rem;">نقش: <strong>${this.getCurrentUser()?.role === 'cashier' ? 'صندوق‌دار' : this.getCurrentUser()?.role}</strong></p>
                        <a href="./index.html" style="display:inline-block;padding:12px 24px;background:#8B4513;color:#fff;text-decoration:none;border-radius:8px;font-size:1rem;">بازگشت به صندوق فروش</a>
                    </div>
                </div>`;
            return false;
        }
        return true;
    }

    // ==================== USER CRUD ====================
    static async createUser(username, password, role = 'cashier') {
        if (!username || username.length < 3) throw new Error('نام کاربری حداقل ۳ کاراکتر');
        if (!password || password.length < 4) throw new Error('رمز عبور حداقل ۴ کاراکتر');

        const users = await this._getUsers();
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            throw new Error('این نام کاربری قبلاً استفاده شده');
        }

        const hash = await this._hashPassword(password);
        const newUser = {
            id: 'user-' + Date.now(), username: username.trim(),
            passwordHash: hash, role: role, isActive: true,
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
}

// Auto-fix on load
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
    }
})();

console.log('🔒 AuthManager with Dynamic Permissions ready');