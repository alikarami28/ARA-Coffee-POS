// cart.js - Shopping Cart with Discount
class ShoppingCart {
    constructor() {
        this.items = new Map();
        this.listeners = [];
        this.discountPercent = 0; // درصد تخفیف
        this.discountAmount = 0;   // مبلغ تخفیف (تومان)
        this.discountType = 'percent'; // 'percent' یا 'amount'
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
        this.discountPercent = 0;
        this.discountAmount = 0;
        this.discountType = 'percent';
        this._notify('change', this.getCartSummary());
    }

    // ==================== تخفیف ====================
    
    setDiscountPercent(percent) {
        this.discountPercent = Math.max(0, Math.min(100, parseFloat(percent) || 0));
        this.discountType = 'percent';
        this.discountAmount = 0;
        this._notify('change', this.getCartSummary());
    }

    setDiscountAmount(amount) {
        this.discountAmount = Math.max(0, parseFloat(amount) || 0);
        this.discountType = 'amount';
        this.discountPercent = 0;
        this._notify('change', this.getCartSummary());
    }

    removeDiscount() {
        this.discountPercent = 0;
        this.discountAmount = 0;
        this._notify('change', this.getCartSummary());
    }

    getDiscountInfo() {
        return {
            type: this.discountType,
            percent: this.discountPercent,
            amount: this.discountAmount
        };
    }

    // ==================== محاسبات ====================
    
    getCartSummary() {
        let subtotalOriginal = 0; // قیمت اصلی (قبل از تخفیف)
        let subtotalAfterDiscount = 0; // قیمت بعد از تخفیف
        const itemsList = [];

        for (const [id, item] of this.items) {
            const originalPrice = item.product.price;
            const originalTotal = originalPrice * item.quantity;
            
            // محاسبه قیمت بعد از تخفیف
            let discountedPrice = originalPrice;
            if (this.discountType === 'percent') {
                discountedPrice = originalPrice * (1 - this.discountPercent / 100);
            } else if (this.discountType === 'amount') {
                // تخفیف مبلغی به نسبت کل
                const totalOriginal = this._getTotalOriginal();
                if (totalOriginal > 0) {
                    const ratio = originalTotal / totalOriginal;
                    const discountForItem = this.discountAmount * ratio;
                    discountedPrice = (originalTotal - discountForItem) / item.quantity;
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

        // خواندن مالیات
        let taxRate = 9;
        try {
            const saved = localStorage.getItem('ara_taxRate');
            if (saved) {
                taxRate = parseFloat(JSON.parse(saved)) || 9;
            }
        } catch (e) {}

        // مالیات روی قیمت اصلی محاسبه میشه
        const taxAmount = Math.round((subtotalOriginal * taxRate) / 100);
        
        // مبلغ تخفیف کل
        const discountAmount = subtotalOriginal - subtotalAfterDiscount;
        
        // مبلغ نهایی = (قیمت اصلی - تخفیف) + مالیات
        const finalAmount = subtotalAfterDiscount + taxAmount;

        return {
            items: itemsList,
            subtotalOriginal: subtotalOriginal,
            subtotalAfterDiscount: subtotalAfterDiscount,
            totalItems: itemsList.reduce((sum, i) => sum + i.quantity, 0),
            taxRate: taxRate,
            taxAmount: taxAmount,
            discountPercent: this.discountPercent,
            discountAmount: discountAmount,
            discountType: this.discountType,
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

    async checkout(paymentMethod = 'Cash') {
        const summary = this.getCartSummary();
        if (summary.totalItems === 0) {
            throw new Error('سبد خرید خالی است');
        }

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
            try {
                await DB.addOrder(newOrder);
            } catch (e) {
                console.warn('Could not save order:', e);
            }
        }
        
        this.clearCart();
        this._notify('order_complete', newOrder);
        return newOrder;
    }

    onChange(callback) {
        this.listeners.push(callback);
    }

    _notify(event, data) {
        this.listeners.forEach(cb => cb(event, data));
    }
}

const Cart = new ShoppingCart();