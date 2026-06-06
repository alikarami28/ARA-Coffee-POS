// github.js - GitHub Sync Integration
class GitHubSync {
    static async testConnection() {
        const repo = SettingsManager.get('githubRepo');
        const token = SettingsManager.get('githubToken');
        
        if (!repo || !token) {
            UI.showToast('warning', 'لطفاً آدرس مخزن و توکن را وارد کنید');
            return false;
        }

        try {
            const [owner, repoName] = this._parseRepoUrl(repo);
            const apiUrl = `https://api.github.com/repos/${owner}/${repoName}`;
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                UI.showToast('success', 'اتصال به GitHub با موفقیت برقرار شد ✅');
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.message || 'خطای احراز هویت');
            }
        } catch (error) {
            UI.showToast('error', `خطا در اتصال: ${error.message}`);
            return false;
        }
    }

    static async syncToGitHub() {
        const repo = SettingsManager.get('githubRepo');
        const token = SettingsManager.get('githubToken');
        
        if (!repo || !token) {
            UI.showToast('warning', 'تنظیمات GitHub را تکمیل کنید');
            return;
        }

        try {
            UI.showToast('info', 'در حال همگام‌سازی با GitHub...');
            
            const backupData = await BackupManager.exportAllData();
            const [owner, repoName] = this._parseRepoUrl(repo);
            const fileName = `ARA_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            const path = `backups/${fileName}`;

            // Check if file exists
            const checkUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${path}`;
            let sha = null;
            
            try {
                const checkResponse = await fetch(checkUrl, {
                    headers: { 'Authorization': `token ${token}` }
                });
                if (checkResponse.ok) {
                    const fileData = await checkResponse.json();
                    sha = fileData.sha;
                }
            } catch (e) {
                // File doesn't exist, which is fine
            }

            // Upload file
            const content = btoa(unescape(encodeURIComponent(backupData)));
            const body = {
                message: `Backup: ${new Date().toLocaleString('fa-IR')}`,
                content: content,
                branch: 'main'
            };
            
            if (sha) body.sha = sha;

            const response = await fetch(checkUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                UI.showToast('success', 'همگام‌سازی با GitHub انجام شد 🚀');
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error) {
            UI.showToast('error', `خطا در همگام‌سازی: ${error.message}`);
        }
    }

    static async restoreFromGitHub() {
        const repo = SettingsManager.get('githubRepo');
        const token = SettingsManager.get('githubToken');
        
        if (!repo || !token) {
            UI.showToast('warning', 'تنظیمات GitHub را تکمیل کنید');
            return;
        }

        try {
            const [owner, repoName] = this._parseRepoUrl(repo);
            const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/backups`;
            
            const response = await fetch(apiUrl, {
                headers: { 'Authorization': `token ${token}` }
            });

            if (!response.ok) throw new Error('خطا در دریافت لیست بکاپ‌ها');

            const files = await response.json();
            if (files.length === 0) {
                UI.showToast('warning', 'هیچ فایل بکاپی یافت نشد');
                return;
            }

            // Get latest backup
            const latestFile = files[files.length - 1];
            const fileResponse = await fetch(latestFile.download_url);
            const backupData = await fileResponse.text();
            
            await BackupManager.importData(backupData);
            
        } catch (error) {
            UI.showToast('error', `خطا در بازیابی: ${error.message}`);
        }
    }

    static _parseRepoUrl(url) {
        // Parse GitHub URL: https://github.com/owner/repo or owner/repo
        const cleaned = url.replace('https://github.com/', '').replace('.git', '');
        const parts = cleaned.split('/');
        if (parts.length < 2) throw new Error('آدرس مخزن نامعتبر است');
        return [parts[0], parts[1]];
    }
}