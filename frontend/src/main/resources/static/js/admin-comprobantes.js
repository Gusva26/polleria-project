// El Dorado Pollería - Invoice Management Module

window.allInvoices = [];

window.loadAdminInvoices = async () => {
    const tbody = document.getElementById('table-invoices-body');
    if (!tbody) return;
    const spinner = document.getElementById('invoices-spinner');
    if (spinner) spinner.style.display = 'block';
    try {
        const res = await fetch(`${window.API_BASE}/invoices`);
        const invoices = await res.json();
        window.allInvoices = invoices;
        window.renderInvoices(invoices);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="9">Error cargando comprobantes</td></tr>';
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
};

window.renderInvoices = (invoices) => {
    const tbody = document.getElementById('table-invoices-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No se encontraron comprobantes</td></tr>';
        return;
    }
    invoices.forEach(inv => {
        const statusLabel = inv.status || 'PAGADO';
        const statusBadgeClass = statusLabel === 'PENDIENTE' ? 'badge-pending' : statusLabel === 'ANULADO' ? 'badge-cancelled' : 'badge-completed';
        tbody.innerHTML += `
            <tr>
                <td>${inv.id}</td>
                <td><strong>${inv.documentNumber}</strong></td>
                <td><span class="badge badge-role">${inv.invoiceType}</span></td>
                <td><span class="badge ${statusBadgeClass}">${statusLabel}</span></td>
                <td>${inv.customerName || 'Público General'}</td>
                <td>${inv.customerDocument || '-'}</td>
                <td>${new Date(inv.createdAt).toLocaleString()}</td>
                <td style="font-weight: bold; color: #10b981;">${window.formatCurrency(inv.total)}</td>
                <td>
                    <button class="btn-gold btn-sm" onclick="viewInvoiceDetail(${inv.id})" title="Ver detalle del comprobante">Ver Detalle 📄</button>
                </td>
            </tr>
        `;
    });
};

window.searchInvoices = () => {
    const query = document.getElementById('search-invoice-input').value.toLowerCase().trim();
    const type = document.getElementById('filter-invoice-type').value;
    const status = document.getElementById('filter-invoice-status').value;
    const dateFrom = document.getElementById('filter-invoice-date-from').value;
    const dateTo = document.getElementById('filter-invoice-date-to').value;
    
    let filtered = window.allInvoices || [];
    if (query) {
        filtered = filtered.filter(inv => 
            inv.documentNumber.toLowerCase().includes(query) || 
            (inv.customerName && inv.customerName.toLowerCase().includes(query)) ||
            (inv.customerDocument && inv.customerDocument.toLowerCase().includes(query))
        );
    }
    if (type) {
        filtered = filtered.filter(inv => inv.invoiceType === type);
    }
    if (status) {
        filtered = filtered.filter(inv => (inv.status || 'PAGADO') === status);
    }
    if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        filtered = filtered.filter(inv => new Date(inv.createdAt) >= from);
    }
    if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter(inv => new Date(inv.createdAt) <= to);
    }
    window.renderInvoices(filtered);
};

window.viewInvoiceDetail = async (id) => {
    try {
        const res = await fetch(`${window.API_BASE}/invoices`);
        const invoices = await res.json();
        const invoice = invoices.find(inv => inv.id === id);
        if (!invoice) return;
        
        const container = document.getElementById('receipt-print-container');
        if (!container) return;
        
        let itemsRows = '';
        let order = invoice.order;
        if (!order.orderItems) {
            const orderRes = await fetch(`${window.API_BASE}/orders/${order.id}`);
            order = await orderRes.json();
        }
        
        order.orderItems.forEach(item => {
            itemsRows += `
                <tr>
                    <td>${item.quantity} x ${item.product.name}</td>
                    <td class="receipt-right">${window.formatCurrency(item.unitPrice * item.quantity)}</td>
                </tr>
            `;
        });
        
        const subtotal = invoice.total - invoice.igv;
        
        container.innerHTML = `
            <div class="receipt-print animate-fade" style="background:#fff; color:#000; padding:15px; font-family:monospace; font-size:12px;">
                <div style="text-align:center; margin-bottom:10px;">
                    <div style="font-size:14px; font-weight:bold;">POLLERÍA "EL DORADO"</div>
                    <div>De: El Dorado S.A.C.</div>
                    <div>RUC: 20123456789</div>
                    <div>Av. El Sol 123 - Lima</div>
                    <div style="border-top:1px dashed #000; margin:5px 0;"></div>
                    <strong>${invoice.invoiceType}: ${invoice.documentNumber}</strong><br/>
                    <div>Fecha: ${new Date(invoice.createdAt).toLocaleString()}</div>
                </div>
                
                <table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:12px;">
                    <thead>
                        <tr style="border-bottom:1px dashed #000;">
                            <th align="left">Detalle</th>
                            <th style="text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>
                
                <div style="border-top:1px dashed #000; margin:5px 0;"></div>
                
                <table style="width:100%; font-size:12px;">
                    <tr>
                        <td>OP. GRAVADA:</td>
                        <td style="text-align:right;">${window.formatCurrency(subtotal)}</td>
                    </tr>
                    <tr>
                        <td>I.G.V. (18%):</td>
                        <td style="text-align:right;">${window.formatCurrency(invoice.igv)}</td>
                    </tr>
                    <tr style="font-weight: bold;">
                        <td>TOTAL A PAGAR:</td>
                        <td style="text-align:right;">${window.formatCurrency(invoice.total)}</td>
                    </tr>
                </table>
                
                <div style="border-top:1px dashed #000; margin:5px 0;"></div>
                
                <div style="font-size:11px;">
                    <strong>Cliente:</strong><br/>
                    <span>Doc: ${invoice.customerDocument || 'N/A'}</span><br/>
                    <span>Nom: ${invoice.customerName || 'Público General'}</span>
                    <div style="border-top:1px dashed #000; margin:5px 0;"></div>
                    <div style="text-align:center;">¡Gracias por su consumo!</div>
                    <div style="text-align:center;">Vuelva pronto</div>
                </div>
            </div>
        `;
        
        window.openModal('invoice-detail-modal');
    } catch (err) {
        window.showToast('Error cargando detalles del comprobante', 'error');
    }
};

window.printInvoiceMock = () => {
    const container = document.getElementById('receipt-print-container');
    if (!container) return;
    const content = container.innerHTML;
    const win = window.open('', '_blank');
    if (win) {
        win.document.write('<html><head><title>Imprimir Comprobante</title></head><body onload="window.print();window.close();">');
        win.document.write(content);
        win.document.write('</body></html>');
        win.document.close();
    }
};
