// settings.js - Settings Page with GitHub Support
class SettingsPage {
    static async init() {
        console.log('🔧 SettingsPage init');
        
        await this.loadSettings();
        this.setupForm();
        this.setupGitHub();
        this.setupBackup();
    }

    // ==================== LOAD SETTINGS ====================
    
    static async loadSettings() {
        let settings;
        try {
            settings = await DB.getSettings();
            console.log('✅ Settings loaded from GitHub');
        } catch (e) {
            settings = DB._localGet('settings') || {};
            console.log('📦 Settings loaded from localStorage');
        }

        document.getElementById('cafe-name').value = settings.cafeName || 'ARA Coffee';
        document.getElementById('cafe-address').value = settings.address || '';
        document.getElementById('cafe-phone').value = settings.phone || '';
        document.getElementById('cafe-instagram').value = settings.instagram || '';
        document.getElementById('cafe-website').value = settings.website || '';
        document.getElementById('currency').value = settings.currency || 'تومان';
        document.getElementById('tax-rate').value = settings.taxRate || 9;
        document.getElementById('printer-type').value = settings.printerType || '58mm';
        document.getElementById('github-token').value = localStorage.getItem('ara_github_token') || '';
        document.getElementById('webapp-url').value = localStorage.getItem('ara_webapp_url') || '';
    }

    // ==================== SETUP FORM ====================
    
    static setupForm() {
        document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSettings();
        });
    }

    static async saveSettings() {
        const settings = {
            cafeName: document.getElementById('cafe-name').value.trim() || 'ARA Coffee',
            address: document.getElementById('cafe-address').value.trim(),
            phone: document.getElementById('cafe-phone').value.trim(),
            instagram: document.getElementById('cafe-instagram').value.trim(),
            website: document.getElementById('cafe-website').value.trim(),
            currency: document.getElementById('currency').value,
            taxRate: parseFloat(document.getElementById('tax-rate').value) || 9,
            printerType: document.getElementById('printer-type').value,
            theme: localStorage.getItem('ara_theme') || 'light'
        };

        // Save GitHub token
        const token = document.getElementById('github-token').value.trim();
        if (token) localStorage.setItem('ara_github_token', token);

        // Save WebApp URL
        const webappUrl = document.getElementById('webapp-url').value.trim();
        if (webappUrl) localStorage.setItem('ara_webapp_url', webappUrl);

        // Save to GitHub
        UI.showToast('info', '⏳ در حال ذخیره...');
        const result = await DB.saveSettings(settings);

        if (result.success) {
            UI.showToast('success', '✅ تنظیمات در GitHub ذخیره شد');
        } else {
            UI.showToast('warning', '⚠️ فقط در localStorage ذخیره شد. توکن GitHub را بررسی کنید.');
        }
    }

    // ==================== GITHUB ====================
    
    static setupGitHub() {
        document.getElementById('btn-test-github')?.addEventListener('click', async () => {
            const token = document.getElementById('github-token').value.trim();
            if (!token) {
                UI.showToast('warning', 'لطفاً توکن را وارد کنید');
                return;
            }

            localStorage.setItem('ara_github_token', token);
            UI.showToast('info', '⏳ در حال تست اتصال...');
            
            const result = await DB.testConnection();
            
            if (result.success) {
                UI.showToast('success', `✅ اتصال موفق!\nمخزن: ${result.repo}\nآخرین بروزرسانی: ${new Date(result.lastPush).toLocaleString('fa-IR')}`);
            } else {
                UI.showToast('error', `❌ ${result.message}`);
            }
        });

        document.getElementById('btn-sync-github')?.addEventListener('click', async () => {
            if (!confirm('اطلاعات فعلی در GitHub جایگزین می‌شود. ادامه می‌دهید؟')) return;
            
            UI.showToast('info', '⏳ در حال همگام‌سازی...');
            
            try {
                const [products, categories, orders, settings] = await Promise.all([
                    DB.getProducts(),
                    DB.getCategories(),
                    DB.getOrders(),
                    DB.getSettings()
                ]);

                await DB.saveProducts(products);
                await DB.saveCategories(categories);
                await DB.saveOrders(orders);
                await DB.saveSettings(settings);

                UI.showToast('success', '✅ همگام‌سازی کامل شد');
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
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file')?.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importBackup(e.target.files[0]);
            }
        });
    }

    static async exportBackup() {
        try {
            const [products, categories, orders, settings] = await Promise.all([
                DB.getProducts(),
                DB.getCategories(),
                DB.getOrders(),
                DB.getSettings()
            ]);

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
            a.download = `ARA_Backup_${new Date().toISOString().slice(0, 10)}.json`;
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