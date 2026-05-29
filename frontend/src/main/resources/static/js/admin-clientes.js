window.allClientes = [];

window.loadAdminClientes = async () => {
    const tbody = document.getElementById('table-clientes-body');
    if (!tbody) return;
    const spinner = document.getElementById('clientes-spinner');
    if (spinner) spinner.style.display = 'block';
    try {
        const res = await fetch(`${window.API_BASE}/users/by-role?roleName=ROLE_CLIENTE`);
        const users = await res.json();
        window.allClientes = users;
        window.renderClientes(users);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7">Error cargando clientes</td></tr>';
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
};

window.renderClientes = (users) => {
    const tbody = document.getElementById('table-clientes-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No se encontraron clientes</td></tr>';
        return;
    }
    users.forEach(u => {
        const statusLabel = u.isActive ? 'Activo' : 'Inactivo';
        const badgeClass = u.isActive ? 'badge-normal' : 'badge-alert';
        const toggleLabel = u.isActive ? 'Desactivar' : 'Activar';
        const toggleColor = u.isActive ? '#ef4444' : '#22c55e';
        tbody.innerHTML += `
            <tr>
                <td>${u.id}</td>
                <td>${u.firstName || ''}</td>
                <td>${u.lastName || ''}</td>
                <td>${u.email || ''}</td>
                <td>${u.phone || ''}</td>
                <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-gold btn-sm" style="background:${toggleColor};" onclick="toggleClienteStatus(${u.id}, ${u.isActive})" title="${toggleLabel} cliente">${toggleLabel}</button>
                    </div>
                </td>
            </tr>
        `;
    });
};

window.filterClientes = () => {
    const query = document.getElementById('search-clientes-input').value.toLowerCase().trim();
    const status = document.getElementById('filter-clientes-status').value;
    let filtered = window.allClientes || [];
    if (query) {
        filtered = filtered.filter(u =>
            (u.firstName && u.firstName.toLowerCase().includes(query)) ||
            (u.lastName && u.lastName.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query))
        );
    }
    if (status === 'ACTIVO') {
        filtered = filtered.filter(u => u.isActive);
    } else if (status === 'INACTIVO') {
        filtered = filtered.filter(u => !u.isActive);
    }
    window.renderClientes(filtered);
};

window.toggleClienteStatus = async (id, currentStatus) => {
    if (!confirm(`¿Estás seguro de que deseas ${currentStatus ? 'desactivar' : 'activar'} este cliente?`)) return;
    try {
        const res = await fetch(`${window.API_BASE}/users/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !currentStatus })
        });
        if (res.ok) {
            window.loadAdminClientes();
            window.showToast(`Cliente ${currentStatus ? 'desactivado' : 'activado'} correctamente`, 'success');
        } else {
            const err = await res.text();
            window.showToast('Error al actualizar estado: ' + err, 'error');
        }
    } catch (err) {
        window.showToast('Error de conexión', 'error');
    }
};
