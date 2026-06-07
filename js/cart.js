// cart.js - Shopping Cart (Discount from Settings)
class ShoppingCart {
    constructor() {
        this.items = new Map();
        this.listeners = [];
        this.manualDiscountPercent = null; // تخفیف دستی (موقت)
        this.manualDiscountAmount = null;
        this.manualDiscountType = null;
    }

    addItem(product) {
        if (!product.isActive) {
            this._notify('error', 'این محصول غیرفعال است');
            return false;
        }
        const existing = this.items.get(product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.items.set(product.id, { product: product, quantity: 1 });
        }
        this._notify('change', this.getCartSummary());
        return true;
    }

    increaseQuantity(productId) {
        const item = this.items.get(productId);
        if (item) {
            item.quantity += 1;
            this._notify('change', this.getCartSummary());
        }
    }

    decreaseQuantity(productId) {
        const item = this.items.get(productId);
        if (item) {
            if (item.quantity > 1) {
                item.quantity -= 1;
                this._notify('change', this.getCartSummary());
            } else {
                this.removeItem(productId);
            }
        }
    }

    removeItem(productId) {
        if (this.items.delete(productId)) {
            this._notify('change', this.getCartSummary());
        }
    }

    clearCart() {
        this.items.clear();
        this.manualDiscountPercent = null;
        this.manualDiscountAmount = null;
        this.manualDiscountType = null;
        this._notify('change', this.getCartSummary());
    }

    // ==================== تخفیف ====================
    
    // تخفیف دستی (از صفحه POS)
    setDiscountPercent(percent) {
        this.manualDiscountPercent = Math.max(0, Math.min(100, parseFloat(percent) || 0));
        this.manualDiscountType = 'percent';
        this.manualDiscountAmount = null;
        this._notify('change', this.getCartSummary());
    }

    setDiscountAmount(amount) {
        this.manualDiscountAmount = Math.max(0, parseFloat(amount) || 0);
        this.manualDiscountType = 'amount';
        this.manualDiscountPercent = null;
        this._notify('change', this.getCartSummary());
    }

    removeManualDiscount() {
        this.manualDiscountPercent = null;
        this.manualDiscountAmount = null;
        this.manualDiscountType = null;
        this._notify('change', this.getCartSummary());
    }

    removeDiscount() {
        this.removeManualDiscount();
    }

    // گرفتن درصد تخفیف نهایی (تنظیمات + دستی)
    _getEffectiveDiscountPercent() {
        // اولویت با تخفیف دستی
        if (this.manualDiscountType === 'percent' && this.manualDiscountPercent !== null) {
            return this.manualDiscountPercent;
        }
        // بعد تخفیف تنظیمات
        try {
            const saved = localStorage.getItem('ara_discountPercent');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parseFloat(parsed) || 0;
            }
        } catch (e) {}
        return 0;
    }

    _getEffectiveDiscountAmount() {
        if (this.manualDiscountType === 'amount' && this.manualDiscountAmount !== null) {
            return this.manualDiscountAmount;
        }
        return 0;
    }

    _isDiscountActive() {
        return this._getEffectiveDiscountPercent() > 0 || this._getEffectiveDiscountAmount() > 0;
    }

    // ==================== محاسبات ====================
    
    getCartSummary() {
        let subtotalOriginal = 0;
        let subtotalAfterDiscount = 0;
        const itemsList = [];

        for (const [id, item] of this.items) {
            const originalPrice = item.product.price;
            const originalTotal = originalPrice * item.quantity;
            
            let discountedPrice = originalPrice;
            
            if (this.manualDiscountType === 'percent' && this.manualDiscountPercent !== null) {
                discountedPrice = originalPrice * (1 - this.manualDiscountPercent / 100);
            } else if (this.manualDiscountType === 'amount' && this.manualDiscountAmount !== null) {
                const totalOriginal = this._getTotalOriginal();
                if (totalOriginal > 0) {
                    const ratio = originalTotal / totalOriginal;
                    const discountForItem = this.manualDiscountAmount * ratio;
                    discountedPrice = (originalTotal - discountForItem) / item.quantity;
                }
            } else {
                const settingDiscount = this._getEffectiveDiscountPercent();
                if (settingDiscount > 0) {
                    discountedPrice = originalPrice * (1 - settingDiscount / 100);
                }
            }
            
            const discountedTotal = Math.round(discountedPrice * item.quantity);
            
            subtotalOriginal += originalTotal;
            subtotalAfterDiscount += discountedTotal;

            itemsList.push({
                productId: id,
                productName: item.product.name,
                unitPrice: originalPrice,
                discountedUnitPrice: Math.round(discountedPrice),
                quantity: item.quantity,
                totalPrice: originalTotal,
                discountedTotal: discountedTotal
            });
        }

        // خواندن مالیات (پیش‌فرض ۱۰٪)
        let taxRate = 10;
        try {
            const saved = localStorage.getItem('ara_taxRate');
            if (saved) {
                taxRate = parseFloat(JSON.parse(saved)) || 10;
            }
        } catch (e) {}

        // مالیات روی قیمت اصلی
        const taxAmount = Math.round((subtotalOriginal * taxRate) / 100);
        const discountAmount = subtotalOriginal - subtotalAfterDiscount;
        const finalAmount = subtotalAfterDiscount + taxAmount;

        return {
            items: itemsList,
            subtotalOriginal: subtotalOriginal,
            subtotalAfterDiscount: subtotalAfterDiscount,
            totalItems: itemsList.reduce((sum, i) => sum + i.quantity, 0),
            taxRate: taxRate,
            taxAmount: taxAmount,
            discountPercent: this._isDiscountActive() ? (this.manualDiscountPercent || this._getEffectiveDiscountPercent()) : 0,
            discountAmount: discountAmount,
            finalAmount: finalAmount
        };
    }

    _getTotalOriginal() {
        let total = 0;
        for (const [id, item] of this.items) {
            total += item.product.price * item.quantity;
        }
        return total;
    }

    getDiscountInfo() {
        return {
            settingPercent: this._getEffectiveDiscountPercent(),
            manualPercent: this.manualDiscountPercent,
            manualAmount: this.manualDiscountAmount,
            isActive: this._isDiscountActive()
        };
    }

    async checkout(paymentMethod = 'Cash') {
        const summary = this.getCartSummary();
        if (summary.totalItems === 0) throw new Error('سبد خرید خالی است');

        const currentUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
        
        const orderData = {
            items: summary.items,
            subtotal: summary.subtotalOriginal,
            taxRate: summary.taxRate,
            taxAmount: summary.taxAmount,
            discountPercent: summary.discountPercent,
            discountAmount: summary.discountAmount,
            finalAmount: summary.finalAmount,
            cashierId: currentUser?.id || 'system',
            paymentMethod: paymentMethod
        };

        const newOrder = new Order(orderData);
        
        if (typeof DB !== 'undefined') {
            try { await DB.addOrder(newOrder); } catch (e) {}
        }
        
        this.clearCart();
        this._notify('order_complete', newOrder);
        return newOrder;
    }

    onChange(callback) { this.listeners.push(callback); }
    _notify(event, data) { this.listeners.forEach(cb => cb(event, data)); }
}

const Cart = new ShoppingCart();
