// settings.js - Settings Page with User Management (Complete)
class SettingsPage {
    static async init() {
        console.log('🔧 SettingsPage init');
        await this.loadSettings();
        this.loadUsers();
        this.setupForm();
        this.setupGitHub();
        this.setupBackup();
        this.setupUserManagement();
    }

    // ==================== LOAD SETTINGS ====================
    static async loadSettings() {
        let settings = {};
        try { settings = await DB.getSettings(); } catch (e) {}
        
        this.setField('cafe-name', settings.cafeName || 'ARA Coffee');
        this.setField('cafe-address', settings.address || '');
        this.setField('cafe-phone', settings.phone || '');
        this.setField('cafe-instagram', settings.instagram || '');
        this.setField('cafe-website', settings.website || '');
        this.setField('currency', settings.currency || 'تومان');
        this.setField('tax-rate', settings.taxRate || 10);
        this.setField('discount-percent-setting', settings.discountPercent || 0);
        this.setField('printer-type', settings.printerType || '58mm');
        this.setField('github-owner', localStorage.getItem('ara_github_owner') || 'alikarami28');
        this.setField('github-repo', localStorage.getItem('ara_github_repo') || 'ARA-Coffee-POS');
        this.setField('github-branch', localStorage.getItem('ara_github_branch') || 'main');
        this.setField('github-token', localStorage.getItem('ara_github_token') || '');
    }

