// El Dorado Pollería - Waiter Screen Module

window.waiterInterval = null;

function initMesero() {
    window.loadWaiterTickets();
    if (window.waiterInterval) {
        clearInterval(window.waiterInterval);
    }
    // Poll every 5 seconds for new tickets
    window.waiterInterval = setInterval(window.loadWaiterTickets, 5000);
}

window.loadWaiterTickets = async () => {
    const container = document.getElementById('waiter-tickets');
    if (!container) return;
    
    try {
        const res = await fetch(`${window.API_BASE}/orders/waiter`);
        const orders = await res.json();
        
        container.innerHTML = '';
        if (orders.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px 0;">No hay comandas para servir en salón 🍽️</div>';
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
            if (o.status === 'READY') {
                btnAction = `<button class="btn-gold" style="width:100%; margin-top: 10px; background: var(--status-served);" onclick="updateOrderStatus(${o.id}, 'SERVED')">🕺 Servir Mesa</button>`;
            }
            
            const badgeClass = o.status === 'READY' ? 'badge-ready' : 'badge-served';
            const statusLabel = o.status === 'READY' ? 'Listo para Servir' : 'Servido';
            const location = o.table ? o.table.tableNumber : 'Salón';
            
            container.innerHTML += `
                <div class="glass-panel order-ticket animate-fade">
                    <div class="ticket-header">
                        <div>
                            <div class="ticket-title">${location}</div>
                            <span class="badge ${badgeClass}">${statusLabel}</span>
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
        console.error('Error loading waiter tickets:', err);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('mesero-page')) {
        initMesero();
    }
});
