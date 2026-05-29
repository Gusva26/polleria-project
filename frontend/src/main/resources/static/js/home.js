// El Dorado Pollería - Client Landing Page & Shopping Cart Module

let customerCart = [];
let pendingOrderDetails = null; // Temp storage for order metadata during payment step

function initHome() {
    loadProductsForHome();
    renderCustomerAuthStatus();
    updateHomeCartUI();
    
    // Toggle cart summary modal
    const cartBtn = document.getElementById('btn-cart-toggle');
    const closeCart = document.getElementById('close-cart');
    const cartModal = document.getElementById('cart-modal');
    
    if (cartBtn && cartModal) {
        cartBtn.addEventListener('click', () => {
            cartModal.classList.add('active');
            updateHomeCartUI();
        });
    }
    if (closeCart && cartModal) {
        closeCart.addEventListener('click', () => cartModal.classList.remove('active'));
    }
    
    
    // Wire up payment methods
    wireCardPayment();
    // Reset to card tab by default when modal opens
    let currentPaymentMethod = 'card';
    
    // Init scroll reveal animations
    initScrollReveal();
    
    // Init back-to-top button
    initBackToTop();
}

// Render dynamic customer navigation status
function renderCustomerAuthStatus() {
    const container = document.getElementById('customer-auth-status');
    if (!container) return;
    
    // Check both staff and customer session
    const staffUser = JSON.parse(localStorage.getItem('user'));
    const customerUser = JSON.parse(localStorage.getItem('customerUser'));
    const myOrdersBtn = document.getElementById('btn-my-orders');
    
    if (staffUser) {
        if (myOrdersBtn) myOrdersBtn.style.display = 'inline-flex';
        container.innerHTML = `
            <div class="glass-panel" style="padding: 6px 12px; display: flex; align-items: center; gap: 8px; border-radius: 12px;">
                <span style="font-size: 12px; font-weight: bold; color: var(--accent);">👤 ${staffUser.firstName}</span>
                <button onclick="logoutCurrentUser()" class="btn-outline btn-sm" style="padding: 3px 8px; font-size: 10px; border-radius: 6px;">Cerrar sesión</button>
            </div>
        `;
    } else if (customerUser) {
        if (myOrdersBtn) myOrdersBtn.style.display = 'inline-flex';
        container.innerHTML = `
            <div class="glass-panel" style="padding: 6px 12px; display: flex; align-items: center; gap: 8px; border-radius: 12px;">
                <span style="font-size: 12px; font-weight: bold; color: #10b981;">👋 Hola, ${customerUser.name.split(' ')[0]}</span>
                <button onclick="logoutCurrentUser()" class="btn-outline btn-sm" style="padding: 3px 8px; font-size: 10px; border-radius: 6px;">Cerrar sesión</button>
            </div>
        `;
    } else {
        if (myOrdersBtn) myOrdersBtn.style.display = 'none';
        container.innerHTML = `
            <a href="/login" class="btn-outline" style="padding: 6px 15px; font-size: 13px; text-decoration: none;">🔑 Entrar / Registrarse</a>
        `;
    }
}

