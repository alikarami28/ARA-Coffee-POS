// orders.js - Order History Management
class OrderHistory {
    static async init() {
        console.log('📋 OrderHistory init');
        await this.loadOrders();
        document.getElementById('btn-filter')?.addEventListener('click', () => this.loadOrders());
        document.getElementById('btn-clear')?.addEventListener('click', () => {
            document.getElementById('filter-start').value = '';
            document.getElementById('filter-end').value = '';
            document.getElementById('filter-search').value = '';
            this.loadOrders();
        });
    }

    static async loadOrders() {
        let orders = await DB.getAll('orders');
        const startDate = document.getElementById('filter-start')?.value;
        const endDate = document.getElementById('filter-end')?.value;
        const search = document.getElementById('filter-search')?.value?.toLowerCase();
        
        if (startDate) orders = orders.filter(o => o.createdAt >= startDate);
        if (endDate) orders = orders.filter(o => o.createdAt <= endDate + 'T23:59:59');
        if (search) orders = orders.filter(o => o.invoiceNumber.toLowerCase().includes(search));
        
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const total = orders.reduce((s, o) => s + o.finalAmount, 0);
        document.getElementById('stat-count').textContent = orders.length;
        document.getElementById('stat-total').textContent = UI.formatCurrency(total);
        document.getElementById('stat-avg').textContent = orders.length > 0 ? UI.formatCurrency(total / orders.length) : '۰ تومان';
        
        const container = document.getElementById('orders-list');
        if (!container) return;
        
        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-light);">سفارشی یافت نشد</p>';
            return;
        }
        
        container.innerHTML = orders.map(o => `
            <div class="order-card">
                <div class="order-top"><span class="invoice">🧾 ${o.invoiceNumber}</span><span class="date">📅 ${UI.formatDate(o.createdAt)}</span></div>
                <div class="order-items">${o.items.map(i => `${i.productName}(${i.quantity})`).join(' | ')}</div>
                <div class="order-bottom">
                    <span class="order-total">💰 ${UI.formatCurrency(o.finalAmount)}</span>
                    <span class="order-payment">${o.paymentMethod === 'Card' ? '💳 کارت' : '💵 نقد'}</span>
                    <button class="btn-sm" onclick="OrderHistory.reprint('${o.id}')">🖨️ چاپ</button>
                </div>
            </div>
        `).join('');
    }

    static async reprint(id) {
        const order = await DB.getById('orders', id);
        if (order && typeof PrintService !== 'undefined') PrintService.printReceipt(order);
    }
}