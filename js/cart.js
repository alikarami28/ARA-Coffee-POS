// cart.js - مدیریت وضعیت سبد خرید
class ShoppingCart {
  constructor() {
    this.items = new Map(); // key: productId, value: { product, quantity }
    this.listeners = []; // برای واکنش‌پذیری UI
  }

  addItem(product) {
    if (!product.isActive) {
      this._notify('error', 'این محصول در حال حاضر غیرفعال است.');
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
    this._notify('change', this.getCartSummary());
  }

  getCartSummary() {
    let subtotal = 0;
    let totalItems = 0;
    const itemsList = [];

    for (const [id, item] of this.items) {
      const itemTotal = item.product.price * item.quantity;
      subtotal += itemTotal;
      totalItems += item.quantity;
      itemsList.push({
        productId: id,
        productName: item.product.name,
        unitPrice: item.product.price,
        quantity: item.quantity,
        totalPrice: itemTotal
      });
    }

    return {
      items: itemsList,
      subtotal: subtotal,
      totalItems: totalItems,
      taxRate: SettingsManager.get('taxRate', 9),
      discountRate: 0, // تخفیف به صورت دستی در UI اعمال می‌شود
    };
  }

  async checkout(paymentMethod = 'Cash') {
    const summary = this.getCartSummary();
    if (summary.totalItems === 0) {
      throw new Error('سبد خرید خالی است.');
    }

    const currentUser = AuthManager.getCurrentUser();
    const orderData = {
      items: summary.items,
      subtotal: summary.subtotal,
      taxRate: summary.taxRate,
      discountRate: summary.discountRate,
      cashierId: currentUser.id,
      paymentMethod: paymentMethod
    };

    const newOrder = new Order(orderData);
    await DB.add('orders', newOrder);
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

// نمونه سراسری سبد خرید
const Cart = new ShoppingCart();