// settings.js - Settings Page Logic (Complete with Discount)
class SettingsPage {
    static async init() {
        console.log('🔧 SettingsPage init');
        await this.loadSettings();
        this.setupForm();
        this.setupGitHub();
        this.setupBackup();
    }

    static async loadSettings() {
        let settings = {};
        
        try {
            settings = await DB.getSettings();
            console.log('📦 Settings from GitHub');
        } catch (e) {
            console.warn('Could not load from GitHub');
        }

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

    static setupForm() {
        document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSettings();
        });
    }

    static async saveSettings() {
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
            theme: document.documentElement.getAttribute('data-theme') || 'light'
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

        // Save all settings to localStorage immediately
        Object.entries(settings).forEach(([key, value]) => {
            localStorage.setItem('ara_' + key, JSON.stringify(value));
        });

        console.log('💾 Settings saved to localStorage:', settings);

        // Try saving to GitHub
        UI.showToast('info', '⏳ در حال ذخیره در GitHub...');
        
        const result = await DB.saveSettings(settings);
        
        if (result && result.success) {
            UI.showToast('success', '✅ تنظیمات در GitHub ذخیره شد');
        } else {
            UI.showToast('warning', '⚠️ تنظیمات فقط در مرورگر ذخیره شد. ' + (result?.message || ''));
        }
    }

    static setupGitHub() {
        document.getElementById('btn-test-github')?.addEventListener('click', async () => {
            const token = document.getElementById('github-token')?.value?.trim();
            if (!token) { UI.showToast('warning', 'توکن را وارد کنید'); return; }
            localStorage.setItem('ara_github_token', token);
            UI.showToast('info', '⏳ تست اتصال...');
            const result = await DB.testConnection();
            if (result.success) UI.showToast('success', result.message);
            else UI.showToast('error', result.message);
        });

        document.getElementById('btn-sync-github')?.addEventListener('click', async () => {
            if (!confirm('اطلاعات GitHub با اطلاعات فعلی جایگزین می‌شود. ادامه؟')) return;
            UI.showToast('info', '⏳ همگام‌سازی...');
            try {
                const [products, categories, orders] = await Promise.all([
                    DB.getProducts(), DB.getCategories(), DB.getOrders()
                ]);
                await DB.saveProducts(products);
                await DB.saveCategories(categories);
                await DB.saveOrders(orders);
                UI.showToast('success', '✅ همگام‌سازی شد');
            } catch (e) {
                UI.showToast('error', '❌ ' + e.message);
            }
        });
    }

    static setupBackup() {
        document.getElementById('btn-export-backup')?.addEventListener('click', async () => {
            const [products, categories, orders] = await Promise.all([
                DB.getProducts(), DB.getCategories(), DB.getOrders()
            ]);
            const backup = { version: '1.0', exportDate: new Date().toISOString(), products, categories, orders };
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
