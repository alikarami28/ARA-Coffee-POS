// backup.js - Backup, Restore & Excel Export (Full Implementation)
class BackupManager {
    static async exportAllData() {
        try {
            const data = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                products: await DB.getAll('products'),
                categories: await DB.getAll('categories'),
                orders: await DB.getAll('orders'),
                users: await DB.getAll('users'),
                settings: SettingsManager.getAll()
            };
            
            const jsonString = JSON.stringify(data, null, 2);
            this._downloadFile(
                jsonString,
                `ARA_Backup_${new Date().toISOString().slice(0, 10)}.json`,
                'application/json'
            );
            
            UI.showToast('success', 'بکاپ با موفقیت دانلود شد');
            return jsonString;
        } catch (error) {
            UI.showToast('error', `خطا در تهیه بکاپ: ${error.message}`);
            throw error;
        }
    }

    static async importData(jsonString) {
        try {
            const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
            
            // Validate backup structure
            if (!data.version) {
                throw new Error('فرمت فایل بکاپ نامعتبر است (نسخه یافت نشد)');
            }
            
            if (!data.products || !data.orders || !data.categories) {
                throw new Error('فرمت فایل بکاپ ناقص است');
            }

            // Confirm restoration
            if (!confirm('⚠️ هشدار: بازیابی بکاپ تمام اطلاعات فعلی را پاک می‌کند. ادامه می‌دهید؟')) {
                return;
            }

            // Clear existing data
            const stores = ['products', 'categories', 'orders', 'users'];
            for (const store of stores) {
                await DB._performTransaction(store, 'readwrite', storeObj => storeObj.clear());
            }

            // Restore data
            for (const product of data.products) {
                await DB.add('products', product);
            }
            
            for (const category of data.categories) {
                await DB.add('categories', category);
            }
            
            for (const order of data.orders) {
                await DB.add('orders', order);
            }
            
            if (data.users) {
                for (const user of data.users) {
                    await DB.add('users', user);
                }
            }

            // Restore settings
            if (data.settings) {
                Object.entries(data.settings).forEach(([key, value]) => {
                    SettingsManager.set(key, value);
                });
            }

            UI.showToast('success', 'بازیابی با موفقیت انجام شد. صفحه را مجدداً بارگذاری کنید.');
            setTimeout(() => window.location.reload(), 2500);
            
        } catch (error) {
            UI.showToast('error', `خطا در بازیابی: ${error.message}`);
            console.error('Import error:', error);
        }
    }

    static async exportSalesToExcel(startDate, endDate) {
        try {
            const orders = await DB.getOrdersByDateRange(
                new Date(startDate).toISOString(),
                new Date(endDate).toISOString()
            );

            if (orders.length === 0) {
                UI.showToast('warning', 'هیچ سفارشی در بازه زمانی انتخاب شده یافت نشد');
                return;
            }

            const workbook = XLSX.utils.book_new();
            
            // Orders sheet
            const ordersData = [
                ['شماره فاکتور', 'تاریخ', 'ساعت', 'محصولات', 'تعداد کل', 'جمع کل', 'مالیات', 'تخفیف', 'مبلغ نهایی', 'روش پرداخت'],
                ...orders.map(order => [
                    order.invoiceNumber,
                    new Date(order.createdAt).toLocaleDateString('fa-IR'),
                    new Date(order.createdAt).toLocaleTimeString('fa-IR'),
                    order.items.map(i => `${i.productName}(${i.quantity})`).join('، '),
                    order.items.reduce((sum, i) => sum + i.quantity, 0),
                    order.subtotal,
                    order.taxAmount,
                    order.discountAmount,
                    order.finalAmount,
                    order.paymentMethod === 'Card' ? 'کارت' : 'نقد'
                ])
            ];
            
            const wsOrders = XLSX.utils.aoa_to_sheet(ordersData);
            XLSX.utils.book_append_sheet(workbook, wsOrders, 'سفارشات');

            // Summary sheet
            const totalSales = orders.reduce((sum, o) => sum + o.finalAmount, 0);
            const totalOrders = orders.length;
            const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
            
            const summaryData = [
                ['خلاصه گزارش'],
                ['بازه زمانی', `${startDate} تا ${endDate}`],
                ['تعداد سفارشات', totalOrders],
                ['فروش کل', totalSales],
                ['میانگین فاکتور', Math.round(averageOrder)],
                ['تاریخ تهیه گزارش', new Date().toLocaleDateString('fa-IR')]
            ];
            
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, wsSummary, 'خلاصه');

            // Download
            XLSX.writeFile(workbook, `ARA_Sales_Report_${startDate}_to_${endDate}.xlsx`);
            UI.showToast('success', 'گزارش Excel با موفقیت دانلود شد');
            
        } catch (error) {
            UI.showToast('error', `خطا در تهیه گزارش: ${error.message}`);
            console.error('Excel export error:', error);
        }
    }

    static _downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    static async handleFileImport(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                await this.importData(e.target.result);
            } catch (error) {
                UI.showToast('error', 'خطا در خواندن فایل');
            }
        };
        reader.readAsText(file);
    }
}