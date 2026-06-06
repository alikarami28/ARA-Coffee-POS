// app.js - Main Application Controller
class ARAApp {
    constructor() {
        this.currentPage = document.body.getAttribute('data-page') || 'pos';
        console.log('📄 Page:', this.currentPage);
        this.init();
    }

    async init() {
        try {
            await DB.ready;
            UI.applySavedTheme();
            UI.updateDateTime();
            
            if (this.currentPage !== 'login' && !AuthManager.isLoggedIn()) {
                window.location.href = '/login.html';
                return;
            }

            UI.displayUserInfo();
            this.initSidebar();
            this.initLogout();

            switch (this.currentPage) {
                case 'login': AuthManager.initLoginForm(); break;
                case 'pos': await this.initPOS(); break;
                case 'admin': if (typeof AdminPanel !== 'undefined') await AdminPanel.init(); break;
                case 'orders': if (typeof OrderHistory !== 'undefined') await OrderHistory.init(); break;
                case 'reports': if (typeof ReportManager !== 'undefined') await ReportManager.init(); break;
                case 'settings': if (typeof SettingsPage !== 'undefined') SettingsPage.init(); break;
            }
        } catch (e) {
            console.error('Init error:', e);
            if (typeof UI !== 'undefined') UI.showToast('error', e.message);
        }
    }

    initSidebar() {
        const toggle = document.getElementById('menu-toggle');
        const nav = document.getElementById('side-nav');
        const overlay = document.getElementById('side-nav-overlay');
        if (!toggle || !nav) return;
        
        toggle.addEventListener('click', (e) => { e.stopPropagation(); nav.classList.toggle('open'); if(overlay) overlay.classList.toggle('active'); });
        if (overlay) overlay.addEventListener('click', () => { nav.classList.remove('open'); overlay.classList.remove('active'); });
        nav.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => { nav.classList.remove('open'); if(overlay) overlay.classList.remove('active'); }));
    }

    initLogout() {
        document.getElementById('logout-btn')?.addEventListener('click', () => { if(confirm('خروج؟')) AuthManager.logout(); });
    }

    async initPOS() {
        const productGrid = document.getElementById('product-grid');
        const cartContainer = document.getElementById('cart-items');
        if (!productGrid || !cartContainer) return;

        let allProducts = [], activeCat = null;

        // Ensure categories
        if ((await DB.getAll('categories')).length === 0) {
            const defs = [{name:'Espresso',icon:'☕'},{name:'Hot Coffee',icon:'🫖'},{name:'Iced Coffee',icon:'🧊'},{name:'Tea',icon:'🍵'},{name:'Matcha',icon:'🍃'},{name:'Cold Drinks',icon:'🥤'},{name:'Dessert',icon:'🍰'},{name:'Bakery',icon:'🥐'}];
            for (let i=0;i<defs.length;i++) await DB.add('categories',{id:'cat-def-'+i,name:defs[i].name,icon:defs[i].icon,isDefault:true,displayOrder:i,createdAt:new Date().toISOString()});
        }

        const loadCats = async () => {
            const cats = await DB.getAll('categories');
            const el = document.getElementById('category-tabs');
            if (!el) return;
            el.innerHTML = '<button class="category-tab active" data-cat="all">📋 همه</button>' + cats.sort((a,b)=>a.displayOrder-b.displayOrder).map(c=>`<button class="category-tab" data-cat="${c.id}">${c.icon} ${c.name}</button>`).join('');
            el.querySelectorAll('.category-tab').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('.category-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeCat=b.dataset.cat==='all'?null:b.dataset.cat;filter();}));
        };

        const render = (prods) => {
            productGrid.innerHTML = prods.length===0?'<p style="text-align:center;padding:40px;color:var(--text-light);">محصولی یافت نشد</p>':prods.sort((a,b)=>a.displayOrder-b.displayOrder).map(p=>`<div class="product-card glass${!p.isActive?' product-inactive':''}" data-pid="${p.id}"><div class="product-image" style="background-image:url('${p.image||'/assets/images/logo-placeholder.png'}')"></div><div class="product-info"><h3>${p.name}</h3><p class="price">${UI.formatCurrency(p.price)}</p></div>${!p.isActive?'<div class="inactive-badge">غیرفعال</div>':''}</div>`).join('');
            productGrid.querySelectorAll('.product-card:not(.product-inactive)').forEach(c=>c.addEventListener('click',()=>{const p=allProducts.find(x=>x.id===c.dataset.pid);if(p&&typeof Cart!=='undefined')Cart.addItem(p);}));
        };

        const filter = () => {
            let f=[...allProducts];
            if(activeCat) f=f.filter(p=>p.categoryId===activeCat);
            const s=document.getElementById('pos-search')?.value?.trim()?.toLowerCase();
            if(s) f=f.filter(p=>p.name.toLowerCase().includes(s));
            render(f);
        };

        if (typeof Cart !== 'undefined') {
            Cart.onChange((ev,data)=>{
                if(ev==='change'){
                    const {items,subtotal,taxRate}=data;
                    const tax=(subtotal*taxRate)/100;
                    cartContainer.innerHTML = items.length===0?'<p class="empty-cart">سبد خرید خالی است</p>':items.map(i=>`<div class="cart-item"><div class="item-details"><span class="item-name">${i.productName}</span><span class="item-price">${UI.formatCurrency(i.unitPrice)}</span></div><div class="item-quantity"><button class="qty-btn dec" data-pid="${i.productId}">−</button><span class="qty-value">${i.quantity}</span><button class="qty-btn inc" data-pid="${i.productId}">+</button><button class="delete-btn" data-pid="${i.productId}">🗑️</button></div><span class="item-total">${UI.formatCurrency(i.totalPrice)}</span></div>`).join('');
                    document.getElementById('subtotal-amount').textContent=UI.formatCurrency(subtotal);
                    document.getElementById('tax-amount').textContent=UI.formatCurrency(tax);
                    document.getElementById('discount-amount').textContent=UI.formatCurrency(0);
                    document.getElementById('total-amount').textContent=UI.formatCurrency(subtotal+tax);
                    cartContainer.querySelectorAll('.qty-btn.inc').forEach(b=>b.onclick=(e)=>{e.stopPropagation();Cart.increaseQuantity(b.dataset.pid);});
                    cartContainer.querySelectorAll('.qty-btn.dec').forEach(b=>b.onclick=(e)=>{e.stopPropagation();Cart.decreaseQuantity(b.dataset.pid);});
                    cartContainer.querySelectorAll('.delete-btn').forEach(b=>b.onclick=(e)=>{e.stopPropagation();Cart.removeItem(b.dataset.pid);});
                }
            });
        }

        document.getElementById('pos-search')?.addEventListener('input',filter);
        document.getElementById('clear-cart-btn')?.addEventListener('click',()=>Cart?.clearCart());
        document.getElementById('checkout-btn')?.addEventListener('click',async()=>{
            if(!Cart||Cart.getCartSummary().items.length===0){UI.showToast('warning','سبد خرید خالی است');return;}
            try{const m=document.querySelector('input[name="payment-method"]:checked')?.value||'Cash';const o=await Cart.checkout(m);if(typeof PrintService!=='undefined')PrintService.printReceipt(o);}catch(e){UI.showToast('error',e.message);}
        });

        allProducts = await DB.getAll('products');
        console.log('📦 Products:', allProducts.length);
        await loadCats();
        render(allProducts);
    }
}

document.addEventListener('DOMContentLoaded',()=>{window.ARA_App=new ARAApp();});