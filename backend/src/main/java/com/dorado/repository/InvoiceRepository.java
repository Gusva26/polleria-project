package com.dorado.repository;

import com.dorado.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByOrderId(Long orderId);
    
    // Find the latest invoice of a type to increment the number sequence
    Optional<Invoice> findTopByInvoiceTypeOrderByDocumentNumberDesc(String invoiceType);
}
