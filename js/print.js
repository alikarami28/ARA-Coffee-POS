// print.js - Print Service (Fixed)
class PrintService {
    static async printReceipt(order) {
        console.log('🖨️ Printing receipt:', order.invoiceNumber);
        
        const cafeName = this._getSetting('cafeName', 'ARA Coffee');
        const address = this._getSetting('address', '');
        const phone = this._getSetting('phone', '');
        const currency = this._getSetting('currency', 'تومان');
        const printerType = this._getSetting('printerType', '58mm');

        const html = this._generateReceiptHTML(order, cafeName, address, phone, currency, printerType);
        this._printDirectly(html, printerType);
    }

    static _getSetting(key, def) {
        try {
            const v = localStorage.getItem('ara_' + key);
            return v ? JSON.parse(v) : def;
        } catch (e) { return def; }
    }

    static _formatNumber(num) {
        try {
            return new Intl.NumberFormat('fa-IR').format(Math.round(num || 0));
        } catch (e) {
            return Math.round(num || 0).toLocaleString();
        }
    }

    static _generateReceiptHTML(order, cafeName, address, phone, currency, printerType) {
        const date = new Date(order.createdAt).toLocaleDateString('fa-IR');
        const time = new Date(order.createdAt).toLocaleTimeString('fa-IR');
        const width = printerType === '58mm' ? '58mm' : '80mm';
        const fontSize = printerType === '58mm' ? '10px' : '12px';
        const pad = printerType === '58mm' ? '3mm' : '5mm';

        const itemsHTML = order.items.map(item => `
            <tr>
                <td align="right">${item.productName}</td>
                <td align="center">${item.quantity}</td>
                <td align="center">${this._formatNumber(item.unitPrice)}</td>
                <td align="left">${this._formatNumber(item.totalPrice)}</td>
            </tr>
        `).join('');

        return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>
@page{margin:0;size:${width} auto;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Courier New',Tahoma,monospace;width:${width};padding:${pad};font-size:${fontSize};color:#000;background:#fff;margin:0 auto;}
.c{text-align:center;}
.b{font-weight:bold;}
.d{border-top:1px dashed #000;margin:3mm 0;}
table{width:100%;border-collapse:collapse;margin:3mm 0;}
th{border-bottom:1px solid #000;padding:1mm 0;}
td{padding:1mm 0;}
.tr{font-size:1.2em;font-weight:bold;}
.f{margin-top:5mm;text-align:center;font-style:italic;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="c"><h2 style="margin:0;font-size:1.3em;">${cafeName} ☕</h2>
${address?`<p style="margin:1mm 0;font-size:0.9em;">${address}</p>`:''}
${phone?`<p style="margin:1mm 0;font-size:0.9em;">📞 ${phone}</p>`:''}</div>
<div class="d"></div>
<div class="c"><p><strong>🧾 فاکتور شماره:</strong> ${order.invoiceNumber}</p>
<p><strong>📅 تاریخ:</strong> ${date} - ${time}</p></div>
<div class="d"></div>
<table><thead><tr><th align="right">کالا</th><th align="center">تعداد</th><th align="center">فی</th><th align="left">جمع</th></tr></thead><tbody>${itemsHTML}</tbody></table>
<div class="d"></div>
<table><tr><td>جمع اقلام:</td><td align="left">${this._formatNumber(order.subtotal)} ${currency}</td></tr>
<tr><td>مالیات (${order.taxRate}%):</td><td align="left">${this._formatNumber(order.taxAmount)} ${currency}</td></tr>
${order.discountAmount>0?`<tr><td>تخفیف:</td><td align="left">${this._formatNumber(order.discountAmount)} ${currency}</td></tr>`:''}
<tr class="tr"><td>💰 مبلغ قابل پرداخت:</td><td align="left">${this._formatNumber(order.finalAmount)} ${currency}</td></tr></table>
<div class="d"></div>
<div class="c"><p>💳 روش پرداخت: ${order.paymentMethod==='Card'?'کارتخوان':'نقدی'}</p></div>
<div class="d"></div>
<div class="f"><p>🌹 از حضور شما سپاسگزاریم</p><p>${cafeName}</p><p>${date}</p></div>
</body></html>`;
    }

    static _printDirectly(html, printerType) {
        const width = printerType === '58mm' ? 300 : 400;
        
        // Remove any existing print frame
        const existing = document.getElementById('print-frame');
        if (existing) existing.remove();

        // Create hidden iframe for printing
        const iframe = document.createElement('iframe');
        iframe.id = 'print-frame';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
        document.body.appendChild(iframe);

        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(html);
        iframe.contentWindow.document.close();

        // Print only once after content loads
        iframe.onload = function() {
            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }, 300);
        };

        // Fallback if onload doesn't fire
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }, 800);

        // Clean up after print
        iframe.contentWindow.onafterprint = function() {
            setTimeout(() => {
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
            }, 500);
        };
    }

    // ==================== پیش‌نمایش فاکتور ====================
    static previewReceipt(order) {
        console.log('👁️ Previewing receipt:', order.invoiceNumber);
        
        const cafeName = this._getSetting('cafeName', 'ARA Coffee');
        const address = this._getSetting('address', '');
        const phone = this._getSetting('phone', '');
        const currency = this._getSetting('currency', 'تومان');

        // Remove existing modal
        const existingModal = document.getElementById('receipt-preview-modal');
        if (existingModal) existingModal.remove();

        const date = new Date(order.createdAt).toLocaleDateString('fa-IR');
        const time = new Date(order.createdAt).toLocaleTimeString('fa-IR');

        const itemsHTML = order.items.map(item => `
            <tr>
                <td style="text-align:right;padding:6px 8px;">${item.productName}</td>
                <td style="text-align:center;padding:6px 8px;">${item.quantity}</td>
                <td style="text-align:center;padding:6px 8px;">${this._formatNumber(item.unitPrice)}</td>
                <td style="text-align:left;padding:6px 8px;">${this._formatNumber(item.totalPrice)}</td>
            </tr>
        `).join('');

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'receipt-preview-modal';
        modal.style.cssText = `
            position:fixed;top:0;left:0;right:0;bottom:0;
            background:rgba(0,0,0,0.6);z-index:99999;
            display:flex;align-items:center;justify-content:center;
            padding:20px;
        `;

        modal.innerHTML = `
            <div style="
                background:#fff;border-radius:16px;padding:24px;
                max-width:400px;width:100%;max-height:85vh;overflow-y:auto;
                font-family:Tahoma,sans-serif;color:#333;
                box-shadow:0 20px 50px rgba(0,0,0,0.3);position:relative;
            ">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h2 style="margin:0;color:#8B4513;font-size:1.2rem;">🧾 پیش‌نمایش فاکتور</h2>
                    <button id="preview-close-btn" style="
                        background:#e74c3c;color:#fff;border:none;
                        width:32px;height:32px;border-radius:50%;
                        cursor:pointer;font-size:18px;line-height:1;
                        display:flex;align-items:center;justify-content:center;
                    ">✕</button>
                </div>
                
                <div style="text-align:center;margin-bottom:16px;">
                    <h3 style="margin:0;color:#8B4513;">${cafeName} ☕</h3>
                    ${address ? `<p style="margin:4px 0;font-size:0.85rem;color:#666;">${address}</p>` : ''}
                    ${phone ? `<p style="margin:4px 0;font-size:0.85rem;color:#666;">📞 ${phone}</p>` : ''}
                </div>
                
                <hr style="border:1px dashed #ddd;">
                
                <p style="text-align:center;"><strong>🧾 شماره:</strong> ${order.invoiceNumber}</p>
                <p style="text-align:center;"><strong>📅 تاریخ:</strong> ${date} - ${time}</p>
                
                <hr style="border:1px dashed #ddd;">
                
                <table style="width:100%;border-collapse:collapse;margin:12px 0;">
                    <thead>
                        <tr style="border-bottom:2px solid #8B4513;">
                            <th style="text-align:right;padding:6px;font-size:0.85rem;">کالا</th>
                            <th style="text-align:center;padding:6px;font-size:0.85rem;">تعداد</th>
                            <th style="text-align:center;padding:6px;font-size:0.85rem;">فی</th>
                            <th style="text-align:left;padding:6px;font-size:0.85rem;">جمع</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHTML}</tbody>
                </table>
                
                <hr style="border:1px dashed #ddd;">
                
                <table style="width:100%;margin:12px 0;font-size:0.9rem;">
                    <tr><td>جمع اقلام:</td><td style="text-align:left;">${this._formatNumber(order.subtotal)} ${currency}</td></tr>
                    <tr><td>مالیات (${order.taxRate}%):</td><td style="text-align:left;">${this._formatNumber(order.taxAmount)} ${currency}</td></tr>
                    ${order.discountAmount > 0 ? `<tr><td>تخفیف:</td><td style="text-align:left;">${this._formatNumber(order.discountAmount)} ${currency}</td></tr>` : ''}
                    <tr style="font-weight:bold;font-size:1.1em;color:#8B4513;">
                        <td>💰 مبلغ قابل پرداخت:</td>
                        <td style="text-align:left;">${this._formatNumber(order.finalAmount)} ${currency}</td>
                    </tr>
                </table>
                
                <hr style="border:1px dashed #ddd;">
                
                <p style="text-align:center;font-size:0.9rem;">💳 روش پرداخت: ${order.paymentMethod === 'Card' ? 'کارتخوان' : 'نقدی'}</p>
                <p style="text-align:center;color:#999;font-size:0.85rem;">🌹 از حضور شما سپاسگزاریم</p>
                
                <div style="display:flex;gap:8px;margin-top:16px;">
                    <button id="preview-print-btn" style="
                        flex:1;padding:12px;background:#8B4513;color:#fff;
                        border:none;border-radius:8px;cursor:pointer;font-size:1rem;font-weight:bold;
                    ">🖨️ چاپ فاکتور</button>
                    <button id="preview-cancel-btn" style="
                        flex:1;padding:12px;background:#888;color:#fff;
                        border:none;border-radius:8px;cursor:pointer;font-size:1rem;
                    ">بستن</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close buttons
        const closeModal = () => modal.remove();
        
        modal.querySelector('#preview-close-btn').addEventListener('click', closeModal);
        modal.querySelector('#preview-cancel-btn').addEventListener('click', closeModal);
        
        // Close on overlay click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });

        // Print button - ONLY print, no preview again
        modal.querySelector('#preview-print-btn').addEventListener('click', () => {
            closeModal();
            // Small delay to let modal close before printing
            setTimeout(() => {
                PrintService.printReceipt(order);
            }, 300);
        });

        // ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
}