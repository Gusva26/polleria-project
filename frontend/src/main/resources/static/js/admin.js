// El Dorado Pollería - Admin Panel Module (Orchestrator)

// Global Modal Helpers
window.openModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
};

window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
};

window.toggleSidebar = () => {
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebar-collapsed', isCollapsed);
        
        // If collapsed, close all dropdowns to keep it clean
        if (isCollapsed) {
            const dropdowns = sidebar.querySelectorAll('.sidebar-dropdown');
            dropdowns.forEach(d => d.classList.remove('open'));
        } else {
            // Re-expand the dropdown containing the active tab if expanding
            const activeTab = sidebar.querySelector('.sidebar-tab.active, .sidebar-link.active');
            if (activeTab) {
                const parentDropdown = activeTab.closest('.sidebar-dropdown');
                if (parentDropdown) {
                    parentDropdown.classList.add('open');
                }
            }
        }
    }
};

window.toggleSidebarDropdown = (btn) => {
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar && sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        localStorage.setItem('sidebar-collapsed', 'false');
    }
    const parent = btn.closest('.sidebar-dropdown');
    if (parent) {
        parent.classList.toggle('open');
    }
};

window.toggleMobileSidebar = () => {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
    if (overlay) {
        overlay.classList.toggle('active');
    }
};

function applySidebarRolePermissions(userRole) {
    const TAB_ROLES = {
        'dashboard': ['ROLE_ADMIN'],
        'productos': ['ROLE_ADMIN'],
        'categorias': ['ROLE_ADMIN'],
        'mesas': ['ROLE_ADMIN'],
        'inventario': ['ROLE_ADMIN'],
        'personal': ['ROLE_ADMIN'],
        'clientes': ['ROLE_ADMIN'],
        'comprobantes': ['ROLE_ADMIN'],
        'reportes': ['ROLE_ADMIN'],
        'pos': ['ROLE_ADMIN', 'ROLE_CAJERO', 'ROLE_MESERO'],
        'cocina': ['ROLE_ADMIN', 'ROLE_COCINERO'],
        'mesero': ['ROLE_ADMIN', 'ROLE_MESERO'],
        'repartidor': ['ROLE_ADMIN', 'ROLE_REPARTIDOR']
    };

    // 1. Filter all sidebar tabs/buttons
    const tabs = document.querySelectorAll('.sidebar-tab');
    tabs.forEach(tab => {
        const onclickAttr = tab.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes('switchAdminTab')) {
            const match = onclickAttr.match(/switchAdminTab\('([^']+)'/);
            if (match) {
                const tabName = match[1];
                const allowedRoles = TAB_ROLES[tabName];
                if (allowedRoles && !allowedRoles.includes(userRole)) {
                    tab.style.display = 'none';
                }
            }
        }
    });

    // 2. Hide dropdowns if all their options are hidden
    const dropdowns = document.querySelectorAll('.sidebar-dropdown');
    dropdowns.forEach(dropdown => {
        const content = dropdown.querySelector('.sidebar-dropdown-content');
        if (content) {
            const visibleTabs = Array.from(content.querySelectorAll('.sidebar-tab')).filter(t => t.style.display !== 'none');
            if (visibleTabs.length === 0) {
                dropdown.style.display = 'none';
            }
        }
    });

    // 3. Clean up dividers in the sidebar-nav
    const nav = document.querySelector('.sidebar-nav');
    if (nav) {
        const children = Array.from(nav.children);
        let lastVisibleWasDivider = true; // hide any leading dividers
        children.forEach(child => {
            if (child.style.display === 'none') return;
            
            if (child.classList.contains('sidebar-divider')) {
                if (lastVisibleWasDivider) {
                    child.style.display = 'none';
                } else {
                    lastVisibleWasDivider = true;
                }
            } else {
                // Dropdowns or buttons might be hidden
                if (child.classList.contains('sidebar-dropdown') && child.style.display === 'none') {
                    return;
                }
                if (child.classList.contains('sidebar-tab') && child.style.display === 'none') {
                    return;
                }
                lastVisibleWasDivider = false;
            }
        });

        // Hide any trailing divider
        let lastVisible = null;
        children.forEach(child => {
            if (child.style.display !== 'none') {
                lastVisible = child;
            }
        });
        if (lastVisible && lastVisible.classList.contains('sidebar-divider')) {
            lastVisible.style.display = 'none';
        }
    }
}

