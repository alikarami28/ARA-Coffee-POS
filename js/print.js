// print.js - Print Service (Complete)
class PrintService {
    static async printReceipt(order) {
        console.log('🖨️ Printing receipt for:', order.invoiceNumber);
        
        // Get cafe settings
        const cafeName = this._getSetting('cafeName', 'ARA Coffee');
        const address = this._getSetting('address', '');
        const phone = this._getSetting('phone', '');
        const currency = this._getSetting('currency', 'تومان');
        const printerType = this._getSetting('printerType', '58mm');

        const receiptHTML = this._generateReceiptHTML(order, cafeName, address, phone, currency, printerType);
        
        // Open print window
        this._openPrintWindow(receiptHTML, printerType);
    }

    static _getSetting(key, defaultValue) {
        try {
            const value = localStorage.getItem('ara_' + key);
            if (value) {
                const parsed = JSON.parse(value);
                return parsed || defaultValue;
            }
        } catch (e) {}
        return defaultValue;
    }

    static _generateReceiptHTML(order, cafeName, address, phone, currency, printerType) {
        const date = new Date(order.createdAt).toLocaleDateString('fa-IR');
        const time = new Date(order.createdAt).toLocaleTimeString('fa-IR');
        const width = printerType === '58mm' ? '58mm' : '80mm';
        const fontSize = printerType === '58mm' ? '10px' : '12px';
        const padding = printerType === '58mm' ? '3mm' : '5mm';

        const itemsHTML = order.items.map(item => `
            <tr>
                <td style="text-align:right;padding:2px 0;">${item.productName}</td>
                <td style="text-align:center;padding:2px 0;">${item.quantity}</td>
                <td style="text-align:center;padding:2px 0;">${this._formatNumber(item.unitPrice)}</td>
                <td style="text-align:left;padding:2px 0;">${this._formatNumber(item.totalPrice)}</td>
            </tr>
        `).join('');

        return `
<!DOCTYPE html>
<html dir="rtl">
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            margin: 0;
            size: ${width} auto;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Courier New', 'Tahoma', monospace;
            width: ${width};
            padding: ${padding};
            font-size: ${fontSize};
            color: #000;
            background: #fff;
            margin: 0 auto;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { 
            border-top: 1px dashed #000; 
            margin: 3mm 0; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 3mm 0; 
        }
        th { 
            border-bottom: 1px solid #000; 
            padding: 1mm 0; 
            text-align: center;
        }
        td { 
            padding: 1mm 0; 
        }
        .total-row { 
            font-size: 1.2em; 
            font-weight: bold; 
        }
        .footer { 
            margin-top: 5mm; 
            text-align: center; 
            font-style: italic; 
        }
    </style>
</head>
<body>
    <div class="center">
        <h2 style="margin:0;font-size:1.3em;">${cafeName} ☕</h2>
        ${address ? `<p style="margin:1mm 0;font-size:0.9em;">${address}</p>` : ''}
        ${phone ? `<p style="margin:1mm 0;font-size:0.9em;">📞 ${phone}</p>` : ''}
    </div>
    
    <div class="divider"></div>
    
    <div class="center">
        <p><strong>🧾 فاکتور شماره:</strong> ${order.invoiceNumber}</p>
        <p><strong>📅 تاریخ:</strong> ${date} - ${time}</p>
    </div>
    
    <div class="divider"></div>
    
    <table>
        <thead>
            <tr>
                <th style="text-align:right;">کالا</th>
                <th style="text-align:center;">تعداد</th>
                <th style="text-align:center;">فی</th>
                <th style="text-align:left;">جمع</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHTML}
        </tbody>
    </table>
    
    <div class="divider"></div>
    
    <table>
        <tr>
            <td>جمع اقلام:</td>
            <td style="text-align:left;">${this._formatNumber(order.subtotal)} ${currency}</td>
        </tr>
        <tr>
            <td>مالیات (${order.taxRate}%):</td>
            <td style="text-align:left;">${this._formatNumber(order.taxAmount)} ${currency}</td>
        </tr>
        ${order.discountAmount > 0 ? `
        <tr>
            <td>تخفیف:</td>
            <td style="text-align:left;">${this._formatNumber(order.discountAmount)} ${currency}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
            <td>💰 مبلغ قابل پرداخت:</td>
            <td style="text-align:left;">${this._formatNumber(order.finalAmount)} ${currency}</td>
        </tr>
    </table>
    
    <div class="divider"></div>
    
    <div class="center">
        <p>💳 روش پرداخت: ${order.paymentMethod === 'Card' ? 'کارتخوان' : 'نقدی'}</p>
    </div>
    
    <div class="divider"></div>
    
    <div class="footer">
        <p>🌹 از حضور شما سپاسگزاریم</p>
        <p>${cafeName}</p>
        <p>${date}</p>
    </div>
</body>
</html>`;
    }

    static _openPrintWindow(html, printerType) {
        const width = printerType === '58mm' ? 300 : 400;
        const height = 600;
        
        try {
            const printWindow = window.open('', '_blank', `width=${width},height=${height}`);
            
            if (!printWindow) {
                // Popup blocked - try alternative
                alert('لطفاً اجازه نمایش پنجره جدید را بدهید و دوباره تلاش کنید.');
                return;
            }
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Wait for content to load then print
            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    // Close after print dialog
                    printWindow.onafterprint = function() {
                        printWindow.close();
                    };
                }, 300);
            };
            
            // Fallback if onload doesn't fire
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 500);
            
        } catch (error) {
            console.error('Print error:', error);
            // Fallback: show in current window
            const printDiv = document.createElement('div');
            printDiv.innerHTML = html;
            printDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:white;overflow:auto;padding:20px;';
            document.body.appendChild(printDiv);
            
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    document.body.removeChild(printDiv);
                }, 1000);
            }, 300);
        }
    }

    static _formatNumber(num) {
        try {
            return new Intl.NumberFormat('fa-IR').format(Math.round(num || 0));
        } catch (e) {
            return Math.round(num || 0).toLocaleString();
        }
    }

    // ==================== پیش‌نمایش فاکتور ====================
    static previewReceipt(order) {
        console.log('👁️ Previewing receipt:', order.invoiceNumber);
        
        const cafeName = this._getSetting('cafeName', 'ARA Coffee');
        const address = this._getSetting('address', '');
        const phone = this._getSetting('phone', '');
        const currency = this._getSetting('currency', 'تومان');

        // Create modal
        const existingModal = document.getElementById('receipt-preview-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'receipt-preview-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        const date = new Date(order.createdAt).toLocaleDateString('fa-IR');
        const time = new Date(order.createdAt).toLocaleTimeString('fa-IR');

        const itemsHTML = order.items.map(item => `
            <tr>
                <td style="text-align:right;padding:4px 8px;">${item.productName}</td>
                <td style="text-align:center;padding:4px 8px;">${item.quantity}</td>
                <td style="text-align:center;padding:4px 8px;">${this._formatNumber(item.unitPrice)}</td>
                <td style="text-align:left;padding:4px 8px;">${this._formatNumber(item.totalPrice)}</td>
            </tr>
        `).join('');

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                padding: 24px;
                max-width: 400px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                font-family: 'Tahoma', sans-serif;
                color: #333;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            ">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h2 style="margin:0;color:#8B4513;">🧾 پیش‌نمایش فاکتور</h2>
                    <button onclick="document.getElementById('receipt-preview-modal').remove()" style="
                        background: #f44336;
                        color: white;
                        border: none;
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 16px;
                    ">✕</button>
                </div>
                
                <div style="text-align:center;margin-bottom:16px;">
                    <h3 style="margin:0;color:#8B4513;">${cafeName} ☕</h3>
                    ${address ? `<p style="margin:4px 0;font-size:0.9rem;color:#666;">${address}</p>` : ''}
                    ${phone ? `<p style="margin:4px 0;font-size:0.9rem;color:#666;">📞 ${phone}</p>` : ''}
                </div>
                
                <hr style="border:1px dashed #ddd;">
                
                <p style="text-align:center;"><strong>🧾 شماره فاکتور:</strong> ${order.invoiceNumber}</p>
                <p style="text-align:center;"><strong>📅 تاریخ:</strong> ${date} - ${time}</p>
                
                <hr style="border:1px dashed #ddd;">
                
                <table style="width:100%;border-collapse:collapse;margin:12px 0;">
                    <thead>
                        <tr style="border-bottom:2px solid #8B4513;">
                            <th style="text-align:right;padding:6px;">کالا</th>
                            <th style="text-align:center;padding:6px;">تعداد</th>
                            <th style="text-align:center;padding:6px;">فی</th>
                            <th style="text-align:left;padding:6px;">جمع</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
                
                <hr style="border:1px dashed #ddd;">
                
                <table style="width:100%;margin:12px 0;">
                    <tr><td>جمع اقلام:</td><td style="text-align:left;">${this._formatNumber(order.subtotal)} ${currency}</td></tr>
                    <tr><td>مالیات (${order.taxRate}%):</td><td style="text-align:left;">${this._formatNumber(order.taxAmount)} ${currency}</td></tr>
                    ${order.discountAmount > 0 ? `<tr><td>تخفیف:</td><td style="text-align:left;">${this._formatNumber(order.discountAmount)} ${currency}</td></tr>` : ''}
                    <tr style="font-weight:bold;font-size:1.1em;color:#8B4513;">
                        <td>💰 مبلغ قابل پرداخت:</td>
                        <td style="text-align:left;">${this._formatNumber(order.finalAmount)} ${currency}</td>
                    </tr>
                </table>
                
                <hr style="border:1px dashed #ddd;">
                
                <p style="text-align:center;">💳 روش پرداخت: ${order.paymentMethod === 'Card' ? 'کارتخوان' : 'نقدی'}</p>
                <p style="text-align:center;color:#999;">🌹 از حضور شما سپاسگزاریم</p>
                
                <div style="display:flex;gap:8px;margin-top:16px;">
                    <button onclick="window.print();" style="
                        flex:1;
                        padding: 10px;
                        background: #8B4513;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">🖨️ چاپ</button>
                    <button onclick="document.getElementById('receipt-preview-modal').remove()" style="
                        flex:1;
                        padding: 10px;
                        background: #666;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">بستن</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on overlay click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });
    }
}