// Universal logout for both staff and customers
window.logoutCurrentUser = async () => {
    try {
        await fetch(window.API_BASE + '/auth/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('user');
    localStorage.removeItem('customerUser');
    localStorage.removeItem('auth_token');
    customerCart = [];
    pendingOrderDetails = null;
    renderCustomerAuthStatus();
    updateHomeCartUI();
    window.showToast('Sesión cerrada correctamente. ¡Hasta pronto!', 'success');
};



// Payment modal controls
window.openPaymentModal = () => {
    const modal = document.getElementById('payment-modal');
    if (!modal) return;
    let total = 0;
    customerCart.forEach(item => { total += item.price * item.qty; });
    const totalStr = window.formatCurrency(total);
    const cardBtn = document.getElementById('btn-card-pay');
    const yapeBtn = document.getElementById('btn-yape-pay');
    const plinBtn = document.getElementById('btn-plin-pay');
    const yapeRef = document.getElementById('yape-ref');
    const plinRef = document.getElementById('plin-ref');
    if (cardBtn) cardBtn.textContent = `Pagar ${totalStr} 🔥`;
    if (yapeBtn) yapeBtn.textContent = `Confirmar Pedido (${totalStr}) ✅`;
    if (plinBtn) plinBtn.textContent = `Confirmar Pedido (${totalStr}) ✅`;
    if (yapeRef) yapeRef.value = '';
    if (plinRef) plinRef.value = '';
    switchPaymentMethod('card');
    modal.classList.add('active');
};

window.closePaymentModal = () => {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.classList.remove('active');
};

window.switchPaymentMethod = (method) => {
    currentPaymentMethod = method;
    document.querySelectorAll('[id^="pay-tab-"]').forEach(t => t.classList.remove('active'));
    document.getElementById('pay-tab-' + method)?.classList.add('active');
    document.getElementById('payment-card-section').style.display = method === 'card' ? 'block' : 'none';
    document.getElementById('payment-yape-section').style.display = method === 'yape' ? 'block' : 'none';
    document.getElementById('payment-plin-section').style.display = method === 'plin' ? 'block' : 'none';
};

window.confirmPayment = async (method) => {
    if (!pendingOrderDetails) return;
    
    for (const item of customerCart) {
        const prod = window.homeProducts.find(p => p.id === item.id);
        if (prod && prod.stock < item.qty) {
            window.showToast('Stock insuficiente para ' + prod.name + '. Disponible: ' + prod.stock, 'error');
            return;
        }
    }
    
    let reference = '';
    const refInput = document.getElementById(method === 'yape' ? 'yape-ref' : 'plin-ref');
    if (refInput) {
        reference = refInput.value.trim();
        if (!reference) {
            window.showToast('Ingresa el número de operación para confirmar el pago.', 'warning');
            refInput.focus();
            return;
        }
    }
    
    const methodNames = { card: 'Tarjeta', yape: 'Yape', plin: 'Plin' };
    pendingOrderDetails.notes = `Pago con ${methodNames[method]} - Ref: ${reference}`;
    
    const loader = document.getElementById('payment-processing');
    if (loader) loader.style.display = 'flex';
    
    setTimeout(async () => {
        try {
            const res = await fetch(`${window.API_BASE}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pendingOrderDetails)
            });
            if (res.ok) {
                const savedOrder = await res.json();
                // Register actual payment in the backend
                const payMethodMap = { card: 'CARD', yape: 'YAPE', plin: 'PLIN' };
                const total = customerCart.reduce((sum, i) => sum + i.price * i.qty, 0);
                await fetch(`${window.API_BASE}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: savedOrder.id,
                        paymentMethod: payMethodMap[method] || 'CARD',
                        amountPaid: total,
                        transactionReference: reference,
                        autoComplete: false
                    })
                }).catch(() => {});
                const methodIcons = { card: '💳', yape: '🟢', plin: '🔵' };
                window.showToast(`✅ ¡Pago con ${methodIcons[method] || '💳'} aprobado! Pedido #${savedOrder.id} confirmado.`, 'success');
                customerCart = [];
                pendingOrderDetails = null;
                updateHomeCartUI();
                closePaymentModal();
            } else {
                window.showToast('Error al registrar el pedido. Intente de nuevo.', 'error');
            }
        } catch (err) {
            window.showToast('Sin conexión con el servidor. Verifique su red.', 'error');
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }, 1500);
};

// Update doc number maxlength based on document type
window.updateDocLimit = () => {
    const type = document.getElementById('mp-doc-type');
    const num = document.getElementById('mp-doc-number');
    if (!type || !num) return;
    const limits = { DNI: 8, RUC: 11, CE: 12 };
    num.maxLength = limits[type.value] || 8;
    if (num.value.length > num.maxLength) num.value = num.value.slice(0, num.maxLength);
};

