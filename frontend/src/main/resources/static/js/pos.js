// El Dorado Pollería - POS Cashier Module

let activeTable = null;
let activeOrder = null;
let posCart = [];
let posInitialized = false;
let activeOrderType = 'LOCAL';
let posStatusPollInterval = null;

const POS_STATUS_MAP = {
    'PENDING': { label: 'Pendiente', badge: 'badge-pending' },
    'PREPARING': { label: 'Preparando', badge: 'badge-preparing' },
    'READY': { label: 'Listo para Servir', badge: 'badge-ready' },
    'SERVED': { label: 'Servido', badge: 'badge-served' },
    'COMPLETED': { label: 'Completado', badge: 'badge-completed' },
    'CANCELLED': { label: 'Anulado', badge: 'badge-cancelled' }
};

window.selectPOSOrderType = (type) => {
    if (posStatusPollInterval) { clearInterval(posStatusPollInterval); posStatusPollInterval = null; }
    activeOrderType = type;
    activeTable = null;
    activeOrder = null;
    posCart = [];
    
    // Toggle active class on type buttons
    const btnLocal = document.getElementById('pos-type-local');
    const btnPickup = document.getElementById('pos-type-pickup');
    const btnDelivery = document.getElementById('pos-type-delivery');
    
    if (btnLocal) btnLocal.classList.toggle('active', type === 'LOCAL');
    if (btnPickup) btnPickup.classList.toggle('active', type === 'PICKUP');
    if (btnDelivery) btnDelivery.classList.toggle('active', type === 'DELIVERY');
    
    const tablesPanel = document.getElementById('pos-tables-panel');
    const customerDetails = document.getElementById('pos-customer-details');
    const phoneGroup = document.getElementById('pos-phone-group');
    const addressGroup = document.getElementById('pos-address-group');
    const checkoutBtn = document.getElementById('btn-checkout-table');
    
    // Reset customer forms
    const nameInput = document.getElementById('pos-customer-name');
    const phoneInput = document.getElementById('pos-customer-phone');
    const addressInput = document.getElementById('pos-customer-address');
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (addressInput) addressInput.value = '';
    
    if (checkoutBtn) {
        checkoutBtn.style.display = 'none';
        checkoutBtn.textContent = type === 'LOCAL' ? '💸 Cobrar Consumo (Facturar)' : '💸 Cobrar Pedido (Facturar)';
    }
    
    if (type === 'LOCAL') {
        if (tablesPanel) tablesPanel.style.display = 'block';
        if (customerDetails) customerDetails.style.display = 'none';
        document.getElementById('pos-active-table-name').textContent = 'Seleccione una mesa';
        loadPOSTables();
    } else {
        if (tablesPanel) tablesPanel.style.display = 'none';
        if (customerDetails) customerDetails.style.display = 'flex';
        
        if (type === 'PICKUP') {
            if (phoneGroup) phoneGroup.style.display = 'block';
            if (addressGroup) addressGroup.style.display = 'none';
            document.getElementById('pos-active-table-name').textContent = 'Para Llevar';
        } else if (type === 'DELIVERY') {
            if (phoneGroup) phoneGroup.style.display = 'block';
            if (addressGroup) addressGroup.style.display = 'block';
            document.getElementById('pos-active-table-name').textContent = 'Delivery';
        }
    }
    
    updatePOSCartUI();
};

