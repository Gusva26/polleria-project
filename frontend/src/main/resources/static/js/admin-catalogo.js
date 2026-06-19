// El Dorado Pollería - Catalog Management Module (Products, Categories, Tables)

// 1. Products CRUD
window.allProducts = [];

window.loadAdminProducts = async () => {
    const tbody = document.getElementById('table-products-body');
    if (!tbody) return;
    
    try {
        const res = await fetch(`${window.API_BASE}/products`);
        const products = await res.json();
        window.allProducts = products;
        window.populateProductCategoryFilter(products);
        window.renderProducts(products);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8">Error al cargar productos.</td></tr>';
    }
};

window.populateProductCategoryFilter = (products) => {
    const select = document.getElementById('filter-productos-categoria');
    if (!select) return;
    const cats = new Set();
    products.forEach(p => {
        if (p.category) cats.add(JSON.stringify({ id: p.category.id, name: p.category.name }));
    });
    const currentValue = select.value;
    select.innerHTML = '<option value="">Todas las categorías</option>';
    Array.from(cats).sort().forEach(c => {
        const cat = JSON.parse(c);
        select.innerHTML += `<option value="${cat.id}" ${currentValue == cat.id ? 'selected' : ''}>${cat.name}</option>`;
    });
};

window.renderProducts = (products) => {
    const tbody = document.getElementById('table-products-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No se encontraron productos</td></tr>';
        return;
    }
    products.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.id}</td>
                <td>
                    <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=100'}" 
                         style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-color);"
                         onerror="this.src='https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=100'">
                </td>
                <td><strong>${p.name}</strong></td>
                <td><span class="badge badge-role">${p.category ? p.category.name : 'N/A'}</span></td>
                <td style="font-weight: bold; color: #10b981;">${window.formatCurrency(p.price)}</td>
                <td>${p.stock ?? 'N/A'}</td>
                <td>
                    <span class="badge ${p.isActive ? 'badge-normal' : 'badge-alert'}">${p.isActive ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-outline btn-sm" onclick="editProduct(${p.id})" title="Editar producto">Editar</button>
                        <button class="btn-gold btn-sm" style="background: #ef4444;" onclick="deleteProduct(${p.id})" title="Desactivar producto">Desactivar</button>
                    </div>
                </td>
            </tr>
        `;
    });
};

window.filterProductos = () => {
    const query = document.getElementById('search-productos-input').value.toLowerCase().trim();
    const catId = document.getElementById('filter-productos-categoria').value;
    let filtered = window.allProducts || [];
    if (query) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
    }
    if (catId) {
        filtered = filtered.filter(p => p.category && p.category.id == catId);
    }
    window.renderProducts(filtered);
};

window.loadCategoriesDropdown = async (selectedId = null) => {
    const select = document.getElementById('prod-category');
    if (!select) return;
    try {
        const res = await fetch(`${window.API_BASE}/products/categories`);
        const categories = await res.json();
        select.innerHTML = '<option value="">Seleccione Categoría</option>';
        categories.forEach(c => {
            const selected = selectedId && c.id === selectedId ? 'selected' : '';
            select.innerHTML += `<option value="${c.id}" ${selected}>${c.name}</option>`;
        });
    } catch (err) {
        console.error(err);
    }
};

window.openAddProductModal = () => {
    const form = document.getElementById('product-form');
    if (form) form.reset();
    const idField = document.getElementById('product-id-field');
    if (idField) idField.value = '';
    const title = document.getElementById('modal-product-title');
    if (title) title.textContent = 'Registrar Producto';
    window.loadCategoriesDropdown();
    window.openModal('product-modal');
};

window.editProduct = async (id) => {
    try {
        const res = await fetch(`${window.API_BASE}/products/${id}`);
        const p = await res.json();
        
        document.getElementById('product-id-field').value = p.id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-desc').value = p.description || '';
        document.getElementById('prod-img-url').value = p.imageUrl || '';
        document.getElementById('prod-active').checked = p.isActive;
        document.getElementById('prod-stock').value = p.stock;
        
        await window.loadCategoriesDropdown(p.category ? p.category.id : null);
        
        document.getElementById('modal-product-title').textContent = 'Editar Producto';
        window.openModal('product-modal');
    } catch (err) {
        window.showToast('Error cargando datos del producto', 'error');
    }
};

window.deleteProduct = async (id) => {
    if (!confirm('¿Está seguro de desactivar este producto?')) return;
    try {
        const res = await fetch(`${window.API_BASE}/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
            window.loadAdminProducts();
        }
    } catch (err) {
        window.showToast('Error al desactivar el producto', 'error');
    }
};

window.wireProductForm = () => {
    const form = document.getElementById('product-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('product-id-field').value;
        const name = document.getElementById('prod-name').value.trim();
        const price = parseFloat(document.getElementById('prod-price').value);
        const categoryId = parseInt(document.getElementById('prod-category').value);
        const description = document.getElementById('prod-desc').value.trim();
        const imageUrl = document.getElementById('prod-img-url').value.trim();
        const isActive = document.getElementById('prod-active').checked;
        
        const stock = parseInt(document.getElementById('prod-stock').value) || 999;
        
        const payload = {
            name, price, description, imageUrl, isActive, stock,
            category: { id: categoryId }
        };
        
        const url = id ? `${window.API_BASE}/products/${id}` : `${window.API_BASE}/products`;
        const method = id ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                window.closeModal('product-modal');
                window.loadAdminProducts();
                if (typeof window.loadAdminStats === 'function') window.loadAdminStats();
            } else {
                window.showToast('Error guardando producto', 'error');
            }
        } catch (err) {
            window.showToast('Error al conectar con el backend', 'error');
        }
    });
};