// Wire up card form formatting and submit
function wireCardPayment() {
    const form = document.getElementById('card-payment-form');
    const loader = document.getElementById('payment-processing');
    const cardNumInput = document.getElementById('mp-card-number');
    const cardHolderInput = document.getElementById('mp-card-name');
    const cardExpiryInput = document.getElementById('mp-card-expiry');
    const vCardNumber = document.getElementById('visual-card-number');
    const vCardHolder = document.getElementById('visual-card-holder');
    const vCardExpiry = document.getElementById('visual-card-expiry');
    const vCardTypeIcon = document.getElementById('card-type-icon');
    
    if (cardNumInput) {
        cardNumInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            let formatted = val.match(/.{1,4}/g)?.join(' ') || '';
            e.target.value = formatted.substring(0, 19);
            vCardNumber.textContent = formatted || '•••• •••• •••• ••••';
            vCardTypeIcon.textContent = val.startsWith('4') ? 'Visa 💳' : val.startsWith('5') ? 'MasterCard 💳' : '💳';
        });
    }
    if (cardHolderInput) {
        cardHolderInput.addEventListener('input', (e) => {
            let val = e.target.value.toUpperCase();
            vCardHolder.textContent = val || 'NOMBRE APELLIDO';
        });
    }
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
            e.target.value = val.substring(0, 5);
            vCardExpiry.textContent = e.target.value || 'MM/YY';
        });
    }
    const docNumInput = document.getElementById('mp-doc-number');
    if (docNumInput) {
        docNumInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    const docTypeSelect = document.getElementById('mp-doc-type');
    if (docTypeSelect) {
        docTypeSelect.addEventListener('change', updateDocLimit);
    }
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!pendingOrderDetails) return;
            for (const item of customerCart) {
                const prod = window.homeProducts.find(p => p.id === item.id);
                if (prod && prod.stock < item.qty) {
                    window.showToast('Stock insuficiente para ' + prod.name + '. Disponible: ' + prod.stock, 'error');
                    return;
                }
            }
            if (loader) loader.style.display = 'flex';
            setTimeout(async () => {
                try {
                    const res = await fetch(`${window.API_BASE}/orders`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(pendingOrderDetails)
                    });
                    if (res.ok) {
                        const savedOrder = await res.json();
                        const total = customerCart.reduce((sum, i) => sum + i.price * i.qty, 0);
                        await fetch(`${window.API_BASE}/payments`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                orderId: savedOrder.id,
                                paymentMethod: 'CARD',
                                amountPaid: total,
                                transactionReference: document.getElementById('mp-doc-number')?.value || '',
                                autoComplete: false
                            })
                        }).catch(() => {});
                        window.showToast(`✅ ¡Pago con tarjeta aprobado! Pedido #${savedOrder.id} confirmado.`, 'success');
                        customerCart = [];
                        pendingOrderDetails = null;
                        updateHomeCartUI();
                        closePaymentModal();
                        form.reset();
                        vCardNumber.textContent = '•••• •••• •••• ••••';
                        vCardHolder.textContent = 'NOMBRE APELLIDO';
                        vCardExpiry.textContent = 'MM/YY';
                        vCardTypeIcon.textContent = '💳';
                    } else {
                        window.showToast('Error al registrar el pedido.', 'error');
                    }
                } catch (err) {
                    window.showToast('Sin conexión con el servidor.', 'error');
                } finally {
                    if (loader) loader.style.display = 'none';
                }
            }, 2000);
        });
    }
}

async function loadProductsForHome() {
    const grid = document.getElementById('customer-products');
    if (!grid) return;
    
    // Show skeleton while loading
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        grid.innerHTML += `
            <div class="glass-panel skeleton-card">
                <div class="skeleton skeleton-img"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line short"></div>
            </div>
        `;
    }
    
    try {
        const [prodRes, catRes] = await Promise.all([
            fetch(`${window.API_BASE}/products/active`),
            fetch(`${window.API_BASE}/products/categories`)
        ]);
        
        const products = await prodRes.json();
        const categories = await catRes.json();
        
        // Render Categories
        const catTabs = document.getElementById('customer-categories');
        if (catTabs) {
            catTabs.innerHTML = `<button class="category-tab active" onclick="filterHomeCategory(null)">Todos</button>`;
            categories.forEach(cat => {
                catTabs.innerHTML += `<button class="category-tab" onclick="filterHomeCategory(${cat.id}, this)">${cat.name}</button>`;
            });
        }
        
        // Save products globally
        window.homeProducts = products;
        renderHomeProducts(products);
    } catch (err) {
        grid.innerHTML = '<p>Error cargando la carta. Intente más tarde.</p>';
    }
}