    static setField(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    // ==================== USER MANAGEMENT ====================
    static loadUsers() {
        const users = JSON.parse(localStorage.getItem('ara_users') || '[]');
        const container = document.getElementById('users-list-settings');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:12px;">هیچ کاربری یافت نشد</p>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg-secondary);border-radius:8px;margin-bottom:6px;border:1px solid var(--glass-border);">
                <div>
                    <strong>${user.username}</strong>
                    <span style="font-size:0.75rem;color:var(--text-light);margin-right:8px;">
                        ${user.role === 'admin' ? '👑 مدیر' : '💼 صندوق‌دار'}
                    </span>
                </div>
                <div style="display:flex;gap:6px;">
                    <button type="button" class="btn-sm" onclick="SettingsPage.editUser('${user.id}')" 
                            style="background:#2196F3;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:0.75rem;">
                        ✏️ رمز
                    </button>
                    ${user.role !== 'admin' || users.filter(u => u.role === 'admin').length > 1 ? 
                        `<button type="button" class="btn-sm" onclick="SettingsPage.deleteUser('${user.id}')" 
                                style="background:#f44336;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:0.75rem;">
                            🗑️
                        </button>` : ''}
                </div>
            </div>
        `).join('');
    }

    static setupUserManagement() {
        document.getElementById('add-user-btn-settings')?.addEventListener('click', async () => {
            const username = document.getElementById('new-username').value.trim();
            const password = document.getElementById('new-password').value;
            const role = document.getElementById('new-role').value;

            if (!username) { UI.showToast('error', 'نام کاربری را وارد کنید'); return; }
            if (username.length < 3) { UI.showToast('error', 'نام کاربری حداقل ۳ کاراکتر'); return; }
            if (!password || password.length < 4) { UI.showToast('error', 'رمز عبور حداقل ۴ کاراکتر'); return; }

            try {
                await AuthManager.createUser(username, password, role);
                document.getElementById('new-username').value = '';
                document.getElementById('new-password').value = '';
                this.loadUsers();
                UI.showToast('success', '✅ کاربر جدید اضافه و در GitHub ذخیره شد');
            } catch (e) {
                UI.showToast('error', e.message);
            }
        });
    }

    static async editUser(userId) {
        const users = JSON.parse(localStorage.getItem('ara_users') || '[]');
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const newPassword = prompt(`ویرایش رمز عبور: ${user.username}\n\nرمز عبور جدید (خالی = بدون تغییر):`);
        if (newPassword === null) return;

        if (newPassword && newPassword.length < 4) {
            UI.showToast('error', 'رمز عبور حداقل ۴ کاراکتر');
            return;
        }

        try {
            await AuthManager.updateUser(userId, { password: newPassword || undefined });
            this.loadUsers();
            UI.showToast('success', '✅ رمز عبور بروزرسانی و در GitHub ذخیره شد');
        } catch (e) {
            UI.showToast('error', e.message);
        }
    }

    static async deleteUser(userId) {
        const users = JSON.parse(localStorage.getItem('ara_users') || '[]');
        const user = users.find(u => u.id === userId);
        if (!user) return;

        if (!confirm(`آیا از حذف کاربر "${user.username}" اطمینان دارید؟`)) return;

        try {
            await AuthManager.deleteUser(userId);
            this.loadUsers();
            UI.showToast('success', '🗑️ کاربر حذف شد');
        } catch (e) {
            UI.showToast('error', e.message);
        }
    }

    // ==================== SAVE SETTINGS ====================
    static setupForm() {
        document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSettings();
        });
    }

    static async saveSettings() {
        // Get current settings from GitHub first (to preserve users)
        let currentSettings = {};
        try {
            currentSettings = await DB.getSettings();
        } catch (e) {
            currentSettings = {};
        }

        // Preserve existing users from localStorage AND GitHub
        const githubUsers = currentSettings.users || [];
        const localUsers = JSON.parse(localStorage.getItem('ara_users') || '[]');
        
        // Merge users (GitHub priority, but keep all)
        const allUsers = [...githubUsers];
        localUsers.forEach(localUser => {
            if (!allUsers.find(u => u.id === localUser.id)) {
                allUsers.push(localUser);
            }
        });

        const settings = {
            cafeName: document.getElementById('cafe-name')?.value?.trim() || 'ARA Coffee',
            address: document.getElementById('cafe-address')?.value?.trim() || '',
            phone: document.getElementById('cafe-phone')?.value?.trim() || '',
            instagram: document.getElementById('cafe-instagram')?.value?.trim() || '',
            website: document.getElementById('cafe-website')?.value?.trim() || '',
            currency: document.getElementById('currency')?.value || 'تومان',
            taxRate: parseFloat(document.getElementById('tax-rate')?.value) || 10,
            discountPercent: parseFloat(document.getElementById('discount-percent-setting')?.value) || 0,
            printerType: document.getElementById('printer-type')?.value || '58mm',
            theme: document.documentElement.getAttribute('data-theme') || 'light',
            users: allUsers
        };

        // Save GitHub config
        const ghOwner = document.getElementById('github-owner')?.value?.trim();
        const ghRepo = document.getElementById('github-repo')?.value?.trim();
        const ghBranch = document.getElementById('github-branch')?.value?.trim();
        const ghToken = document.getElementById('github-token')?.value?.trim();

        if (ghOwner) localStorage.setItem('ara_github_owner', ghOwner);
        if (ghRepo) localStorage.setItem('ara_github_repo', ghRepo);
        if (ghBranch) localStorage.setItem('ara_github_branch', ghBranch);
        if (ghToken) localStorage.setItem('ara_github_token', ghToken);

        // Save settings to localStorage (except users)
        Object.entries(settings).forEach(([key, value]) => {
            if (key !== 'users') {
                localStorage.setItem('ara_' + key, JSON.stringify(value));
            }
        });

        console.log('💾 Saving settings with', settings.users?.length || 0, 'users');

        // Save to GitHub
        UI.showToast('info', '⏳ در حال ذخیره در GitHub...');
        const result = await DB.saveSettings(settings);

        if (result && result.success) {
            UI.showToast('success', '✅ تنظیمات و کاربران در GitHub ذخیره شد');
        } else {
            UI.showToast('warning', '⚠️ فقط در مرورگر ذخیره شد. ' + (result?.message || ''));
        }
    }

    // ==================== GITHUB ====================
    static setupGitHub() {
        document.getElementById('btn-test-github')?.addEventListener('click', async () => {
            const token = document.getElementById('github-token')?.value?.trim();
            if (!token) { UI.showToast('warning', 'توکن را وارد کنید'); return; }
            localStorage.setItem('ara_github_token', token);
            const result = await DB.testConnection();
            if (result.success) UI.showToast('success', result.message);
            else UI.showToast('error', result.message);
        });

        document.getElementById('btn-sync-github')?.addEventListener('click', async () => {
            if (!confirm('اطلاعات GitHub با اطلاعات فعلی جایگزین می‌شود. ادامه؟')) return;
            UI.showToast('info', '⏳ همگام‌سازی...');
            try {
                const [p, c, o] = await Promise.all([DB.getProducts(), DB.getCategories(), DB.getOrders()]);
                await DB.saveProducts(p);
                await DB.saveCategories(c);
                await DB.saveOrders(o);
                UI.showToast('success', '✅ همگام‌سازی شد');
            } catch (e) {
                UI.showToast('error', '❌ ' + e.message);
            }
        });
    }

    // ==================== BACKUP ====================
    static setupBackup() {
        document.getElementById('btn-export-backup')?.addEventListener('click', async () => {
            const [p, c, o] = await Promise.all([DB.getProducts(), DB.getCategories(), DB.getOrders()]);
            const u = JSON.parse(localStorage.getItem('ara_users') || '[]');
            const backup = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                products: p,
                categories: c,
                orders: o,
                users: u
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'ARA_Backup_' + new Date().toISOString().slice(0, 10) + '.json';
            a.click();
            UI.showToast('success', '✅ بکاپ دانلود شد');
        });

        document.getElementById('btn-import-backup')?.addEventListener('click', () => {
            document.getElementById('import-file')?.click();
        });

        document.getElementById('import-file')?.addEventListener('change', async (e) => {
            if (!e.target.files[0]) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!confirm('⚠️ اطلاعات جایگزین می‌شود. ادامه؟')) return;
                    if (data.products) await DB.saveProducts(data.products);
                    if (data.categories) await DB.saveCategories(data.categories);
                    if (data.orders) await DB.saveOrders(data.orders);
                    if (data.users) {
                        localStorage.setItem('ara_users', JSON.stringify(data.users));
                        await AuthManager._saveUsers(data.users);
                    }
                    UI.showToast('success', '✅ بازیابی شد');
                    setTimeout(() => location.reload(), 2000);
                } catch (err) {
                    UI.showToast('error', '❌ فایل نامعتبر');
                }
            };
            reader.readAsText(e.target.files[0]);
        });
    }
}