function initPOS() {
    // Determine user role and setup selector
    const user = JSON.parse(localStorage.getItem('user'));
    const typeContainer = document.getElementById('pos-order-type-container');
    
    if (user && user.role === 'ROLE_MESERO') {
        if (typeContainer) typeContainer.style.display = 'none';
        window.selectPOSOrderType('LOCAL');
    } else {
        if (typeContainer) typeContainer.style.display = 'flex';
        window.selectPOSOrderType('LOCAL'); // default on load
    }
    
    loadPOSProducts();
    
    if (posInitialized) return;
    posInitialized = true;
    
    // Close payment modal
    const closePay = document.getElementById('close-pay-modal');
    if (closePay) {
        closePay.addEventListener('click', () => {
            const payModal = document.getElementById('pay-modal');
            if (payModal) payModal.classList.remove('active');
        });
    }
    
    // Switch between payment method sections
    const payMethod = document.getElementById('pay-method');
    if (payMethod) {
        const sections = document.querySelectorAll('.pay-method-section');
        const showSection = (method) => {
            sections.forEach(s => s.style.display = 'none');
            const target = document.getElementById('pay-section-' + method.toLowerCase());
            if (target) target.style.display = 'block';
        };
        payMethod.addEventListener('change', () => showSection(payMethod.value));
        showSection(payMethod.value);
    }

    // Submit Payment and generate Invoice
    const payForm = document.getElementById('pos-payment-form');
    if (payForm) {
        payForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeOrder) return;
            
            const paymentMethod = payMethod ? payMethod.value : 'CASH';
            const cashInput = document.getElementById('pay-cash-amount');
            
            let amountPaid = activeOrder.totalAmount;
            let transactionReference = '';
            
            if (paymentMethod === 'CASH') {
                amountPaid = cashInput ? parseFloat(cashInput.value) : activeOrder.totalAmount;
                if (amountPaid < activeOrder.totalAmount) {
                    window.showToast('El monto recibido es menor al total del pedido.', 'warning');
                    return;
                }
            } else {
                const refInput = document.getElementById('pay-reference');
                transactionReference = refInput ? refInput.value.trim() : '';
                if (!transactionReference) {
                    window.showToast('Ingresa el número de operación.', 'warning');
                    return;
                }
            }
            
            const invoiceType = document.getElementById('invoice-type').value;
            const customerName = document.getElementById('invoice-cust-name').value || 'Público General';
            const customerDocument = document.getElementById('invoice-cust-doc').value;
            const customerDocType = document.getElementById('invoice-doc-type')?.value || 'DNI';
            
            try {
                // 1. Process payment
                const payRes = await fetch(`${window.API_BASE}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: activeOrder.id,
                        paymentMethod,
                        amountPaid,
                        transactionReference
                    })
                });
                
                if (!payRes.ok) {
                    window.showToast('Error al registrar el pago', 'error');
                    return;
                }
                
                // 2. Generate Peru Invoice/Receipt
                const invRes = await fetch(`${window.API_BASE}/invoices`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: activeOrder.id,
                        invoiceType,
                        customerName,
                        customerDocument,
                        customerDocType
                    })
                });
                
                if (invRes.ok) {
                    const invoice = await invRes.json();
                    const payModal = document.getElementById('pay-modal');
                    if (payModal) payModal.classList.remove('active');
                    showReceiptPrint(invoice, paymentMethod, amountPaid);
                    
                    // Reset POS active state
                    window.selectPOSOrderType(activeOrderType);
                } else {
                    window.showToast('Pago realizado, pero no se pudo generar el comprobante.', 'warning');
                }
            } catch (err) {
                window.showToast('Error al conectar con la pasarela de facturación', 'error');
            }
        });
    }
}

async function loadPOSTables() {
    const grid = document.getElementById('pos-tables');
    if (!grid) return;
    
    try {
        const res = await fetch(`${window.API_BASE}/tables`);
        const tables = await res.json();
        
        grid.innerHTML = '';
        tables.forEach(t => {
            const statusClass = t.status.toLowerCase() === 'available' ? 'available' : 'occupied';
            const statusLabel = t.status === 'AVAILABLE' ? 'Libre' : 'Consumiendo';
            grid.innerHTML += `
                <div class="glass-panel table-card ${statusClass} animate-fade" onclick="selectPOSTable(${t.id}, '${t.tableNumber}', '${t.status}')">
                    <div class="table-icon">🍽️</div>
                    <div class="table-num">${t.tableNumber}</div>
                    <div class="table-cap">Capacidad: ${t.capacity}</div>
                    <span class="badge ${t.status === 'AVAILABLE' ? 'badge-completed' : 'badge-pending'}" style="margin-top: 10px; font-size:9px;">${statusLabel}</span>
                </div>
            `;
        });
    } catch (err) {
        console.error('Error loading POS tables:', err);
    }
}

async function loadPOSProducts() {
    const grid = document.getElementById('pos-products');
    if (!grid) return;
    
    try {
        const res = await fetch(`${window.API_BASE}/products/active`);
        const products = await res.json();
        
        grid.innerHTML = '';
        products.forEach(p => {
            grid.innerHTML += `
                <div class="glass-panel product-card animate-fade" style="padding:12px; min-height: unset; cursor:pointer;" onclick="addPOSCart(${p.id})">
                    <strong style="font-size:14px;">${p.name}</strong>
                    <div class="product-price-row" style="margin-top: 8px;">
                        <span class="product-price" style="font-size:15px;">${window.formatCurrency(p.price)}</span>
                        <span style="font-size:11px; color:var(--text-secondary);">Stock: ${p.stock}</span>
                    </div>
                </div>
            `;
        });
        window.posProducts = products;
    } catch (err) {
        console.error('Error loading POS products:', err);
    }
}

function startPOSStatusPoll() {
    if (posStatusPollInterval) clearInterval(posStatusPollInterval);
    if (!activeOrder) return;
    posStatusPollInterval = setInterval(async () => {
        if (!activeOrder) { clearInterval(posStatusPollInterval); posStatusPollInterval = null; return; }
        try {
            const res = await fetch(`${window.API_BASE}/orders/${activeOrder.id}`);
            if (res.ok) {
                const updated = await res.json();
                const oldStatus = activeOrder.status;
                activeOrder = updated;
                updatePOSStatusBadge(updated.status);
                if (oldStatus !== updated.status) {
                    updatePOSCartUI();
                }
            }
        } catch (_) {}
    }, 5000);
}

function updatePOSStatusBadge(status) {
    const el = document.getElementById('pos-table-status');
    if (!el) return;
    const info = POS_STATUS_MAP[status] || { label: status, badge: 'badge-pending' };
    el.textContent = info.label;
    el.className = 'badge ' + info.badge;
    el.style.display = 'inline-block';
}

window.selectPOSTable = async (tableId, tableName, status) => {
    if (posStatusPollInterval) { clearInterval(posStatusPollInterval); posStatusPollInterval = null; }
    activeTable = { id: tableId, name: tableName, status };
    document.getElementById('pos-active-table-name').textContent = tableName;
    posCart = [];
    activeOrder = null;
    
    const checkoutBtn = document.getElementById('btn-checkout-table');
    const statusBadge = document.getElementById('pos-table-status');
    if (statusBadge) statusBadge.style.display = 'none';
    
    if (status === 'OCCUPIED') {
        try {
            const res = await fetch(`${window.API_BASE}/orders/active-table/${tableId}`);
            if (res.ok) {
                activeOrder = await res.json();
                if (checkoutBtn) checkoutBtn.style.display = 'block';
                updatePOSStatusBadge(activeOrder.status);
                startPOSStatusPoll();
                
                activeOrder.orderItems.forEach(item => {
                    posCart.push({
                        id: item.product.id,
                        name: item.product.name,
                        price: item.unitPrice,
                        qty: item.quantity,
                        readonly: true
                    });
                });
            }
        } catch (err) {
            window.showToast('Error cargando pedido de la mesa', 'error');
        }
    } else {
        if (checkoutBtn) checkoutBtn.style.display = 'none';
    }
    
    updatePOSCartUI();
};

window.addPOSCart = (prodId) => {
    if (activeOrderType === 'LOCAL' && !activeTable) {
        window.showToast('Por favor, seleccione una mesa primero.', 'warning');
        return;
    }
    
    const prod = window.posProducts.find(p => p.id === prodId);
    if (!prod) return;
    
    if (prod.stock <= 0) {
        window.showToast('Producto sin stock', 'warning');
        return;
    }
    
    // Check if item already exists in cart
    const existing = posCart.find(item => item.id === prodId && !item.readonly);
    if (existing) {
        existing.qty++;
    } else {
        posCart.push({
            id: prod.id,
            name: prod.name,
            price: prod.price,
            qty: 1,
            readonly: false
        });
    }
    
    updatePOSCartUI();
};

function updatePOSCartUI() {
    const list = document.getElementById('pos-cart-items');
    const totalEl = document.getElementById('pos-cart-total');
    if (!list) return;
    
    list.innerHTML = '';
    let total = 0;
    
    // Render existing order items with per-item serve status
    if (activeOrder && activeOrder.orderItems) {
        activeOrder.orderItems.forEach(item => {
            total += item.unitPrice * item.quantity;
            const badge = item.isServed
                ? '<span class="badge badge-served" style="font-size:9px; padding:2px 6px;">Servido</span>'
                : '<span class="badge badge-preparing" style="font-size:9px; padding:2px 6px;">En cocina</span>';
            list.innerHTML += `
                <div class="cart-item">
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.product.name} ${badge}</div>
                        <div class="cart-item-price">${window.formatCurrency(item.unitPrice)}</div>
                    </div>
                    <div class="cart-item-qty"><span>${item.quantity}</span></div>
                </div>
            `;
        });
    }
    
    // Render new items not yet sent
    posCart.forEach(item => {
        if (item.readonly) return; // already rendered from activeOrder
        total += item.price * item.qty;
        list.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name} <span class="badge badge-pending" style="font-size:9px; padding:2px 6px;">Nuevo</span></div>
                    <div class="cart-item-price">${window.formatCurrency(item.price)}</div>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="changePOSCartQty(${item.id}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="changePOSCartQty(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    });
    
    if (totalEl) totalEl.textContent = window.formatCurrency(total);
}

window.changePOSCartQty = (prodId, val) => {
    const item = posCart.find(i => i.id === prodId && !i.readonly);
    if (!item) return;
    
    item.qty += val;
    if (item.qty <= 0) {
        posCart = posCart.filter(i => !(i.id === prodId && !i.readonly));
    }
    updatePOSCartUI();
};

window.sendPOSOrder = async () => {
    if (activeOrderType === 'LOCAL' && !activeTable) return;
    
    const newItems = posCart.filter(item => !item.readonly);
    if (newItems.length === 0) {
        window.showToast('No hay nuevos productos agregados', 'warning');
        return;
    }
    
    // Validate stock before sending
    for (const item of newItems) {
        const prod = window.posProducts.find(p => p.id === item.id);
        if (prod && prod.stock < item.qty) {
            window.showToast('Stock insuficiente para ' + prod.name + '. Disponible: ' + prod.stock, 'warning');
            return;
        }
    }
    
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
        if (activeOrder) {
            // Append items to existing order
            const res = await fetch(`${window.API_BASE}/orders/${activeOrder.id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItems.map(i => ({ productId: i.id, quantity: i.qty, notes: '' })))
            });
            if (res.ok) {
                window.showToast('Comanda actualizada y enviada a cocina', 'success');
                if (activeOrderType === 'LOCAL') {
                    window.selectPOSTable(activeTable.id, activeTable.name, 'OCCUPIED');
                } else {
                    activeOrder = await res.json();
                    posCart = [];
                    updatePOSStatusBadge(activeOrder.status);
                    startPOSStatusPoll();
                    updatePOSCartUI();
                }
            }
        } else {
            // Create a brand new order
            const payload = {
                orderType: activeOrderType,
                userId: user ? user.id : null,
                items: newItems.map(i => ({ productId: i.id, quantity: i.qty, notes: '' }))
            };
            
            if (activeOrderType === 'LOCAL') {
                payload.tableId = activeTable.id;
            } else {
                payload.customerName = document.getElementById('pos-customer-name').value.trim() || 'Público General';
                payload.customerPhone = document.getElementById('pos-customer-phone').value.trim() || '';
                if (activeOrderType === 'DELIVERY') {
                    const address = document.getElementById('pos-customer-address').value.trim();
                    if (!address) {
                        window.showToast('La dirección de envío es requerida para pedidos de Delivery.', 'warning');
                        return;
                    }
                    payload.deliveryAddress = address;
                }
            }
            
            const res = await fetch(`${window.API_BASE}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                activeOrder = await res.json();
                window.showToast('Nuevo pedido registrado y enviado a cocina', 'success');
                
                // Show checkout button to allow billing/invoice payment
                const checkoutBtn = document.getElementById('btn-checkout-table');
                if (checkoutBtn) {
                    checkoutBtn.textContent = activeOrderType === 'LOCAL' ? '💸 Cobrar Consumo (Facturar)' : '💸 Cobrar Pedido (Facturar)';
                    checkoutBtn.style.display = 'block';
                }
                
                if (activeOrderType === 'LOCAL') {
                    window.selectPOSTable(activeTable.id, activeTable.name, 'OCCUPIED');
                    loadPOSTables();
                } else {
                    posCart = [];
                    updatePOSStatusBadge(activeOrder.status);
                    startPOSStatusPoll();
                    updatePOSCartUI();
                }
            } else {
                const data = await res.json();
                window.showToast('Error al registrar pedido: ' + (data.message || 'Error del servidor'), 'error');
            }
        }
    } catch (err) {
        window.showToast('Error de conexión al enviar comanda', 'error');
    }
};

window.updateDocInputLimit = () => {
    const type = document.getElementById('invoice-doc-type');
    const num = document.getElementById('invoice-cust-doc');
    if (!type || !num) return;
    const limits = { DNI: 8, RUC: 11, CE: 12 };
    num.maxLength = limits[type.value] || 8;
    num.placeholder = type.value + ' (' + num.maxLength + ' dígitos)';
    if (num.value.length > num.maxLength) num.value = num.value.slice(0, num.maxLength);
};

window.openCheckoutModal = () => {
    if (!activeOrder) return;
    
    document.getElementById('pay-order-total').textContent = window.formatCurrency(activeOrder.totalAmount);
    document.getElementById('invoice-cust-name').value = activeOrder.customerName || '';
    const cashInput = document.getElementById('pay-cash-amount');
    if (cashInput) cashInput.value = activeOrder.totalAmount;
    document.getElementById('pay-reference').value = '';
    
    // Reset to first section
    const pm = document.getElementById('pay-method');
    if (pm) {
        pm.value = 'CASH';
        pm.dispatchEvent(new Event('change'));
    }
    
    const payModal = document.getElementById('pay-modal');
    if (payModal) payModal.classList.add('active');
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pos-page')) {
        initPOS();
    }
});
