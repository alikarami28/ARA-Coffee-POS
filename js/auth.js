// auth.js - Secure Authentication System
// Version: 2.0 - GitHub-based credentials with SHA-256 hashing

class AuthManager {
    static currentUser = null;
    static sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours

    static async initLoginForm() {
        // Check if already logged in
        if (this.isLoggedIn()) {
            window.location.href = '/index.html';
            return;
        }

        // Ensure default admin exists
        await this.ensureDefaultAdmin();

        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('login-error');
            
            // Hide previous error
            errorEl.style.display = 'none';
            
            // Validate
            if (!username) {
                this._showError('لطفاً نام کاربری را وارد کنید');
                return;
            }
            if (!password) {
                this._showError('لطفاً رمز عبور را وارد کنید');
                return;
            }

            // Show loading
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '⏳ در حال ورود...';
            submitBtn.disabled = true;

            try {
                await this.login(username, password);
                
                // Success
                submitBtn.textContent = '✅ ورود موفق!';
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 500);
                
            } catch (error) {
                this._showError(error.message);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                
                // Shake animation
                form.style.animation = 'none';
                form.offsetHeight;
                form.style.animation = 'shake 0.5s ease';
            }
        });

        // Handle Enter key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
                form.dispatchEvent(new Event('submit'));
            }
        });
    }

    // ==================== ENSURE DEFAULT ADMIN ====================
    static async ensureDefaultAdmin() {
        try {
            const users = await this._getUsers();
            
            if (users.length === 0) {
                console.log('🔧 Creating default admin user...');
                
                // رمز عبور پیش‌فرض: admin123
                const hashedPassword = await this._hashPassword('admin123');
                
                const defaultAdmin = {
                    id: 'user-admin-default',
                    username: 'admin',
                    passwordHash: hashedPassword,
                    role: 'admin',
                    isActive: true,
                    createdAt: new Date().toISOString()
                };
                
                await this._saveUsers([defaultAdmin]);
                console.log('✅ Default admin created');
            }
        } catch (error) {
            console.error('Error ensuring default admin:', error);
        }
    }

    // ==================== LOGIN ====================
    static async login(username, password) {
        const users = await this._getUsers();
        
        // Find user
        const user = users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.isActive
        );
        
        if (!user) {
            throw new Error('❌ نام کاربری یا رمز عبور اشتباه است');
        }

        // Hash password and compare
        const hashedPassword = await this._hashPassword(password);
        
        if (hashedPassword !== user.passwordHash) {
            // Add delay to prevent brute force
            await new Promise(resolve => setTimeout(resolve, 1000));
            throw new Error('❌ نام کاربری یا رمز عبور اشتباه است');
        }

        // Login successful
        this.currentUser = {
            id: user.id,
            username: user.username,
            role: user.role
        };
        
        // Create session
        const sessionData = {
            userId: user.id,
            username: user.username,
            role: user.role,
            loginTime: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.sessionTimeout).toISOString()
        };
        
        localStorage.setItem('ara_session', JSON.stringify(sessionData));
        
        console.log('✅ Login successful:', username);
        return this.currentUser;
    }

    // ==================== LOGOUT ====================
    static logout() {
        this.currentUser = null;
        localStorage.removeItem('ara_session');
        window.location.href = '/login.html';
    }

    // ==================== CHECK LOGIN ====================
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

    // ==================== GET CURRENT USER ====================
    static getCurrentUser() {
        if (!this.currentUser) {
            try {
                const sessionData = localStorage.getItem('ara_session');
                if (sessionData) {
                    this.currentUser = JSON.parse(sessionData);
                }
            } catch (error) {
                this.currentUser = null;
            }
        }
        return this.currentUser;
    }

    // ==================== HASH PASSWORD (SHA-256) ====================
    static async _hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'ARA_Coffee_Salt_2026'); // Salt for extra security
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ==================== USER CRUD ====================
    static async _getUsers() {
        try {
            // Try loading from settings.json in GitHub
            const settings = await DB.getSettings();
            if (settings && settings.users && Array.isArray(settings.users)) {
                return settings.users;
            }
        } catch (e) {
            console.warn('Could not load users from GitHub');
        }
        
        // Fallback to localStorage
        try {
            const local = localStorage.getItem('ara_users');
            return local ? JSON.parse(local) : [];
        } catch (e) {
            return [];
        }
    }

    static async _saveUsers(users) {
        // Save to localStorage first
        localStorage.setItem('ara_users', JSON.stringify(users));
        
        // Try saving to GitHub
        try {
            const settings = await DB.getSettings();
            settings.users = users;
            await DB.saveSettings(settings);
            console.log('✅ Users saved to GitHub');
        } catch (e) {
            console.warn('Users saved to localStorage only');
        }
    }

    static async createUser(username, password, role = 'cashier') {
        const users = await this._getUsers();
        
        // Check if username exists
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            throw new Error('این نام کاربری قبلاً استفاده شده است');
        }

        // Validate
        if (!username || username.length < 3) {
            throw new Error('نام کاربری باید حداقل ۳ کاراکتر باشد');
        }
        if (!password || password.length < 4) {
            throw new Error('رمز عبور باید حداقل ۴ کاراکتر باشد');
        }

        const hashedPassword = await this._hashPassword(password);
        
        const newUser = {
            id: 'user-' + Date.now(),
            username: username.trim(),
            passwordHash: hashedPassword,
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
        
        if (updates.username) {
            users[index].username = updates.username.trim();
        }
        if (updates.role) {
            users[index].role = updates.role;
        }
        if (updates.password) {
            users[index].passwordHash = await this._hashPassword(updates.password);
        }
        if (updates.isActive !== undefined) {
            users[index].isActive = updates.isActive;
        }
        
        await this._saveUsers(users);
        return users[index];
    }

    static async deleteUser(userId) {
        const users = await this._getUsers();
        const filtered = users.filter(u => u.id !== userId);
        await this._saveUsers(filtered);
    }

    // ==================== ERROR DISPLAY ====================
    static _showError(message) {
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }
}