// auth.js - Authentication with Role-Based Access Control (Fixed)
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

        // Enter key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
                form.dispatchEvent(new Event('submit'));
            }
        });
    }

    // ==================== LOGIN ====================
    static async login(username, password) {
        // ⚠️ همیشه مستقیم از localStorage بخون - مهم!
        let users = [];
        try {
            const raw = localStorage.getItem('ara_users');
            users = raw ? JSON.parse(raw) : [];
        } catch (e) {
            users = [];
        }

        console.log('🔍 Available users:', users.map(u => ({ username: u.username, role: u.role })));

        const user = users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.isActive !== false
        );

        if (!user) {
            console.log('❌ User not found:', username);
            throw new Error('❌ نام کاربری یا رمز عبور اشتباه است');
        }

        const hash = await this._hashPassword(password);
        
        console.log('🔑 Input hash:', hash);
        console.log('🔑 Stored hash:', user.passwordHash);
        console.log('🔑 Match:', hash === user.passwordHash);

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
        
        console.log('✅ Login successful:', username, 'Role:', user.role);
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
    
    /**
     * گرفتن کاربران - همیشه از localStorage
     */
    static _getUsers() {
        try {
            const raw = localStorage.getItem('ara_users');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Error reading users:', e);
            return [];
        }
    }

    /**
     * ذخیره کاربران - همیشه در localStorage
     * ⚠️ کاربران قبلی رو حفظ می‌کنه، بازنویسی نمی‌کنه
     */
    static _saveUsers(users) {
        if (!Array.isArray(users)) {
            console.error('❌ _saveUsers: users is not an array!');
            return;
        }
        localStorage.setItem('ara_users', JSON.stringify(users));
        console.log('💾 Users saved:', users.length, 'users');
    }

    /**
     * اطمینان از وجود مدیر پیش‌فرض
     * ⚠️ اگه مدیر وجود داشته باشه، دوباره ساخته نمیشه
     */
    static async ensureDefaultAdmin() {
        const users = this._getUsers();
        
        // چک کن مدیر وجود داره یا نه
        const adminExists = users.some(u => u.role === 'admin');
        
        if (!adminExists) {
            console.log('🔧 Creating default admin...');
            const hash = await this._hashPassword('admin123');
            
            // اضافه کردن مدیر به لیست موجود (نه جایگزین کردن)
            users.push({
                id: 'user-admin-default',
                username: 'admin',
                passwordHash: hash,
                role: 'admin',
                isActive: true,
                createdAt: new Date().toISOString()
            });
            
            this._saveUsers(users);
            console.log('✅ Default admin created: admin / admin123');
        } else {
            console.log('✅ Admin already exists');
        }
    }

    /**
     * ایجاد کاربر جدید
     */
    static async createUser(username, password, role = 'cashier') {
        if (!username || username.length < 3) throw new Error('نام کاربری حداقل ۳ کاراکتر');
        if (!password || password.length < 4) throw new Error('رمز عبور حداقل ۴ کاراکتر');

        // ⚠️ همیشه مستقیم از localStorage بخون
        const users = this._getUsers();
        
        // چک تکراری نبودن
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
        
        // ⚠️ اضافه کردن به لیست - نه جایگزین کردن
        users.push(newUser);
        this._saveUsers(users);
        
        console.log('✅ User created:', username, 'Role:', role);
        return newUser;
    }

    /**
     * بروزرسانی کاربر
     */
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

    /**
     * حذف کاربر
     */
    static async deleteUser(userId) {
        const users = this._getUsers();
        
        // نمی‌تونیم آخرین مدیر رو حذف کنیم
        const user = users.find(u => u.id === userId);
        if (user?.role === 'admin') {
            const adminCount = users.filter(u => u.role === 'admin').length;
            if (adminCount <= 1) {
                throw new Error('نمی‌توان آخرین مدیر را حذف کرد');
            }
        }
        
        const filtered = users.filter(u => u.id !== userId);
        this._saveUsers(filtered);
        console.log('🗑️ User deleted:', userId);
    }

    // ==================== HASH PASSWORD ====================
    static async _hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'ARA_Coffee_Salt_2026');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ==================== SESSION MANAGEMENT ====================
    static logout() {
        this.currentUser = null;
        localStorage.removeItem('ara_session');
        window.location.href = './login.html';
    }

    static isLoggedIn() {
        try {
            const s = localStorage.getItem('ara_session');
            if (!s) return false;
            const d = JSON.parse(s);
            return new Date() < new Date(d.expiresAt);
        } catch (e) {
            return false;
        }
    }

    static getCurrentUser() {
        if (!this.currentUser) {
            try {
                const s = localStorage.getItem('ara_session');
                if (s) this.currentUser = JSON.parse(s);
            } catch (e) {
                this.currentUser = null;
            }
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

    // ==================== DEBUG ====================
    static debugUsers() {
        const users = this._getUsers();
        console.log('=== USERS DEBUG ===');
        console.log('Total users:', users.length);
        users.forEach(u => {
            console.log(`- ${u.username} | Role: ${u.role} | Active: ${u.isActive} | Hash: ${u.passwordHash?.substring(0, 16)}...`);
        });
        return users;
    }
}

// ==================== AUTO-FIX ON LOAD ====================
// اگه کاربری وجود نداره، مدیر پیش‌فرض رو بساز
(async function() {
    try {
        const users = JSON.parse(localStorage.getItem('ara_users') || '[]');
        if (users.length === 0) {
            console.log('🔧 No users found, creating default admin...');
            const encoder = new TextEncoder();
            const data = encoder.encode('admin123' + 'ARA_Coffee_Salt_2026');
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            localStorage.setItem('ara_users', JSON.stringify([{
                id: 'user-admin-default',
                username: 'admin',
                passwordHash: hash,
                role: 'admin',
                isActive: true,
                createdAt: new Date().toISOString()
            }]));
            console.log('✅ Default admin created: admin / admin123');
        }
    } catch (e) {
        console.error('Auto-fix error:', e);
    }
})();

console.log('🔒 AuthManager loaded');
