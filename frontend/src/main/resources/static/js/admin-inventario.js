// El Dorado Pollería - Inventory Management Module

window.allInventoryItems = [];

window.loadAdminInventory = async () => {
    const tbody = document.getElementById('table-inventory-body');
    if (!tbody) return;
    const spinner = document.getElementById('inventory-spinner');
    if (spinner) spinner.style.display = 'block';
    try {
        const res = await fetch(`${window.API_BASE}/inventory`);
        const items = await res.json();
        window.allInventoryItems = items;
        window.renderInventory(items);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7">Error cargando inventario</td></tr>';
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
};

window.renderInventory = (items) => {
    const tbody = document.getElementById('table-inventory-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No se encontraron insumos</td></tr>';
        return;
    }
    items.forEach(item => {
        const isLow = parseFloat(item.stock) <= parseFloat(item.minimumStock);
        const statusLabel = isLow ? 'Stock Bajo' : 'Normal';
        const badgeClass = isLow ? 'badge-alert' : 'badge-normal';
        tbody.innerHTML += `
            <tr>
                <td>${item.id}</td>
                <td><strong>${item.name}</strong></td>
                <td style="font-weight: bold; color: ${isLow ? '#ef4444' : '#10b981'};">${parseFloat(item.stock).toFixed(2)}</td>
                <td>${item.unit}</td>
                <td>${parseFloat(item.minimumStock).toFixed(2)}</td>
                <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-gold btn-sm" onclick="openStockAdjustment(${item.id}, '${item.name}')" title="Registrar movimiento de stock">Movimiento 🔄</button>
                        <button class="btn-outline btn-sm" onclick="viewTransactionHistory(${item.id}, '${item.name}')" title="Ver historial de transacciones">Historial 🕒</button>
                        <button class="btn-outline btn-sm" onclick="editInventoryItem(${item.id})" title="Editar insumo">Editar</button>
                        <button class="btn-gold btn-sm" style="background:#ef4444;" onclick="deleteInventoryItem(${item.id})" title="Eliminar insumo">Eliminar</button>
                    </div>
                </td>
            </tr>
        `;
    });
};

window.filterInventory = () => {
    const query = document.getElementById('search-inventory-input').value.toLowerCase().trim();
    let filtered = window.allInventoryItems || [];
    if (query) {
        filtered = filtered.filter(item => item.name.toLowerCase().includes(query));
    }
    window.renderInventory(filtered);
};

window.filterLowStock = () => {
    const input = document.getElementById('search-inventory-input');
    if (input) input.value = '';
    let filtered = (window.allInventoryItems || []).filter(item =>
        parseFloat(item.stock) <= parseFloat(item.minimumStock)
    );
    window.renderInventory(filtered);
};

window.openAddInventoryModal = () => {
    const form = document.getElementById('inventory-form');
    if (form) form.reset();
    const idField = document.getElementById('inventory-id-field');
    if (idField) idField.value = '';
    const title = document.getElementById('modal-inventory-title');
    if (title) title.textContent = 'Registrar Insumo';
    const initGroup = document.getElementById('inv-initial-stock-group');
    if (initGroup) initGroup.style.display = 'block';
    window.openModal('inventory-modal');
};

window.editInventoryItem = async (id) => {
    try {
        const res = await fetch(`${window.API_BASE}/inventory`);
        const items = await res.json();
        const item = items.find(i => i.id === id);
        if (!item) return;
        
        document.getElementById('inventory-id-field').value = item.id;
        document.getElementById('inv-name').value = item.name;
        document.getElementById('inv-unit').value = item.unit;
        document.getElementById('inv-min-stock').value = item.minimumStock;
        
        const initGroup = document.getElementById('inv-initial-stock-group');
        if (initGroup) initGroup.style.display = 'none';
        document.getElementById('modal-inventory-title').textContent = 'Editar Insumo';
        window.openModal('inventory-modal');
    } catch (err) {
        window.showToast('Error cargando insumo', 'error');
    }
};

window.deleteInventoryItem = async (id) => {
    if (!confirm('¿Está seguro de eliminar este insumo del inventario?')) return;
    try {
        const res = await fetch(`${window.API_BASE}/inventory/${id}`, { method: 'DELETE' });
        if (res.ok) {
            window.loadAdminInventory();
            window.loadStockAlertCount();
        } else {
            window.showToast('No se pudo eliminar el insumo.', 'error');
        }
    } catch (err) {
        window.showToast('Error de conexión', 'error');
    }
};

window.openStockAdjustment = (id, name) => {
    const form = document.getElementById('stock-adjustment-form');
    if (form) form.reset();
    document.getElementById('adj-item-id').value = id;
    document.getElementById('adj-item-name').value = name;
    window.openModal('stock-adjustment-modal');
};

window.viewTransactionHistory = async (id, name) => {
    const tbody = document.getElementById('table-history-body');
    if (!tbody) return;
    document.getElementById('modal-history-title').textContent = `Historial de ${name}`;
    try {
        const res = await fetch(`${window.API_BASE}/inventory/${id}/transactions`);
        const list = await res.json();
        tbody.innerHTML = '';
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay movimientos registrados</td></tr>';
        } else {
            list.forEach(tx => {
                const typeLabel = tx.transactionType === 'ENTRY' ? 'Ingreso (+)' : 'Salida (-)';
                const typeColor = tx.transactionType === 'ENTRY' ? '#10b981' : '#ef4444';
                tbody.innerHTML += `
                    <tr>
                        <td>${new Date(tx.createdAt).toLocaleString()}</td>
                        <td style="color: ${typeColor}; font-weight: bold;">${typeLabel}</td>
                        <td style="font-weight: bold;">${parseFloat(tx.quantity).toFixed(2)}</td>
                        <td>${tx.description || ''}</td>
                    </tr>
                `;
            });
        }
        window.openModal('transaction-history-modal');
    } catch (err) {
        window.showToast('Error cargando historial de transacciones', 'error');
    }
};

