// El Dorado Pollería - POS Receipt Helper Module

window.showReceiptPrint = (invoice, paymentMethod, amountPaid) => {
    const overlay = document.getElementById('receipt-modal');
    const container = document.getElementById('pos-receipt-print-container');
    if (!overlay || !container) return;
    
    let itemsRows = '';
    invoice.order.orderItems.forEach(item => {
        itemsRows += `
            <tr>
                <td>${item.quantity} x ${item.product.name}</td>
                <td class="receipt-right">${window.formatCurrency(item.unitPrice * item.quantity)}</td>
            </tr>
        `;
    });
    
    const change = paymentMethod === 'CASH' ? (amountPaid - invoice.total) : 0;
    
    container.innerHTML = `
        <div class="receipt-print animate-fade">
            <div class="receipt-header">
                <div class="receipt-title">POLLERÍA "EL DORADO"</div>
                <div>De: El Dorado S.A.C.</div>
                <div>RUC: 20123456789</div>
                <div>Av. El Sol 123 - Lima</div>
                <div class="receipt-line"></div>
                <strong>${invoice.invoiceType}: ${invoice.documentNumber}</strong><br/>
                <div>Fecha: ${new Date(invoice.createdAt).toLocaleString()}</div>
            </div>
            
            <table class="receipt-table">
                <thead>
                    <tr>
                        <th align="left">Detalle</th>
                        <th class="receipt-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>
            
            <div class="receipt-line"></div>
            
            <table class="receipt-table">
                <tr>
                    <td>OP. GRAVADA:</td>
                    <td class="receipt-right">${window.formatCurrency(invoice.total - invoice.igv)}</td>
                </tr>
                <tr>
                    <td>I.G.V. (18%):</td>
                    <td class="receipt-right">${window.formatCurrency(invoice.igv)}</td>
                </tr>
                <tr style="font-weight: bold;">
                    <td>TOTAL A PAGAR:</td>
                    <td class="receipt-right">${window.formatCurrency(invoice.total)}</td>
                </tr>
            </table>
            
            <div class="receipt-line"></div>
            
            <table class="receipt-table">
                <tr>
                    <td>MÉTODO DE PAGO:</td>
                    <td class="receipt-right">${paymentMethod}</td>
                </tr>
                <tr>
                    <td>PAGADO CON:</td>
                    <td class="receipt-right">${window.formatCurrency(amountPaid)}</td>
                </tr>
                <tr>
                    <td>VUELTO:</td>
                    <td class="receipt-right">${window.formatCurrency(change)}</td>
                </tr>
            </table>
            
            <div class="receipt-line"></div>
            
            <div class="receipt-header">
                <strong>Cliente:</strong><br/>
                <span>Doc: ${invoice.customerDocument || 'N/A'}</span><br/>
                <span>Nom: ${invoice.customerName || 'Público General'}</span>
                <div class="receipt-line"></div>
                <div>¡Gracias por su consumo!</div>
                <div>Vuelva pronto</div>
            </div>
        </div>
    `;
    
    overlay.classList.add('active');
    
    // Close button trigger
    const closeBtn = document.getElementById('close-receipt-modal');
    if (closeBtn) {
        closeBtn.onclick = () => overlay.classList.remove('active');
    }
};