function initAdmin() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role) {
        applySidebarRolePermissions(user.role);
    }

    if (typeof window.loadStockAlertCount === 'function') {
        window.loadStockAlertCount();
    }
    
    // Restore sidebar state from localStorage
    const sidebar = document.getElementById('admin-sidebar');

    if (sidebar) {
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
        } else {
            // Auto-expand parent dropdown for active tab on load
            const activeTab = sidebar.querySelector('.sidebar-tab.active');
            if (activeTab) {
                const parentDropdown = activeTab.closest('.sidebar-dropdown');
                if (parentDropdown) {
                    parentDropdown.classList.add('open');
                }
            }
        }
    }
    
    // Set default dates for reports tab
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const reportStart = document.getElementById('report-start-date');
    const reportEnd = document.getElementById('report-end-date');
    if (reportStart) reportStart.value = sevenDaysAgo.toISOString().split('T')[0];
    if (reportEnd) reportEnd.value = today;
    
    // Wire up forms from different modules if they are loaded
    if (typeof window.wireProductForm === 'function') window.wireProductForm();
    if (typeof window.wireCategoryForm === 'function') window.wireCategoryForm();
    if (typeof window.wireTableForm === 'function') window.wireTableForm();
    if (typeof window.wireUserForm === 'function') window.wireUserForm();
    if (typeof window.wireInventoryForm === 'function') window.wireInventoryForm();
    if (typeof window.wireStockAdjustmentForm === 'function') window.wireStockAdjustmentForm();

    // Switch to default tab (localStorage > URL param > meta tag > dashboard)
    const savedTab = localStorage.getItem('admin-last-tab');
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('tab');
    const defaultTabMeta = document.querySelector('meta[name="default-tab"]');
    const defaultTab = urlTab || savedTab || (defaultTabMeta && defaultTabMeta.getAttribute('content')) || 'dashboard';
    window.switchAdminTab(defaultTab);
}

window.switchAdminTab = (tabName, btnElement) => {
    // If targetContent does not exist in the DOM (e.g. on role-specific pages), redirect to the page hosting it.
    const targetContent = document.getElementById(`tab-${tabName}`);
    if (!targetContent) {
        const TAB_PATHS = {
            'pos': '/pos',
            'cocina': '/cocina',
            'mesero': '/mesero',
            'repartidor': '/repartidor'
        };
        const path = TAB_PATHS[tabName] || `/admin?tab=${tabName}`;
        window.location.href = path;
        return;
    }

    // Clear operational pollers when switching tabs
    if (window.kitchenInterval) {
        clearInterval(window.kitchenInterval);
        window.kitchenInterval = null;
    }
    if (window.waiterInterval) {
        clearInterval(window.waiterInterval);
        window.waiterInterval = null;
    }
    if (window.deliveryInterval) {
        clearInterval(window.deliveryInterval);
        window.deliveryInterval = null;
    }

    const tabs = document.querySelectorAll('.category-tab, .sidebar-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    let activeBtn = btnElement;
    if (!activeBtn) {
        tabs.forEach(tab => {
            const onclickAttr = tab.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`'${tabName}'`)) {
                activeBtn = tab;
            }
        });
    }
    
    if (activeBtn) {
        activeBtn.classList.add('active');
        const parentDropdown = activeBtn.closest('.sidebar-dropdown');
        if (parentDropdown && !parentDropdown.classList.contains('open')) {
            parentDropdown.classList.add('open');
        }
    }
    
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Remember last active tab for reload persistence
    localStorage.setItem('admin-last-tab', tabName);
    
    // Close mobile drawer on tab switch (if open)
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
    }
    if (overlay && overlay.classList.contains('active')) {
        overlay.classList.remove('active');
    }
    
    // Lazy load logic for tabs (delegating to submodules)
    if (tabName === 'dashboard') {
        if (typeof window.loadAdminStats === 'function') window.loadAdminStats();
        if (typeof window.loadDashboardCharts === 'function') window.loadDashboardCharts();
    } else if (tabName === 'productos') {
        if (typeof window.loadAdminProducts === 'function') window.loadAdminProducts();
        if (typeof window.loadCategoriesDropdown === 'function') window.loadCategoriesDropdown();
    } else if (tabName === 'categorias') {
        if (typeof window.loadAdminCategories === 'function') window.loadAdminCategories();
    } else if (tabName === 'mesas') {
        if (typeof window.loadAdminTables === 'function') window.loadAdminTables();
    } else if (tabName === 'personal') {
        if (typeof window.loadAdminUsers === 'function') window.loadAdminUsers();
        if (typeof window.loadRolesDropdown === 'function') window.loadRolesDropdown();
    } else if (tabName === 'clientes') {
        if (typeof window.loadAdminClientes === 'function') window.loadAdminClientes();
    } else if (tabName === 'inventario') {
        if (typeof window.loadAdminInventory === 'function') window.loadAdminInventory();
        if (typeof window.loadStockAlertCount === 'function') window.loadStockAlertCount();
    } else if (tabName === 'comprobantes') {
        if (typeof window.loadAdminInvoices === 'function') window.loadAdminInvoices();
    } else if (tabName === 'reportes') {
        if (typeof window.loadReportData === 'function') window.loadReportData();
    } else if (tabName === 'pos') {
        if (typeof initPOS === 'function') initPOS();
    } else if (tabName === 'cocina') {
        if (typeof initCocina === 'function') initCocina();
    } else if (tabName === 'mesero') {
        if (typeof initMesero === 'function') initMesero();
    } else if (tabName === 'repartidor') {
        if (typeof initRepartidor === 'function') initRepartidor();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-page')) {
        initAdmin();
        
        // Redraw charts when theme changes
        document.addEventListener('themechange', () => {
            const dashboardTab = document.getElementById('tab-dashboard');
            if (dashboardTab && dashboardTab.classList.contains('active')) {
                if (typeof window.loadDashboardCharts === 'function') {
                    window.loadDashboardCharts();
                }
            }
        });
    }
});
