// El Dorado Pollería - Kitchen Screen Module

window.kitchenInterval = null;

function initCocina() {
    window.loadKitchenTickets();
    if (window.kitchenInterval) {
        clearInterval(window.kitchenInterval);
    }
    // Poll every 5 seconds for new tickets
    window.kitchenInterval = setInterval(window.loadKitchenTickets, 5000);
}

window.loadKitchenTickets = async () => {
    const container = document.getElementById('kitchen-tickets');
    if (!container) return;
    
    try {
        const res = await fetch(`${window.API_BASE}/orders/kitchen`);
        const orders = await res.json();
        
        container.innerHTML = '';
        if (orders.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px 0;">No hay pedidos pendientes en cocina 🍗</div>';
            return;
        }
        
        orders.forEach(o => {
            const foodItems = o.orderItems.filter(item =>
                item.product && item.product.category && item.product.category.name !== 'Bebidas'
            );
            if (foodItems.length === 0) return;
            
            let itemsHtml = '';
            foodItems.forEach(item => {
                itemsHtml += `
                    <div class="ticket-item">
                        <div>
                            <span class="ticket-item-qty">${item.quantity}x</span>
                            <span>${item.product.name}</span>
                            ${item.notes ? `<span class="ticket-item-notes">${item.notes}</span>` : ''}
                        </div>
                    </div>
                `;
            });
            
            let btnAction = '';
            if (o.status === 'PENDING') {
                btnAction = `<button class="btn-gold" style="width:100%; margin-top: 10px;" onclick="updateOrderStatus(${o.id}, 'PREPARING')">👩‍🍳 Preparar</button>`;
            } else if (o.status === 'PREPARING') {
                btnAction = `<button class="btn-gold" style="width:100%; margin-top: 10px; background: var(--status-ready);" onclick="updateOrderStatus(${o.id}, 'READY')">🔔 Listo</button>`;
            }
            
            const badgeClass = o.status === 'PENDING' ? 'badge-pending' : 'badge-preparing';
            const location = o.orderType === 'LOCAL' && o.table ? o.table.tableNumber : o.orderType;
            
            container.innerHTML += `
                <div class="glass-panel order-ticket animate-fade">
                    <div class="ticket-header">
                        <div>
                            <div class="ticket-title">${location}</div>
                            <span class="badge ${badgeClass}">${o.status}</span>
                        </div>
                        <span class="ticket-time">${new Date(o.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div class="ticket-body">
                        ${itemsHtml}
                    </div>
                    <div class="ticket-footer" style="flex-direction:column;">
                        <span style="font-size:12px; color: var(--text-secondary);">Pedido #${o.id}</span>
                        ${btnAction}
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error('Error loading kitchen tickets:', err);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cocina-page')) {
        initCocina();
    }
});