window.loadStockAlertCount = async () => {
    const badge = document.getElementById('admin-stock-alerts');
    if (!badge) return;
    try {
        const res = await fetch(`${window.API_BASE}/inventory/alerts`);
        const alerts = await res.json();
        badge.textContent = alerts.length + ' Insumos';
    } catch (err) {
        console.error(err);
    }
};

window.wireInventoryForm = () => {
    const form = document.getElementById('inventory-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('inventory-id-field').value;
        const name = document.getElementById('inv-name').value.trim();
        const unit = document.getElementById('inv-unit').value.trim();
        const minimumStock = parseFloat(document.getElementById('inv-min-stock').value);
        
        const payload = { name, unit, minimumStock };
        if (!id) {
            payload.stock = parseFloat(document.getElementById('inv-initial-stock').value) || 0.00;
        }
        
        const url = id ? `${window.API_BASE}/inventory/${id}` : `${window.API_BASE}/inventory`;
        const method = id ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                window.closeModal('inventory-modal');
                window.loadAdminInventory();
                window.loadStockAlertCount();
            } else {
                window.showToast('Error al guardar el insumo', 'error');
            }
        } catch (err) {
            window.showToast('Error de conexión', 'error');
        }
    });
};

window.wireStockAdjustmentForm = () => {
    const form = document.getElementById('stock-adjustment-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('adj-item-id').value;
        const transactionType = document.getElementById('adj-type').value;
        const quantity = parseFloat(document.getElementById('adj-qty').value);
        const description = document.getElementById('adj-desc').value.trim();
        
        const payload = { transactionType, quantity, description };
        
        try {
            const res = await fetch(`${window.API_BASE}/inventory/${id}/transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                window.closeModal('stock-adjustment-modal');
                window.loadAdminInventory();
                window.loadStockAlertCount();
            } else {
                const data = await res.json();
                window.showToast(data.message || 'Error al registrar la transacción', 'error');
            }
        } catch (err) {
            window.showToast('Error de conexión', 'error');
        }
    });
};
