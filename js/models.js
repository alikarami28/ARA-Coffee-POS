// models.js - کلاس‌های مدل برای اعتبارسنجی و ساختاردهی داده‌ها
class Product {
    constructor({ name, categoryId, price, description = '', image = null, isActive = true, displayOrder = 0 }) {
        this.id = this._generateUUID();
        this.name = this._validateString(name, 'Product Name');
        this.categoryId = this._validateString(categoryId, 'Category ID');
        this.price = this._validateNumber(price, 'Price');
        this.description = description;
        this.image = image;
        this.isActive = isActive;
        this.displayOrder = displayOrder;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    _generateUUID() {
        return 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    _validateString(value, fieldName) {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            throw new Error(`${fieldName} is required and must be a non-empty string.`);
        }
        return value.trim();
    }

    _validateNumber(value, fieldName) {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
            throw new Error(`${fieldName} must be a valid non-negative number.`);
        }
        return num;
    }
}

class Category {
    constructor({ name, icon = '☕', isDefault = false, displayOrder = 0 }) {
        this.id = 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.icon = icon;
        this.isDefault = isDefault;
        this.displayOrder = displayOrder;
        this.createdAt = new Date().toISOString();
    }
}

class Order {
    constructor({ items, subtotal, taxRate = 9, discountRate = 0, cashierId = 'system', paymentMethod = 'Cash' }) {
        this.id = 'ord-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        this.invoiceNumber = this._generateInvoiceNumber();
        this.items = items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            totalPrice: item.unitPrice * item.quantity
        }));
        this.subtotal = subtotal;
        this.taxRate = taxRate;
        this.taxAmount = (subtotal * taxRate) / 100;
        this.discountRate = discountRate;
        this.discountAmount = (subtotal * discountRate) / 100;
        this.finalAmount = Math.round(subtotal + this.taxAmount - this.discountAmount);
        this.cashierId = cashierId;
        this.paymentMethod = paymentMethod;
        this.createdAt = new Date().toISOString();
    }

    _generateInvoiceNumber() {
        const now = new Date();
        const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
        const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
        const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ARA-${dateStr}-${timeStr}-${randomPart}`;
    }
}