function renderHomeProducts(products) {
    const grid = document.getElementById('customer-products');
    if (!grid) return;
    grid.innerHTML = '';
    
    products.forEach(prod => {
        grid.innerHTML += `
            <div class="glass-panel product-card animate-fade">
                <img src="${prod.imageUrl || '/images/default-food.png'}" class="product-img" onerror="this.src='https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=60'" alt="${prod.name}">
                <h3 class="product-title">${prod.name}</h3>
                <p class="product-desc">${prod.description || ''}</p>
                <div class="product-price-row">
                    <span class="product-price">${window.formatCurrency(prod.price)}</span>
                    <span style="font-size:11px; color:var(--text-secondary);">Stock: ${prod.stock}</span>
                    <button class="btn-gold" onclick="addHomeCart(${prod.id})">+ Agregar</button>
                </div>
            </div>
        `;
    });
}

window.filterHomeCategory = (catId, btn) => {
    // Toggle active tab style
    document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
    if (btn) {
        btn.classList.add('active');
    } else {
        const defaultTab = document.querySelector('.category-tab');
        if (defaultTab) defaultTab.classList.add('active');
    }
    
    if (!catId) {
        renderHomeProducts(window.homeProducts);
    } else {
        const filtered = window.homeProducts.filter(p => p.category && p.category.id === catId);
        renderHomeProducts(filtered);
    }
};

window.addHomeCart = (prodId) => {
    const product = window.homeProducts.find(p => p.id === prodId);
    if (!product) return;
    
    if (product.stock <= 0) {
        window.showToast('Producto sin stock', 'warning');
        return;
    }
    
    const existing = customerCart.find(item => item.id === prodId);
    if (existing) {
        existing.qty++;
    } else {
        customerCart.push({ ...product, qty: 1, notes: '' });
    }
    
    updateHomeCartUI();
    const cartModal = document.getElementById('cart-modal');
    if (cartModal && !cartModal.classList.contains('active')) {
        cartModal.classList.add('active');
    }
};

