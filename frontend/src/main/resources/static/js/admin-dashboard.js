// El Dorado Pollería - Admin Dashboard Module

window.chartSalesDate = null;
window.chartSalesCategory = null;
window.chartPayments = null;
window.chartTopProducts = null;

// Stats widget loader
window.loadAdminStats = async () => {
    const revenuesEl = document.getElementById('admin-revenues');
    const ordersEl = document.getElementById('admin-orders-count');
    const tablesEl = document.getElementById('admin-tables-busy');
    const alertsEl = document.getElementById('admin-stock-alerts');
    
    try {
        const resOrders = await fetch(`${window.API_BASE}/orders`);
        const orders = await resOrders.json();
        
        let revenues = 0;
        let completedCount = 0;
        
        const todayStr = new Date().toDateString();
        orders.forEach(o => {
            if (o.status === 'COMPLETED') {
                const orderDate = new Date(o.createdAt).toDateString();
                if (orderDate === todayStr) {
                    revenues += o.totalAmount;
                    completedCount++;
                }
            }
        });
        
        if (revenuesEl) revenuesEl.textContent = window.formatCurrency(revenues);
        if (ordersEl) ordersEl.textContent = completedCount + ' Pedidos';
        
        const resTables = await fetch(`${window.API_BASE}/tables`);
        const tables = await resTables.json();
        const occupiedTablesCount = tables.filter(t => t.status === 'OCCUPIED').length;
        if (tablesEl) tablesEl.textContent = `${occupiedTablesCount} / ${tables.length}`;
        
        const resAlerts = await fetch(`${window.API_BASE}/inventory/alerts`);
        const alerts = await resAlerts.json();
        if (alertsEl) alertsEl.textContent = alerts.length + ' Insumos';
        
    } catch (err) {
        console.error('Error loading admin stats:', err);
    }
};

// Dashboard Charts (Chart.js)
window.loadDashboardCharts = async () => {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js no cargado aún.');
        return;
    }
    
    // Resolve colors based on current theme
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isLight = theme === 'light';
    const tickColor = isLight ? '#475569' : '#9ca3af'; // Slate 600 vs Gray 400
    const gridColor = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.05)';
    const legendColor = isLight ? '#0f172a' : '#e5e7eb'; // Slate 900 vs Gray 200
    
    try {
        // Sales trend
        const resDate = await fetch(`${window.API_BASE}/reports/sales-by-date`);
        const dataDate = await resDate.json();
        const labelsDate = dataDate.map(d => d.date);
        const valuesDate = dataDate.map(d => d.amount);
        
        if (window.chartSalesDate) window.chartSalesDate.destroy();
        const ctxDate = document.getElementById('chart-sales-date');
        if (ctxDate) {
            window.chartSalesDate = new Chart(ctxDate, {
                type: 'line',
                data: {
                    labels: labelsDate,
                    datasets: [{
                        label: 'Ventas (S/.)',
                        data: valuesDate,
                        borderColor: '#f59e0b',
                        backgroundColor: isLight ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor } },
                        x: { grid: { display: false }, ticks: { color: tickColor } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
        
        // Sales by Category
        const resCat = await fetch(`${window.API_BASE}/reports/sales-by-category`);
        const dataCat = await resCat.json();
        const labelsCat = dataCat.map(d => d.categoryName);
        const valuesCat = dataCat.map(d => d.amount);
        
        if (window.chartSalesCategory) window.chartSalesCategory.destroy();
        const ctxCat = document.getElementById('chart-sales-category');
        if (ctxCat) {
            window.chartSalesCategory = new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: labelsCat,
                    datasets: [{
                        data: valuesCat,
                        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: legendColor } } }
                }
            });
        }
        
        // Payment methods
        const resPay = await fetch(`${window.API_BASE}/reports/payment-methods`);
        const dataPay = await resPay.json();
        const labelsPay = dataPay.map(d => d.method);
        const valuesPay = dataPay.map(d => d.amount);
        
        if (window.chartPayments) window.chartPayments.destroy();
        const ctxPay = document.getElementById('chart-payments');
        if (ctxPay) {
            window.chartPayments = new Chart(ctxPay, {
                type: 'bar',
                data: {
                    labels: labelsPay,
                    datasets: [{
                        label: 'Monto Recaudado',
                        data: valuesPay,
                        backgroundColor: ['#10b981', '#3b82f6', '#ec4899', '#f59e0b']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor } },
                        x: { grid: { display: false }, ticks: { color: tickColor } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
        
        // Top 5 Products
        const resProd = await fetch(`${window.API_BASE}/reports/sales-by-product`);
        const dataProd = await resProd.json();
        const labelsProd = dataProd.map(d => d.productName);
        const valuesProd = dataProd.map(d => d.quantity);
        
        if (window.chartTopProducts) window.chartTopProducts.destroy();
        const ctxProd = document.getElementById('chart-top-products');
        if (ctxProd) {
            window.chartTopProducts = new Chart(ctxProd, {
                type: 'bar',
                data: {
                    labels: labelsProd,
                    datasets: [{
                        label: 'Unidades Vendidas',
                        data: valuesProd,
                        backgroundColor: 'rgba(245, 158, 11, 0.8)'
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor } },
                        y: { grid: { display: false }, ticks: { color: tickColor } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    } catch (err) {
        console.error('Error cargando gráficas:', err);
    }
};
