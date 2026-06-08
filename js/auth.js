// auth.js - Authentication with GitHub Storage
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

            if (!username) { errorEl.textContent = 'نام کاربری را وارد کنید'; errorEl.style.display = 'block'; return; }
            if (!password) { errorEl.textContent = 'رمز عبور را وارد کنید'; errorEl.style.display = 'block'; return; }

            try {
                const users = await this._getUsers();
                const user = users.find(u => u.username === username && u.isActive);
                
                if (!user) {
                    errorEl.textContent = '❌ نام کاربری یا رمز عبور اشتباه است';
                    errorEl.style.display = 'block';
                    return;
                }
                
                const hash = await this._hashPassword(password);
                if (hash !== user.passwordHash) {
                    await new Promise(r => setTimeout(r, 1000));
                    errorEl.textContent = '❌ نام کاربری یا رمز عبور اشتباه است';
                    errorEl.style.display = 'block';
                    return;
                }
                
                const session = { 
                    userId: user.id, 
                    username: user.username, 
                    role: user.role, 
                    expiresAt: new Date(Date.now() + this.sessionTimeout).toISOString() 
                };
                localStorage.setItem('ara_session', JSON.stringify(session));
                window.location.href = '/index.html';
                
            } catch (err) {
                errorEl.textContent = '❌ خطا در ورود';
                errorEl.style.display = 'block';
            }
        });
    }

    // ==================== GET USERS FROM GITHUB ====================
    static async _getUsers() {
        // Try GitHub first
        try {
            if (typeof DB !== 'undefined') {
                const settings = await DB.getSettings();
                if (settings && settings.users && Array.isArray(settings.users)) {
                    return settings.users;
                }
            }
        } catch (e) {
            console.warn('Could not load users from GitHub');
        }
        
        // Fallback to localStorage
        try {
            return JSON.parse(localStorage.getItem('ara_users') || '[]');
        } catch (e) {
            return [];
        }
    }

    // ==================== SAVE USERS TO GITHUB ====================
    static async _saveUsers(users) {
        // Always save to localStorage as backup
        localStorage.setItem('ara_users', JSON.stringify(users));
        
        // Try saving to GitHub
        try {
            if (typeof DB !== 'undefined') {
                const settings = await DB.getSettings();
                settings.users = users;
                await DB.saveSettings(settings);
                console.log('✅ Users saved to GitHub');
                return true;
            }
        } catch (e) {
            console.warn('Users saved to localStorage only:', e.message);
        }
        return false;
    }

    // ==================== ENSURE DEFAULT ADMIN ====================
    static async ensureDefaultAdmin() {
        const users = await this._getUsers();
        
        if (users.length === 0) {
            console.log('🔧 Creating default admin...');
            const hash = await this._hashPassword('admin123');
            const defaultAdmin = [{
                id: 'user-admin-default',
                username: 'admin',
                passwordHash: hash,
                role: 'admin',
                isActive: true,
                createdAt: new Date().toISOString()
            }];
            
            await this._saveUsers(defaultAdmin);
            console.log('✅ Default admin created: admin / admin123');
        }
    }

    // ==================== CRUD ====================
    static async createUser(username, password, role = 'cashier') {
        if (!username || username.length < 3) throw new Error('نام کاربری حداقل ۳ کاراکتر');
        if (!password || password.length < 4) throw new Error('رمز عبور حداقل ۴ کاراکتر');

        const users = await this._getUsers();
        
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            throw new Error('این نام کاربری قبلاً استفاده شده است');
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
        const saved = await this._saveUsers(users);
        
        if (saved) {
            console.log('✅ User saved to GitHub:', username);
        }
        
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
        await this._saveUsers(users.filter(u => u.id !== userId));
    }

    // ==================== HASH ====================
    static async _hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ==================== SESSION ====================
    static logout() {
        localStorage.removeItem('ara_session');
        window.location.href = '/login.html';
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
}