// 2. Categories CRUD
window.loadAdminCategories = async () => {
    const tbody = document.getElementById('table-categories-body');
    if (!tbody) return;
    try {
        const res = await fetch(`${window.API_BASE}/products/categories`);
        const categories = await res.json();
        tbody.innerHTML = '';
        categories.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td>${c.id}</td>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.description || ''}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-outline btn-sm" onclick="editCategory(${c.id})" title="Editar categoría">Editar</button>
                            <button class="btn-gold btn-sm" style="background:#ef4444;" onclick="deleteCategory(${c.id})" title="Eliminar categoría">Eliminar</button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4">Error cargando categorías</td></tr>';
    }
};

window.openAddCategoryModal = () => {
    const form = document.getElementById('category-form');
    if (form) form.reset();
    const idField = document.getElementById('category-id-field');
    if (idField) idField.value = '';
    const title = document.getElementById('modal-category-title');
    if (title) title.textContent = 'Registrar Categoría';
    window.openModal('category-modal');
};

window.editCategory = async (id) => {
    try {
        const res = await fetch(`${window.API_BASE}/products/categories`);
        const categories = await res.json();
        const c = categories.find(cat => cat.id === id);
        if (!c) return;
        
        document.getElementById('category-id-field').value = c.id;
        document.getElementById('cat-name').value = c.name;
        document.getElementById('cat-desc').value = c.description || '';
        
        document.getElementById('modal-category-title').textContent = 'Editar Categoría';
        window.openModal('category-modal');
    } catch (err) {
        window.showToast('Error al obtener categoría', 'error');
    }
};

window.deleteCategory = async (id) => {
    if (!confirm('¿Está seguro de eliminar esta categoría? Todos los productos asociados podrían verse afectados.')) return;
    try {
        const res = await fetch(`${window.API_BASE}/products/categories/${id}`, { method: 'DELETE' });
        if (res.ok) {
            window.loadAdminCategories();
        } else {
            window.showToast('No se pudo eliminar la categoría.', 'error');
        }
    } catch (err) {
        window.showToast('Error de conexión', 'error');
    }
};

window.wireCategoryForm = () => {
    const form = document.getElementById('category-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('category-id-field').value;
        const name = document.getElementById('cat-name').value.trim();
        const description = document.getElementById('cat-desc').value.trim();
        
        const payload = { name, description };
        const url = id ? `${window.API_BASE}/products/categories/${id}` : `${window.API_BASE}/products/categories`;
        const method = id ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                window.closeModal('category-modal');
                window.loadAdminCategories();
            } else {
                window.showToast('Error al guardar la categoría', 'error');
            }
        } catch (err) {
            window.showToast('Error de conexión', 'error');
        }
    });
};

// 3. Tables CRUD
window.loadAdminTables = async () => {
    const tbody = document.getElementById('table-tables-body');
    if (!tbody) return;
    try {
        const res = await fetch(`${window.API_BASE}/tables`);
        const tables = await res.json();
        tbody.innerHTML = '';
        tables.forEach(t => {
            const statusLabel = t.status === 'AVAILABLE' ? 'Libre' : 'Ocupada';
            const badgeClass = t.status === 'AVAILABLE' ? 'badge-normal' : 'badge-alert';
            tbody.innerHTML += `
                <tr>
                    <td>${t.id}</td>
                    <td><strong>${t.tableNumber}</strong></td>
                    <td>${t.capacity} personas</td>
                    <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-outline btn-sm" onclick="editTable(${t.id})" title="Editar mesa">Editar</button>
                            <button class="btn-gold btn-sm" style="background:#ef4444;" onclick="deleteTable(${t.id})" title="Eliminar mesa">Eliminar</button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5">Error cargando mesas</td></tr>';
    }
};

window.openAddTableModal = () => {
    const form = document.getElementById('table-form');
    if (form) form.reset();
    const idField = document.getElementById('table-id-field');
    if (idField) idField.value = '';
    const title = document.getElementById('modal-table-title');
    if (title) title.textContent = 'Registrar Mesa';
    window.openModal('table-modal');
};

window.editTable = async (id) => {
    try {
        const res = await fetch(`${window.API_BASE}/tables`);
        const tables = await res.json();
        const t = tables.find(tbl => tbl.id === id);
        if (!t) return;
        
        document.getElementById('table-id-field').value = t.id;
        document.getElementById('table-num-field').value = t.tableNumber;
        document.getElementById('table-cap-field').value = t.capacity;
        document.getElementById('table-status-field').value = t.status;
        
        document.getElementById('modal-table-title').textContent = 'Editar Mesa';
        window.openModal('table-modal');
    } catch (err) {
        window.showToast('Error cargando mesa', 'error');
    }
};

window.deleteTable = async (id) => {
    if (!confirm('¿Está seguro de eliminar esta mesa?')) return;
    try {
        const res = await fetch(`${window.API_BASE}/tables/${id}`, { method: 'DELETE' });
        if (res.ok) {
            window.loadAdminTables();
        } else {
            window.showToast('No se pudo eliminar la mesa.', 'error');
        }
    } catch (err) {
        window.showToast('Error de conexión', 'error');
    }
};

window.wireTableForm = () => {
    const form = document.getElementById('table-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('table-id-field').value;
        const tableNumber = document.getElementById('table-num-field').value.trim();
        const capacity = parseInt(document.getElementById('table-cap-field').value);
        const status = document.getElementById('table-status-field').value;
        
        const payload = { tableNumber, capacity, status };
        const url = id ? `${window.API_BASE}/tables/${id}` : `${window.API_BASE}/tables`;
        const method = id ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                window.closeModal('table-modal');
                window.loadAdminTables();
            } else {
                window.showToast('Error al guardar la mesa', 'error');
            }
        } catch (err) {
            window.showToast('Error de conexión', 'error');
        }
    });
};
