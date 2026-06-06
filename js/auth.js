// auth.js - Authentication & User Management
class AuthManager {
    static currentUser = null;
    static sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours

    static async initLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;

        // Check if already logged in
        if (this.isLoggedIn()) {
            window.location.href = '/index.html';
            return;
        }

        // Ensure default admin exists
        await this.ensureDefaultAdmin();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            try {
                await this.login(username, password);
                window.location.href = '/index.html';
            } catch (error) {
                const errorEl = document.getElementById('login-error');
                if (errorEl) {
                    errorEl.textContent = error.message;
                    errorEl.style.display = 'block';
                }
            }
        });
    }

    static async ensureDefaultAdmin() {
        try {
            const users = await DB.getAll('users');
            if (users.length === 0) {
                const hashedPassword = await this._hashPassword('admin123');
                const defaultAdmin = {
                    id: 'admin-default-001',
                    username: 'admin',
                    passwordHash: hashedPassword,
                    role: 'admin',
                    isActive: true,
                    createdAt: new Date().toISOString()
                };
                await DB.add('users', defaultAdmin);
                console.log('Default admin created: admin / admin123');
            }
        } catch (error) {
            console.error('Error creating default admin:', error);
        }
    }

    static async login(username, password) {
        const users = await DB.getAll('users');
        const user = users.find(u => u.username === username && u.isActive);
        
        if (!user) {
            throw new Error('نام کاربری یا رمز عبور اشتباه است');
        }

        const hashedPassword = await this._hashPassword(password);
        if (hashedPassword !== user.passwordHash) {
            throw new Error('نام کاربری یا رمز عبور اشتباه است');
        }

        this.currentUser = user;
        const sessionData = {
            userId: user.id,
            username: user.username,
            role: user.role,
            loginTime: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.sessionTimeout).toISOString()
        };
        
        localStorage.setItem('ara_session', JSON.stringify(sessionData));
        return user;
    }

    static logout() {
        this.currentUser = null;
        localStorage.removeItem('ara_session');
        window.location.href = '/login.html';
    }

    static isLoggedIn() {
        try {
            const sessionData = localStorage.getItem('ara_session');
            if (!sessionData) return false;

            const session = JSON.parse(sessionData);
            const expiresAt = new Date(session.expiresAt);
            
            if (new Date() > expiresAt) {
                localStorage.removeItem('ara_session');
                return false;
            }

            return true;
        } catch (error) {
            localStorage.removeItem('ara_session');
            return false;
        }
    }

    static getCurrentUser() {
        if (!this.currentUser) {
            try {
                const sessionData = localStorage.getItem('ara_session');
                if (sessionData) {
                    this.currentUser = JSON.parse(sessionData);
                }
            } catch (error) {
                console.error('Error parsing session:', error);
            }
        }
        return this.currentUser;
    }

    static async _hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    static async createUser(username, password, role = 'cashier') {
        const users = await DB.getAll('users');
        if (users.find(u => u.username === username)) {
            throw new Error('این نام کاربری قبلاً استفاده شده است');
        }

        const hashedPassword = await this._hashPassword(password);
        const newUser = {
            id: 'user-' + Date.now(),
            username: username,
            passwordHash: hashedPassword,
            role: role,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        
        await DB.add('users', newUser);
        return newUser;
    }

    static async deleteUser(userId) {
        const user = await DB.getById('users', userId);
        if (user && user.role === 'admin') {
            const admins = (await DB.getAll('users')).filter(u => u.role === 'admin');
            if (admins.length <= 1) {
                throw new Error('حداقل یک مدیر باید وجود داشته باشد');
            }
        }
        await DB.delete('users', userId);
    }
}