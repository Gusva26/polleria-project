package com.dorado.controller;

import com.dorado.model.Invoice;
import com.dorado.model.Order;
import com.dorado.repository.InvoiceRepository;
import com.dorado.repository.OrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/invoices")
@CrossOrigin(origins = "*")
public class InvoiceController {

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;

    public InvoiceController(InvoiceRepository invoiceRepository, OrderRepository orderRepository) {
        this.invoiceRepository = invoiceRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping
    public java.util.List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<Invoice> getInvoiceByOrderId(@PathVariable Long orderId) {
        return invoiceRepository.findByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> generateInvoice(@RequestBody InvoiceRequest request) {
        Optional<Order> orderOpt = orderRepository.findById(request.getOrderId());
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Pedido no encontrado"));
        }

        Order order = orderOpt.get();
        
        // Check if invoice already exists
        Optional<Invoice> existingInvoice = invoiceRepository.findByOrderId(request.getOrderId());
        if (existingInvoice.isPresent()) {
            return ResponseEntity.ok(existingInvoice.get());
        }

        String type = request.getInvoiceType().toUpperCase(); // TICKET, BOLETA, FACTURA
        String prefix = "T001-";
        if ("BOLETA".equals(type)) {
            prefix = "B001-";
        } else if ("FACTURA".equals(type)) {
            prefix = "F001-";
        }

        // Generate sequential document number
        String documentNumber = generateNextDocumentNumber(type, prefix);

        // Calculate IGV (18%) and base amount
        // Peru: prices are tax-inclusive
        BigDecimal total = order.getTotalAmount();
        BigDecimal baseAmount = total.divide(new BigDecimal("1.18"), 4, RoundingMode.HALF_UP);
        BigDecimal igv = total.subtract(baseAmount).setScale(2, RoundingMode.HALF_UP);

        Invoice invoice = new Invoice();
        invoice.setOrder(order);
        invoice.setInvoiceType(type);
        invoice.setDocumentNumber(documentNumber);
        invoice.setCustomerName(request.getCustomerName() != null ? request.getCustomerName() : order.getCustomerName());
        invoice.setCustomerDocument(request.getCustomerDocument() != null ? request.getCustomerDocument() : "");
        invoice.setDocumentType(request.getCustomerDocType() != null ? request.getCustomerDocType() : "DNI");
        invoice.setIgv(igv);
        invoice.setTotal(total);

        Invoice savedInvoice = invoiceRepository.save(invoice);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedInvoice);
    }

    private String generateNextDocumentNumber(String type, String prefix) {
        Optional<Invoice> lastInvoiceOpt = invoiceRepository.findTopByInvoiceTypeOrderByDocumentNumberDesc(type);
        
        int nextNum = 1;
        if (lastInvoiceOpt.isPresent()) {
            String docNum = lastInvoiceOpt.get().getDocumentNumber(); // E.g., B001-0000005
            try {
                String[] parts = docNum.split("-");
                if (parts.length == 2) {
                    nextNum = Integer.parseInt(parts[1]) + 1;
                }
            } catch (Exception e) {
                // Keep nextNum = 1
            }
        }
        
        return String.format("%s%07d", prefix, nextNum); // E.g. B001-0000001
    }

    // --- DTO ---
    public static class InvoiceRequest {
        private Long orderId;
        private String invoiceType;
        private String customerName;
        private String customerDocument;
        private String customerDocType;

        public Long getOrderId() { return orderId; }
        public void setOrderId(Long orderId) { this.orderId = orderId; }
        public String getInvoiceType() { return invoiceType; }
        public void setInvoiceType(String invoiceType) { this.invoiceType = invoiceType; }
        public String getCustomerName() { return customerName; }
        public void setCustomerName(String customerName) { this.customerName = customerName; }
        public String getCustomerDocument() { return customerDocument; }
        public void setCustomerDocument(String customerDocument) { this.customerDocument = customerDocument; }
        public String getCustomerDocType() { return customerDocType; }
        public void setCustomerDocType(String customerDocType) { this.customerDocType = customerDocType; }
    }
}
