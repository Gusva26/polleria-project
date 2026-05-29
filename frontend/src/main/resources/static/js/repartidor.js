// El Dorado Pollería - Delivery Screen Module

window.deliveryInterval = null;

function initRepartidor() {
    window.loadDeliveryTickets();
    if (window.deliveryInterval) {
        clearInterval(window.deliveryInterval);
    }
    // Poll every 5 seconds for new tickets
    window.deliveryInterval = setInterval(window.loadDeliveryTickets, 5000);
}

window.loadDeliveryTickets = async () => {
    const container = document.getElementById('delivery-tickets');
    if (!container) return;
    
    try {
        const res = await fetch(`${window.API_BASE}/orders/delivery`);
        const orders = await res.json();
        
        container.innerHTML = '';
        if (orders.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px 0;">No hay despachos de delivery pendientes 🏍️</div>';
            return;
        }
        
        orders.forEach(o => {
            let itemsHtml = '';
            o.orderItems.forEach(item => {
                itemsHtml += `
                    <div class="ticket-item">
                        <div>
                            <span class="ticket-item-qty">${item.quantity}x</span>
                            <span>${item.product.name}</span>
                        </div>
                    </div>
                `;
            });
            
            let btnAction = '';
            let statusLabel = 'Preparado';
            let badgeClass = 'badge-ready';
            
            if (o.status === 'READY') {
                btnAction = `<button class="btn-gold" style="width:100%; margin-top: 10px;" onclick="updateOrderStatus(${o.id}, 'SHIPPED')">🏍️ Llevar Pedido</button>`;
                statusLabel = 'Listo para Despacho';
                badgeClass = 'badge-ready';
            } else if (o.status === 'SHIPPED') {
                btnAction = `<button class="btn-gold" style="width:100%; margin-top: 10px; background: var(--status-delivered);" onclick="updateOrderStatus(${o.id}, 'DELIVERED')">✔️ Entregado</button>`;
                statusLabel = 'En camino';
                badgeClass = 'badge-shipped';
            } else if (o.status === 'DELIVERED') {
                btnAction = `<span class="badge badge-completed" style="width:100%; text-align:center; padding: 10px 0;">Entregado - Pendiente Pago</span>`;
                statusLabel = 'Entregado';
                badgeClass = 'badge-delivered';
            }
            
            container.innerHTML += `
                <div class="glass-panel order-ticket animate-fade">
                    <div class="ticket-header">
                        <div>
                            <div class="ticket-title" style="font-size:16px;">Cliente: ${o.customerName || 'Cliente'}</div>
                            <span class="badge ${badgeClass}">${statusLabel}</span>
                        </div>
                    </div>
                    <div class="ticket-body" style="font-size: 13px;">
                        <strong>Dirección:</strong> <span>${o.deliveryAddress}</span><br/>
                        <strong>Teléfono:</strong> <span>${o.customerPhone}</span>
                        <div class="receipt-line"></div>
                        ${itemsHtml}
                        <div class="receipt-line"></div>
                        <div style="display:flex; justify-content:space-between; font-weight:bold;">
                            <span>Monto a cobrar:</span>
                            <span style="color:#f59e0b;">${window.formatCurrency(o.totalAmount)}</span>
                        </div>
                    </div>
                    <div class="ticket-footer" style="flex-direction:column;">
                        <span style="font-size:11px; color: var(--text-secondary);">Pedido #${o.id} - ${new Date(o.createdAt).toLocaleTimeString()}</span>
                        ${btnAction}
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error('Error loading delivery tickets:', err);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('repartidor-page')) {
        initRepartidor();
    }
});
