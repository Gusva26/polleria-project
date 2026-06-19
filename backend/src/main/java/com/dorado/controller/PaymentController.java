package com.dorado.controller;

import com.dorado.exception.BadRequestException;
import com.dorado.exception.ResourceNotFoundException;
import com.dorado.model.*;
import com.dorado.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final RestaurantTableRepository tableRepository;

    public PaymentController(PaymentRepository paymentRepository, 
                             OrderRepository orderRepository, 
                             RestaurantTableRepository tableRepository) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.tableRepository = tableRepository;
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<Payment> getPaymentByOrderId(@PathVariable Long orderId) {
        return paymentRepository.findByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Pago", "orderId", orderId));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_CAJERO', 'ROLE_MESERO')")
    public ResponseEntity<?> processPayment(@RequestBody PaymentRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", "id", request.getOrderId()));

        if ("COMPLETED".equals(order.getStatus())) {
            throw new BadRequestException("El pedido ya ha sido pagado");
        }

        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setPaymentMethod(request.getPaymentMethod().toUpperCase());
        payment.setPaymentStatus("PAID");
        payment.setAmountPaid(request.getAmountPaid());
        
        // Validate amount is not less than total
        if (request.getAmountPaid().compareTo(order.getTotalAmount()) < 0) {
            throw new BadRequestException("El monto pagado es menor al total del pedido");
        }
        payment.setChangeAmount(BigDecimal.ZERO);
        if (!"CASH".equalsIgnoreCase(request.getPaymentMethod())) {
            payment.setTransactionReference(request.getTransactionReference());
        }

        // Save payment
        Payment savedPayment = paymentRepository.save(payment);

        // Update Order status to COMPLETED unless autoComplete is false
        if (request.getAutoComplete() == null || request.getAutoComplete()) {
            order.setStatus("COMPLETED");
            orderRepository.save(order);

            // Free Table if it is local
            if (order.getTable() != null) {
                RestaurantTable table = order.getTable();
                table.setStatus("AVAILABLE");
                tableRepository.save(table);
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(savedPayment);
    }

    // --- DTO ---
    public static class PaymentRequest {
        private Long orderId;
        private String paymentMethod;
        private BigDecimal amountPaid;
        private String transactionReference;
        private Boolean autoComplete;

        public Long getOrderId() { return orderId; }
        public void setOrderId(Long orderId) { this.orderId = orderId; }
        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
        public BigDecimal getAmountPaid() { return amountPaid; }
        public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }
        public String getTransactionReference() { return transactionReference; }
        public void setTransactionReference(String transactionReference) { this.transactionReference = transactionReference; }
        public Boolean getAutoComplete() { return autoComplete; }
        public void setAutoComplete(Boolean autoComplete) { this.autoComplete = autoComplete; }
    }
}
