// Immediately apply saved theme to avoid flash (FOUC)
(function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// El Dorado Pollería - Core JavaScript Helper & Auth Guard

// Secure fetch wrapper — adds auth token to every request
const ORIGINAL_FETCH = window.fetch.bind(window);
window.fetch = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        options.headers = options.headers || {};
        options.headers['X-Auth-Token'] = token;
    }
    options.credentials = 'include';
    const res = await ORIGINAL_FETCH(url, options);
    if (res.status === 401) {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('customerUser');
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login') && !currentPath.includes('register') &&
            !currentPath.includes('forgot-password') && !currentPath.includes('reset-password') &&
            !currentPath.includes('verify-email') && !currentPath.includes('home')) {
            window.location.href = '/login';
        }
    }
    return res;
};

// Resolve BACKEND_URL dynamically from the meta tag
const backendUrlMeta = document.querySelector('meta[name="backend-url"]');
window.API_BASE = (backendUrlMeta && backendUrlMeta.getAttribute('content')) || 'http://localhost:8080/api';

// Currency Formatter Utility
window.formatCurrency = (amount) => {
    return 'S/. ' + parseFloat(amount).toFixed(2);
};

// Password validation utility (used by login, reset-password, admin-personal)
window.validatePassword = (pwd) => {
    const errors = [];
    if (!pwd || pwd.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(pwd)) errors.push('Al menos una mayúscula');
    if (!/[a-z]/.test(pwd)) errors.push('Al menos una minúscula');
    if (!/\d/.test(pwd)) errors.push('Al menos un número');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) errors.push('Al menos un carácter especial');
    return errors;
};

// Global Theme Switcher & UI Synchronizer
window.updateThemeToggleUI = (theme) => {
    // 1. Sidebar toggle button inside admin panel
    const toggleIcon = document.getElementById('theme-toggle-icon');
    const toggleText = document.getElementById('theme-toggle-text');
    if (toggleIcon && toggleText) {
        if (theme === 'light') {
            toggleIcon.textContent = '🌙';
            toggleText.textContent = 'Modo Oscuro';
        } else {
            toggleIcon.textContent = '☀️';
            toggleText.textContent = 'Modo Claro';
        }
    }
    
    // 2. Navbar toggle buttons on other pages
    const navToggleBtn = document.getElementById('theme-toggle-nav-btn');
    if (navToggleBtn) {
        navToggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
    }
};

window.toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    window.updateThemeToggleUI(newTheme);
    
    // Dispatch custom event for dynamic components like Chart.js
    const event = new CustomEvent('themechange', { detail: { theme: newTheme } });
    document.dispatchEvent(event);
};

