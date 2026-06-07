// models.js - Data Models
class Product {
    constructor({ name, categoryId, price, description = '', image = null, isActive = true, displayOrder = 0 }) {
        this.id = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        this.name = name.trim();
        this.categoryId = categoryId;
        this.price = parseFloat(price) || 0;
        this.description = description;
        this.image = image;
        this.isActive = isActive;
        this.displayOrder = displayOrder;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }
}

class Category {
    constructor({ name, icon = '☕', isDefault = false, displayOrder = 0 }) {
        this.id = 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        this.name = name;
        this.icon = icon;
        this.isDefault = isDefault;
        this.displayOrder = displayOrder;
        this.createdAt = new Date().toISOString();
    }
}

class Order {
    constructor({ items, subtotal, taxRate = 10, taxAmount = 0, discountPercent = 0, discountAmount = 0, finalAmount, cashierId = 'system', paymentMethod = 'Cash' }) {
        this.id = 'ord-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        this.invoiceNumber = this._generateInvoiceNumber();
        this.items = items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            discountedUnitPrice: item.discountedUnitPrice || item.unitPrice,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            discountedTotal: item.discountedTotal || item.totalPrice
        }));
        this.subtotal = subtotal;
        this.taxRate = taxRate;
        this.taxAmount = taxAmount || Math.round((subtotal * taxRate) / 100);
        this.discountPercent = discountPercent || 0;
        this.discountAmount = discountAmount || 0;
        this.finalAmount = finalAmount || (subtotal - this.discountAmount + this.taxAmount);
        this.cashierId = cashierId;
        this.paymentMethod = paymentMethod;
        this.createdAt = new Date().toISOString();
    }

    _generateInvoiceNumber() {
        const now = new Date();
        const d = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`;
        const t = `${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
        const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ARA-${d}-${t}-${r}`;
    }
}
