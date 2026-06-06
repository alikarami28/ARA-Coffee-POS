// settings.js - Settings Page Logic
class SettingsPage {
    static init() {
        console.log('🔧 SettingsPage init');
        this.loadSettings();
        document.getElementById('settings-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
        document.getElementById('btn-export-backup')?.addEventListener('click', () => {
            if (typeof BackupManager !== 'undefined') BackupManager.exportAllData();
        });
        document.getElementById('btn-import-backup')?.addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file')?.addEventListener('change', (e) => {
            if (e.target.files[0] && typeof BackupManager !== 'undefined') {
                BackupManager.handleFileImport(e.target.files[0]);
            }
        });
    }

    static loadSettings() {
        const s = SettingsManager.getAll();
        document.getElementById('cafe-name').value = s.cafeName || 'ARA Coffee';
        document.getElementById('cafe-address').value = s.address || '';
        document.getElementById('cafe-phone').value = s.phone || '';
        document.getElementById('currency').value = s.currency || 'تومان';
        document.getElementById('tax-rate').value = s.taxRate || 9;
        document.getElementById('printer-type').value = s.printerType || '58mm';
    }

    static saveSettings() {
        SettingsManager.set('cafeName', document.getElementById('cafe-name').value);
        SettingsManager.set('address', document.getElementById('cafe-address').value);
        SettingsManager.set('phone', document.getElementById('cafe-phone').value);
        SettingsManager.set('currency', document.getElementById('currency').value);
        SettingsManager.set('taxRate', parseFloat(document.getElementById('tax-rate').value) || 9);
        SettingsManager.set('printerType', document.getElementById('printer-type').value);
        UI.showToast('success', '✅ تنظیمات ذخیره شد');
    }
}