// Global authentication checks
window.initAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('auth_token');
    const path = window.location.pathname;
    const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/home'];
    const isPublic = publicPaths.some(p => path.startsWith(p));
    
    // Redirect to login if accessing a secured page without auth
    if (!token && !isPublic) {
        window.location.href = '/login';
        return;
    }
    
    // Authorization check for roles on the current page / default tab
    if (user && token) {
        const defaultTabMeta = document.querySelector('meta[name="default-tab"]');
        const defaultTab = (defaultTabMeta && defaultTabMeta.getAttribute('content')) || 'dashboard';
        
        const TAB_ROLES = {
            'dashboard': ['ROLE_ADMIN'],
            'productos': ['ROLE_ADMIN'],
            'categorias': ['ROLE_ADMIN'],
            'mesas': ['ROLE_ADMIN'],
            'inventario': ['ROLE_ADMIN'],
            'personal': ['ROLE_ADMIN'],
            'comprobantes': ['ROLE_ADMIN'],
            'reportes': ['ROLE_ADMIN'],
            'pos': ['ROLE_ADMIN', 'ROLE_CAJERO', 'ROLE_MESERO'],
            'cocina': ['ROLE_ADMIN', 'ROLE_COCINERO'],
            'mesero': ['ROLE_ADMIN', 'ROLE_MESERO'],
            'repartidor': ['ROLE_ADMIN', 'ROLE_REPARTIDOR']
        };

        const DEFAULT_PATH_BY_ROLE = {
            'ROLE_ADMIN': '/admin',
            'ROLE_CAJERO': '/pos',
            'ROLE_COCINERO': '/cocina',
            'ROLE_MESERO': '/mesero',
            'ROLE_REPARTIDOR': '/repartidor'
        };

        const allowedRoles = TAB_ROLES[defaultTab];
        if (allowedRoles && !allowedRoles.includes(user.role)) {
            const defaultPath = DEFAULT_PATH_BY_ROLE[user.role] || '/';
            window.location.href = defaultPath;
            return;
        }
    }

    
    // Setup logout buttons if any
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch(window.API_BASE + '/auth/logout', { method: 'POST' });
            } catch (_) {}
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('customerUser');
            window.location.href = '/login';
        });
    }
    
    // Render current user profile info in navbar
    const userInfoEl = document.getElementById('user-profile-info');
    if (userInfoEl && user) {
        userInfoEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="badge badge-role">${user.role.replace('ROLE_', '')}</span>
                <span style="font-size: 13px; font-weight: 600;">${user.firstName}</span>
            </div>
        `;
    }
};

// Shared Order Status Updater (Kitchen, Waiter, and Delivery monitors)
window.updateOrderStatus = async (orderId, newStatus) => {
    try {
        const res = await fetch(`${window.API_BASE}/orders/${orderId}/status?status=${newStatus}`, {
            method: 'PUT'
        });
        if (res.ok) {
            if (typeof window.loadKitchenTickets === 'function' && document.getElementById('kitchen-tickets')) {
                window.loadKitchenTickets();
            }
            if (typeof window.loadWaiterTickets === 'function' && document.getElementById('waiter-tickets')) {
                window.loadWaiterTickets();
            }
            if (typeof window.loadDeliveryTickets === 'function' && document.getElementById('delivery-tickets')) {
                window.loadDeliveryTickets();
            }
        }
    } catch (err) {
        window.showToast('Error actualizando estado', 'error');
    }
};

// Premium Notification/Toast System
window.showToast = (message, type = 'success') => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 25px;
            right: 25px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    
    // Icon Selection
    let icon = '🔔';
    let borderColor = 'rgba(255, 255, 255, 0.08)';
    let progressColor = 'var(--accent)';
    
    if (type === 'success') {
        icon = '✅';
        borderColor = 'rgba(16, 185, 129, 0.2)';
        progressColor = '#10b981';
    } else if (type === 'error' || type === 'danger') {
        icon = '❌';
        borderColor = 'rgba(239, 68, 68, 0.2)';
        progressColor = '#ef4444';
    } else if (type === 'warning' || type === 'info') {
        icon = '⚠️';
        borderColor = 'rgba(245, 158, 11, 0.2)';
        progressColor = '#f59e0b';
    }

    toast.style.cssText = `
        min-width: 320px;
        max-width: 400px;
        background: var(--bg-surface);
        backdrop-filter: var(--glass-blur);
        -webkit-backdrop-filter: var(--glass-blur);
        border: 1px solid ${borderColor};
        border-radius: 12px;
        padding: 16px;
        box-shadow: var(--shadow-premium);
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 12px;
        position: relative;
        overflow: hidden;
        pointer-events: auto;
        transform: translateX(100px);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    toast.innerHTML = `
        <span style="font-size: 20px; flex-shrink: 0;">${icon}</span>
        <div style="flex-grow: 1; font-family: var(--font-body); font-size: 13px; font-weight: 500; line-height: 1.4;">${message}</div>
        <button style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; font-size:16px; padding:4px;" onclick="this.parentElement.remove()">×</button>
        <div style="position: absolute; bottom: 0; left: 0; height: 3px; width: 100%; background: ${progressColor}; transition: transform 4s linear; transform-origin: left; transform: scaleX(1);"></div>
    `;

    container.appendChild(toast);

    // Trigger animate-in after a tick
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
        
        // Progress bar animation
        const progressBar = toast.querySelector('div:last-child');
        if (progressBar) {
            progressBar.style.transform = 'scaleX(0)';
        }
    }, 10);

    // Self-destruct after 4 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
};

// Override standard browser alert for all modules
window.alert = (message) => {
    const isError = /error|falló|incorrecta|inválido|no pudo|menor|obligatoria/i.test(message);
    window.showToast(message, isError ? 'error' : 'success');
};

// Run auth check and theme UI update automatically on script load
document.addEventListener('DOMContentLoaded', () => {
    window.initAuth();
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    window.updateThemeToggleUI(currentTheme);
});
