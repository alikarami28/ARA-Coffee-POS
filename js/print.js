// print.js - سرویس چاپ حرارتی و PDF
class PrintService {
  static async printReceipt(order) {
    const cafeSettings = SettingsManager.getAll();
    const receiptHTML = `
      <div style="font-family: 'Courier New', monospace; width: ${cafeSettings.printerType === '58mm' ? '200px' : '300px'}; margin:auto; padding:15px; text-align:center; direction: rtl;">
        <h2 style="margin:0">${cafeSettings.cafeName || 'ARA Coffee'}</h2>
        <p style="margin:5px 0">${cafeSettings.address || ''}</p>
        <p style="margin:5px 0">تلفن: ${cafeSettings.phone || ''}</p>
        <hr/>
        <p><strong>فاکتور شماره:</strong> ${order.invoiceNumber}</p>
        <p><strong>تاریخ:</strong> ${new Date(order.createdAt).toLocaleString('fa-IR')}</p>
        <hr/>
        <table style="width:100%; border-collapse: collapse;">
          <thead><tr><th>نام</th><th>تعداد</th><th>فی</th><th>جمع</th></tr></thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.quantity}</td>
                <td>${UI.formatCurrency(item.unitPrice)}</td>
                <td>${UI.formatCurrency(item.totalPrice)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <hr/>
        <p>جمع کل: ${UI.formatCurrency(order.subtotal)}</p>
        <p>مالیات (${order.taxRate}%): ${UI.formatCurrency(order.taxAmount)}</p>
        <p>تخفیف: ${UI.formatCurrency(order.discountAmount)}</p>
        <h3>مبلغ قابل پرداخت: ${UI.formatCurrency(order.finalAmount)}</h3>
        <hr/>
        <p>پرداخت: ${order.paymentMethod === 'Card' ? 'کارتخوان' : 'نقدی'}</p>
        <p>صندوقدار: ${AuthManager.getCurrentUser()?.username}</p>
        <p style="margin-top:20px">متشکریم از حضور شما ☕</p>
      </div>
    `;

    try {
      // تلاش برای چاپ بی‌صدا با Web Print API
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      printWindow.document.write(`
        <html>
          <head><title>چاپ رسید</title></head>
          <body>${receiptHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    } catch (e) {
      UI.showToast('warning', 'چاپگر یافت نشد. پنجره چاپ باز شد.');
    }
  }
}