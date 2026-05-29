// El Dorado Pollería - Personal/User Management Module

window.loadRolesDropdown = async (selectedId = null) => {
    const select = document.getElementById('user-role');
    if (!select) return;
    try {
        const res = await fetch(`${window.API_BASE}/users/roles`);
        const roles = await res.json();
        select.innerHTML = '<option value="">Seleccione Rol</option>';
        roles.forEach(r => {
            const selected = selectedId && r.id === selectedId ? 'selected' : '';
            const roleName = r.name.replace('ROLE_', '');
            select.innerHTML += `<option value="${r.id}" ${selected}>${roleName}</option>`;
        });
    } catch (err) {
        console.error(err);
    }
};

window.allUsers = [];

window.loadAdminUsers = async () => {
    const tbody = document.getElementById('table-users-body');
    if (!tbody) return;
    try {
        const res = await fetch(`${window.API_BASE}/users`);
        const users = await res.json();
        window.allUsers = users;
        window.populatePersonalRoleFilter(users);
        window.renderPersonal(users);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8">Error cargando personal</td></tr>';
    }
};

window.populatePersonalRoleFilter = (users) => {
    const select = document.getElementById('filter-personal-role');
    if (!select) return;
    const roles = new Set();
    users.forEach(u => {
        if (u.role) roles.add(u.role.name.replace('ROLE_', ''));
    });
    const currentValue = select.value;
    select.innerHTML = '<option value="">Todos los roles</option>';
    Array.from(roles).sort().forEach(r => {
        select.innerHTML += `<option value="${r}" ${currentValue === r ? 'selected' : ''}>${r}</option>`;
    });
};

window.renderPersonal = (users) => {
    const tbody = document.getElementById('table-users-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No se encontraron usuarios</td></tr>';
        return;
    }
    users.forEach(u => {
        const roleName = u.role ? u.role.name.replace('ROLE_', '') : 'N/A';
        const statusLabel = u.isActive ? 'Activo' : 'Inactivo';
        const badgeClass = u.isActive ? 'badge-normal' : 'badge-alert';
        tbody.innerHTML += `
            <tr>
                <td>${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.firstName}</td>
                <td>${u.lastName}</td>
                <td><span class="badge badge-role">${roleName}</span></td>
                <td>${u.email || ''}</td>
                <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-outline btn-sm" onclick="editUser(${u.id})" title="Editar usuario">Editar</button>
                        <button class="btn-gold btn-sm" style="background:#ef4444;" onclick="deleteUser(${u.id})" title="Desactivar usuario">Desactivar</button>
                    </div>
                </td>
            </tr>
        `;
    });
};

window.filterPersonal = () => {
    const query = document.getElementById('search-personal-input').value.toLowerCase().trim();
    const role = document.getElementById('filter-personal-role').value;
    let filtered = window.allUsers || [];
    if (query) {
        filtered = filtered.filter(u =>
            (u.firstName && u.firstName.toLowerCase().includes(query)) ||
            (u.lastName && u.lastName.toLowerCase().includes(query)) ||
            u.username.toLowerCase().includes(query)
        );
    }
    if (role) {
        filtered = filtered.filter(u => u.role && u.role.name.replace('ROLE_', '') === role);
    }
    window.renderPersonal(filtered);
};

window.openAddUserModal = () => {
    const form = document.getElementById('user-form');
    if (form) form.reset();
    const idField = document.getElementById('user-id-field');
    if (idField) idField.value = '';
    const title = document.getElementById('modal-user-title');
    if (title) title.textContent = 'Registrar Personal';
    const pwd = document.getElementById('user-password');
    if (pwd) {
        pwd.required = true;
        pwd.placeholder = 'Contraseña';
    }
    window.loadRolesDropdown();
    window.openModal('user-modal');
};

window.editUser = async (id) => {
    try {
        const res = await fetch(`${window.API_BASE}/users`);
        const users = await res.json();
        const u = users.find(usr => usr.id === id);
        if (!u) return;
        
        document.getElementById('user-id-field').value = u.id;
        document.getElementById('user-username').value = u.username;
        
        const pwd = document.getElementById('user-password');
        pwd.value = '';
        pwd.required = false;
        pwd.placeholder = 'Dejar en blanco para no cambiar';
        
        document.getElementById('user-first-name').value = u.firstName;
        document.getElementById('user-last-name').value = u.lastName;
        document.getElementById('user-email').value = u.email || '';
        document.getElementById('user-phone').value = u.phone || '';
        document.getElementById('user-active').checked = u.isActive;
        
        await window.loadRolesDropdown(u.role ? u.role.id : null);
        
        document.getElementById('modal-user-title').textContent = 'Editar Personal';
        window.openModal('user-modal');
    } catch (err) {
        window.showToast('Error cargando usuario', 'error');
    }
};

window.deleteUser = async (id) => {
    if (!confirm('¿Está seguro de desactivar a este personal?')) return;
    try {
        const res = await fetch(`${window.API_BASE}/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
            window.loadAdminUsers();
        } else {
            window.showToast('Error al desactivar', 'error');
        }
    } catch (err) {
        window.showToast('Error de conexión', 'error');
    }
};

window.wireUserForm = () => {
    const form = document.getElementById('user-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('user-id-field').value;
        const username = document.getElementById('user-username').value.trim();
        const password = document.getElementById('user-password').value.trim();
        const firstName = document.getElementById('user-first-name').value.trim();
        const lastName = document.getElementById('user-last-name').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const phone = document.getElementById('user-phone').value.trim();
        const roleId = parseInt(document.getElementById('user-role').value);
        const isActive = document.getElementById('user-active').checked;
        
        const payload = {
            username,
            firstName,
            lastName,
            email,
            phone,
            isActive,
            role: { id: roleId }
        };
        
        if (password) {
            const pwdErrors = window.validatePassword(password);
            if (pwdErrors.length > 0) {
                window.showToast('Contraseña inválida: ' + pwdErrors.join(', '), 'warning');
                return;
            }
            payload.password = password;
        } else if (!id) {
            window.showToast('La contraseña es obligatoria para nuevos usuarios', 'warning');
            return;
        }
        
        const url = id ? `${window.API_BASE}/users/${id}` : `${window.API_BASE}/users`;
        const method = id ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                window.closeModal('user-modal');
                window.loadAdminUsers();
            } else {
                const data = await res.json();
                window.showToast(data.message || 'Error al guardar usuario', 'error');
            }
        } catch (err) {
            window.showToast('Error de conexión', 'error');
        }
    });
};
