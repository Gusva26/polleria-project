// El Dorado Pollería - Admin Reportes Module

window.loadReportData = async () => {
    const tbody = document.getElementById('table-reports-body');
    if (!tbody) return;
    
    const startDateStr = document.getElementById('report-start-date').value;
    const endDateStr = document.getElementById('report-end-date').value;
    
    let startDate = startDateStr ? new Date(startDateStr + 'T00:00:00') : null;
    let endDate = endDateStr ? new Date(endDateStr + 'T23:59:59') : null;
    
    try {
        const res = await fetch(`${window.API_BASE}/orders`);
        const orders = await res.json();
        
        let completedOrders = orders.filter(o => o.status === 'COMPLETED');
        
        if (startDate) {
            completedOrders = completedOrders.filter(o => new Date(o.createdAt) >= startDate);
        }
        if (endDate) {
            completedOrders = completedOrders.filter(o => new Date(o.createdAt) <= endDate);
        }
        
        tbody.innerHTML = '';
        if (completedOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay ventas registradas en este período</td></tr>';
            return;
        }
        
        completedOrders.forEach(o => {
            const productsList = o.orderItems.map(item => `${item.quantity}x ${item.product.name}`).join(', ');
            const total = parseFloat(o.totalAmount);
            const baseAmount = total / 1.18;
            const igv = total - baseAmount;
            
            tbody.innerHTML += `
                <tr>
                    <td>#${o.id}</td>
                    <td>${new Date(o.createdAt).toLocaleString()}</td>
                    <td><span class="badge badge-role">${o.orderType}</span></td>
                    <td>${o.customerName || 'Público General'}</td>
                    <td>${productsList}</td>
                    <td>${window.formatCurrency(baseAmount)}</td>
                    <td>${window.formatCurrency(igv)}</td>
                    <td style="font-weight: bold; color: #10b981;">${window.formatCurrency(total)}</td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8">Error cargando reporte de ventas</td></tr>';
    }
};

window.exportReportToExcel = () => {
    const table = document.getElementById('report-sales-table');
    if (!table || typeof XLSX === 'undefined') {
        window.showToast('Librería de exportación a Excel no cargada', 'warning');
        return;
    }
    const wb = XLSX.utils.table_to_book(table, { sheet: "Ventas" });
    XLSX.writeFile(wb, "Reporte_Ventas_El_Dorado.xlsx");
};

window.exportReportToPDF = () => {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        window.showToast('Librería jsPDF no cargada aún', 'warning');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Pollería El Dorado - Reporte de Ventas", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 14, 28);
    
    if (typeof doc.autoTable !== 'function') {
        window.showToast('Librería autoTable para jsPDF no cargada aún', 'warning');
        return;
    }
    
    doc.autoTable({
        html: '#report-sales-table',
        startY: 35,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 8 },
        columnStyles: {
            4: { cellWidth: 50 }
        }
    });
    
    doc.save("Reporte_Ventas_El_Dorado.pdf");
};