function updateHomeCartUI() {
    const list = document.getElementById('home-cart-items');
    const totalEl = document.getElementById('home-cart-total');
    const badge = document.getElementById('cart-badge');
    const checkoutArea = document.getElementById('cart-checkout-area');
    
    if (!list) return;
    
    list.innerHTML = '';
    let total = 0;
    let totalQty = 0;
    
    customerCart.forEach(item => {
        total += item.price * item.qty;
        totalQty += item.qty;
        
        list.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${window.formatCurrency(item.price)}</div>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="changeHomeCartQty(${item.id}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="changeHomeCartQty(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    });
    
    if (totalEl) totalEl.textContent = window.formatCurrency(total);
    if (badge) {
        badge.textContent = totalQty;
        badge.style.display = totalQty > 0 ? 'inline-block' : 'none';
    }
    
    // Render dynamic checkout area
    if (checkoutArea) {
        if (totalQty === 0) {
            checkoutArea.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); font-size: 13px; padding: 10px 0;">
                    El carrito está vacío. ¡Agrega deliciosos platillos de la carta!
                </div>
            `;
            return;
        }
        
        const staffUser = JSON.parse(localStorage.getItem('user'));
        const customerUser = JSON.parse(localStorage.getItem('customerUser'));
        
        if (!staffUser && !customerUser) {
            checkoutArea.innerHTML = `
                <div style="text-align:center; padding: 20px 0;">
                    <p style="font-size:14px; color:var(--text-secondary); margin-bottom:16px;">Inicia sesión o regístrate para continuar con tu pedido.</p>
                    <button onclick="window.location.href='/login'" class="btn-gold" style="justify-content:center; display:inline-flex; padding:10px 28px; border-radius:12px; cursor:pointer;">💳 Pagar</button>
                </div>
            `;
            return;
        } else {
            // Logged in, show form
            const activeUser = staffUser || customerUser;
            const customerName = activeUser.firstName 
                ? `${activeUser.firstName} ${activeUser.lastName || ''}`.trim() 
                : activeUser.name;
            const customerPhone = activeUser.phone || '';
            
            checkoutArea.innerHTML = `
                <form id="customer-checkout-form">
                    <div class="form-group">
                        <label for="customer-name">Nombre y Apellido</label>
                        <input type="text" class="form-control" id="customer-name" value="${customerName}" readonly style="opacity:0.7;cursor:not-allowed;">
                    </div>
                    
                    <div class="form-group">
                        <label for="customer-phone">Teléfono Móvil</label>
                        <input type="tel" class="form-control" id="customer-phone" value="${customerPhone}" readonly style="opacity:0.7;cursor:not-allowed;">
                    </div>
                    
                    <div class="form-group">
                        <label for="customer-address">Dirección de entrega</label>
                        <input type="text" class="form-control" id="customer-address" placeholder="Ej: Av. Brasil 450, Dpto 402 - Breña" maxlength="255" required>
                    </div>
                    
                    <button type="submit" class="btn-gold" style="width: 100%; justify-content: center; margin-top: 15px; font-size: 16px;">
                        Proceder al Pago 💳
                    </button>
                </form>
            `;
            
            const checkoutForm = document.getElementById('customer-checkout-form');
            if (checkoutForm) {
                checkoutForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (customerCart.length === 0) return;
                    
                    const cName = document.getElementById('customer-name').value.trim();
                    const cPhone = document.getElementById('customer-phone').value.trim();
                    const cAddress = document.getElementById('customer-address').value.trim();
                    
                    if (!cAddress) {
                        window.showToast('Ingresa la dirección de entrega para continuar.', 'warning');
                        return;
                    }
                    
                    // Validate stock before proceeding to payment
                    for (const item of customerCart) {
                        const prod = window.homeProducts.find(p => p.id === item.id);
                        if (prod && prod.stock < item.qty) {
                            window.showToast('Stock insuficiente para ' + prod.name + '. Disponible: ' + prod.stock, 'error');
                            return;
                        }
                    }
                    
                    pendingOrderDetails = {
                        orderType: 'DELIVERY',
                        customerName: cName,
                        customerPhone: cPhone,
                        deliveryAddress: cAddress,
                        items: customerCart.map(item => ({
                            productId: item.id,
                            quantity: item.qty,
                            notes: ''
                        }))
                    };
                    
                    const cartModal = document.getElementById('cart-modal');
                    if (cartModal) cartModal.classList.remove('active');
                    
                    openPaymentModal();
                });
            }
        }
    }
}

window.changeHomeCartQty = (prodId, val) => {
    const item = customerCart.find(i => i.id === prodId);
    if (!item) return;
    
    item.qty += val;
    if (item.qty <= 0) {
        customerCart = customerCart.filter(i => i.id !== prodId);
    }
    updateHomeCartUI();
};

// ============================================
// MY ORDERS MODAL
// ============================================

window.openMyOrdersModal = () => {
    const modal = document.getElementById('my-orders-modal');
    if (!modal) return;
    modal.classList.add('active');
    loadMyOrders();
};

window.closeMyOrdersModal = () => {
    const modal = document.getElementById('my-orders-modal');
    if (!modal) return;
    modal.classList.remove('active');
};

async function loadMyOrders() {
    const container = document.getElementById('my-orders-container');
    if (!container) return;

    const customerUser = JSON.parse(localStorage.getItem('customerUser'));
    const staffUser = JSON.parse(localStorage.getItem('user'));
    const phone = customerUser?.phone || staffUser?.phone || '';

    if (!phone) {
        container.innerHTML = `
            <div class="orders-empty-state">
                <span>📱</span>
                <p>No tenemos un número de contacto registrado para consultar tus pedidos.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="width: 48px; height: 48px; border: 3px solid var(--border-color); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 15px;"></div>
            <p style="color: var(--text-secondary); font-size: 13px;">Buscando tus pedidos...</p>
        </div>
    `;

    try {
        const res = await fetch(`${window.API_BASE}/orders/my-orders?phone=${encodeURIComponent(phone)}`);
        
        if (res.status === 404) {
            container.innerHTML = `
                <div class="orders-empty-state">
                    <span>🔧</span>
                    <p>El servicio de pedidos no está disponible.</p>
                    <p style="font-size: 12px; margin-top: 5px; color: var(--text-secondary);">Asegúrate de que el backend esté actualizado y reiniciado.</p>
                    <button onclick="loadMyOrders()" class="btn-outline" style="margin-top: 15px; padding: 8px 20px;">Reintentar</button>
                </div>
            `;
            return;
        }

        if (!res.ok) {
            container.innerHTML = `
                <div class="orders-empty-state">
                    <span>⚠️</span>
                    <p>Error del servidor (${res.status}).</p>
                    <p style="font-size: 12px; margin-top: 5px; color: var(--text-secondary);">Intenta de nuevo más tarde.</p>
                    <button onclick="loadMyOrders()" class="btn-outline" style="margin-top: 15px; padding: 8px 20px;">Reintentar</button>
                </div>
            `;
            return;
        }

        const orders = await res.json();

        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="orders-empty-state">
                    <span>📦</span>
                    <p>Aún no tienes pedidos registrados.</p>
                    <p style="font-size: 12px; margin-top: 5px;">¡Agrega productos del menú y haz tu primer pedido!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => {
            const statusClass = getOrderStatusClass(order.status);
            const date = new Date(order.createdAt);
            const dateStr = date.toLocaleDateString('es-PE', { 
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const itemsHtml = (order.orderItems || []).map(item => `
                <div class="order-history-item">
                    <span>${item.quantity}x ${item.product?.name || 'Producto'}</span>
                    <span>${window.formatCurrency(item.unitPrice * item.quantity)}</span>
                </div>
            `).join('');

            return `
                <div class="order-history-card">
                    <div class="order-history-header">
                        <div>
                            <div class="order-history-id">Pedido #${order.id}</div>
                            <div class="order-history-date">${dateStr}</div>
                        </div>
                        <span class="badge ${statusClass}">${translateStatus(order.status)}</span>
                    </div>
                    ${itemsHtml ? `<div class="order-history-items">${itemsHtml}</div>` : ''}
                    <div class="order-history-total">
                        <span>Total</span>
                        <span>${window.formatCurrency(order.totalAmount)}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        container.innerHTML = `
            <div class="orders-empty-state">
                <span>🔌</span>
                <p>No pudimos conectar con el servidor.</p>
                <p style="font-size: 12px; margin-top: 5px; color: var(--text-secondary);">Verifica que el backend esté ejecutándose (puerto 8080) y reinicia el servidor para que los cambios tomen efecto.</p>
                <button onclick="loadMyOrders()" class="btn-outline" style="margin-top: 15px; padding: 8px 20px;">Reintentar</button>
            </div>
        `;
    }
}

function getOrderStatusClass(status) {
    const map = {
        'PENDING': 'badge-pending',
        'PREPARING': 'badge-preparing',
        'READY': 'badge-ready',
        'SERVED': 'badge-served',
        'SHIPPED': 'badge-shipped',
        'DELIVERED': 'badge-delivered',
        'COMPLETED': 'badge-completed',
        'CANCELLED': 'badge-cancelled'
    };
    return map[status] || 'badge-pending';
}

function translateStatus(status) {
    const map = {
        'PENDING': 'Pendiente',
        'PREPARING': 'Preparando',
        'READY': 'Listo',
        'SERVED': 'Servido',
        'SHIPPED': 'En camino',
        'DELIVERED': 'Entregado',
        'COMPLETED': 'Completado',
        'CANCELLED': 'Cancelado'
    };
    return map[status] || status;
}

// ============================================
// SCROLL REVEAL ANIMATIONS
// ============================================

function initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
    if (revealEls.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    revealEls.forEach(el => observer.observe(el));
}

// ============================================
// BACK TO TOP
// ============================================

function initBackToTop() {
    const btn = document.getElementById('btn-back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('home-page')) {
        initHome();
    }
});
