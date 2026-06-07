// settings.js - Settings Page Logic (Complete)
class SettingsPage {
    static async init() {
        console.log('🔧 SettingsPage init');
        
        await this.loadSettings();
        this.setupForm();
        this.setupGitHub();
        this.setupBackup();
        
        console.log('✅ SettingsPage ready');
    }

    // ==================== LOAD SETTINGS ====================
    
    static async loadSettings() {
        let settings = {};
        
        // Try loading from GitHub
        try {
            settings = await DB.getSettings();
            console.log('📦 Settings loaded from GitHub');
        } catch (e) {
            console.warn('Could not load from GitHub, using localStorage');
        }
        
        // Fallback to localStorage
        if (!settings || !settings.cafeName) {
            settings = {
                cafeName: localStorage.getItem('ara_cafeName')?.replace(/"/g, '') || 'ARA Coffee',
                address: localStorage.getItem('ara_address')?.replace(/"/g, '') || '',
                phone: localStorage.getItem('ara_phone')?.replace(/"/g, '') || '',
                instagram: localStorage.getItem('ara_instagram')?.replace(/"/g, '') || '',
                website: localStorage.getItem('ara_website')?.replace(/"/g, '') || '',
                currency: localStorage.getItem('ara_currency')?.replace(/"/g, '') || 'تومان',
                taxRate: parseFloat(localStorage.getItem('ara_taxRate')) || 9,
                printerType: localStorage.getItem('ara_printerType')?.replace(/"/g, '') || '58mm'
            };
        }

        // Fill form fields
        this.setFieldValue('cafe-name', settings.cafeName || 'ARA Coffee');
        this.setFieldValue('cafe-address', settings.address || '');
        this.setFieldValue('cafe-phone', settings.phone || '');
        this.setFieldValue('cafe-instagram', settings.instagram || '');
        this.setFieldValue('cafe-website', settings.website || '');
        this.setFieldValue('currency', settings.currency || 'تومان');
        this.setFieldValue('tax-rate', settings.taxRate || 9);
        this.setFieldValue('printer-type', settings.printerType || '58mm');
        
        // GitHub fields
        this.setFieldValue('github-owner', localStorage.getItem('ara_github_owner') || 'alikarami28');
        this.setFieldValue('github-repo', localStorage.getItem('ara_github_repo') || 'ARA-Coffee-POS');
        this.setFieldValue('github-branch', localStorage.getItem('ara_github_branch') || 'main');
        this.setFieldValue('github-token', localStorage.getItem('ara_github_token') || '');
    }

    static setFieldValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    // ==================== SETUP FORM ====================
    
    static setupForm() {
        const form = document.getElementById('settings-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSettings();
        });
    }

    static async saveSettings() {
        // Get all values
        const settings = {
            cafeName: document.getElementById('cafe-name')?.value?.trim() || 'ARA Coffee',
            address: document.getElementById('cafe-address')?.value?.trim() || '',
            phone: document.getElementById('cafe-phone')?.value?.trim() || '',
            instagram: document.getElementById('cafe-instagram')?.value?.trim() || '',
            website: document.getElementById('cafe-website')?.value?.trim() || '',
            currency: document.getElementById('currency')?.value || 'تومان',
            taxRate: parseFloat(document.getElementById('tax-rate')?.value) || 9,
            printerType: document.getElementById('printer-type')?.value || '58mm',
            theme: document.documentElement.getAttribute('data-theme') || 'light'
        };

        // Save GitHub config to localStorage
        const githubOwner = document.getElementById('github-owner')?.value?.trim();
        const githubRepo = document.getElementById('github-repo')?.value?.trim();
        const githubBranch = document.getElementById('github-branch')?.value?.trim();
        const githubToken = document.getElementById('github-token')?.value?.trim();

        if (githubOwner) localStorage.setItem('ara_github_owner', githubOwner);
        if (githubRepo) localStorage.setItem('ara_github_repo', githubRepo);
        if (githubBranch) localStorage.setItem('ara_github_branch', githubBranch);
        if (githubToken) localStorage.setItem('ara_github_token', githubToken);

        // Save all settings to localStorage immediately
        Object.entries(settings).forEach(([key, value]) => {
            localStorage.setItem('ara_' + key, JSON.stringify(value));
        });

        console.log('💾 Settings saved to localStorage');

        // Try saving to GitHub
        UI.showToast('info', '⏳ در حال ذخیره در GitHub...');
        
        const result = await DB.saveSettings(settings);
        
        if (result && result.success) {
            UI.showToast('success', '✅ تنظیمات در GitHub ذخیره شد');
        } else {
            const msg = result?.message || 'خطای ناشناخته';
            UI.showToast('warning', '⚠️ تنظیمات فقط در مرورگر ذخیره شد. ' + msg);
        }
    }

    // ==================== GITHUB ====================
    
    static setupGitHub() {
        // Test connection button
        document.getElementById('btn-test-github')?.addEventListener('click', async () => {
            const token = document.getElementById('github-token')?.value?.trim();
            
            if (!token) {
                UI.showToast('warning', 'لطفاً توکن را وارد کنید');
                return;
            }

            // Save token temporarily
            localStorage.setItem('ara_github_token', token);

            UI.showToast('info', '⏳ در حال تست اتصال...');
            
            const result = await DB.testConnection();
            
            if (result.success) {
                UI.showToast('success', result.message || '✅ اتصال برقرار شد');
            } else {
                UI.showToast('error', result.message || '❌ خطا در اتصال');
            }
        });

        // Sync button
        document.getElementById('btn-sync-github')?.addEventListener('click', async () => {
            if (!confirm('اطلاعات فعلی در GitHub با اطلاعات مرورگر جایگزین می‌شود. ادامه می‌دهید؟')) return;

            UI.showToast('info', '⏳ در حال همگام‌سازی...');

            try {
                const products = await DB.getProducts();
                const categories = await DB.getCategories();
                const orders = await DB.getOrders();
                const settings = {
                    cafeName: document.getElementById('cafe-name')?.value?.trim() || 'ARA Coffee',
                    address: document.getElementById('cafe-address')?.value?.trim() || '',
                    phone: document.getElementById('cafe-phone')?.value?.trim() || '',
                    instagram: document.getElementById('cafe-instagram')?.value?.trim() || '',
                    website: document.getElementById('cafe-website')?.value?.trim() || '',
                    currency: document.getElementById('currency')?.value || 'تومان',
                    taxRate: parseFloat(document.getElementById('tax-rate')?.value) || 9,
                    printerType: document.getElementById('printer-type')?.value || '58mm',
                    theme: document.documentElement.getAttribute('data-theme') || 'light'
                };

                const results = await Promise.all([
                    DB.saveProducts(products),
                    DB.saveCategories(categories),
                    DB.saveOrders(orders),
                    DB.saveSettings(settings)
                ]);

                const allSuccess = results.every(r => r && r.success);
                
                if (allSuccess) {
                    UI.showToast('success', '✅ همگام‌سازی کامل شد');
                } else {
                    UI.showToast('warning', '⚠️ برخی موارد ذخیره نشدند');
                }
            } catch (error) {
                UI.showToast('error', '❌ خطا: ' + error.message);
            }
        });
    }

    // ==================== BACKUP ====================
    
    static setupBackup() {
        document.getElementById('btn-export-backup')?.addEventListener('click', () => {
            this.exportBackup();
        });

        document.getElementById('btn-import-backup')?.addEventListener('click', () => {
            document.getElementById('import-file')?.click();
        });

        document.getElementById('import-file')?.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importBackup(e.target.files[0]);
            }
        });
    }

    static async exportBackup() {
        try {
            const [products, categories, orders] = await Promise.all([
                DB.getProducts(),
                DB.getCategories(),
                DB.getOrders()
            ]);

            const settings = {
                cafeName: document.getElementById('cafe-name')?.value?.trim() || 'ARA Coffee',
                address: document.getElementById('cafe-address')?.value?.trim() || '',
                phone: document.getElementById('cafe-phone')?.value?.trim() || '',
                instagram: document.getElementById('cafe-instagram')?.value?.trim() || '',
                website: document.getElementById('cafe-website')?.value?.trim() || '',
                currency: document.getElementById('currency')?.value || 'تومان',
                taxRate: parseFloat(document.getElementById('tax-rate')?.value) || 9,
                printerType: document.getElementById('printer-type')?.value || '58mm'
            };

            const backup = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                products,
                categories,
                orders,
                settings
            };

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ARA_Backup_' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            UI.showToast('success', '✅ بکاپ دانلود شد');
        } catch (error) {
            UI.showToast('error', '❌ خطا در تهیه بکاپ');
        }
    }

    static async importBackup(file) {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!data.products || !data.categories) {
                    UI.showToast('error', '❌ فایل بکاپ نامعتبر است');
                    return;
                }

                if (!confirm('⚠️ هشدار: تمام اطلاعات فعلی با فایل بکاپ جایگزین می‌شود. ادامه می‌دهید؟')) {
                    return;
                }

                UI.showToast('info', '⏳ در حال بازیابی...');

                await DB.saveProducts(data.products);
                await DB.saveCategories(data.categories);
                if (data.orders) await DB.saveOrders(data.orders);
                if (data.settings) await DB.saveSettings(data.settings);

                UI.showToast('success', '✅ بکاپ با موفقیت بازیابی شد');
                
                setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
                UI.showToast('error', '❌ خطا در خواندن فایل');
            }
        };
        
        reader.readAsText(file);
    }
}