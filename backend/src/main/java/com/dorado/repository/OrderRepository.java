package com.dorado.repository;

import com.dorado.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findAllByOrderByCreatedAtDesc();
    
    List<Order> findByStatus(String status);
    
    List<Order> findByStatusIn(List<String> statuses);

    List<Order> findByOrderType(String orderType);

    List<Order> findByOrderTypeAndStatusIn(String orderType, List<String> statuses);

    // Find the active order for a table (status not COMPLETED or CANCELLED)
    @Query("SELECT o FROM Order o WHERE o.table.id = :tableId AND o.status NOT IN ('COMPLETED', 'CANCELLED')")
    Optional<Order> findActiveOrderByTableId(@Param("tableId") Long tableId);

    // Find orders by customer phone for "My Orders" feature
    List<Order> findByCustomerPhoneOrderByCreatedAtDesc(String customerPhone);
}
