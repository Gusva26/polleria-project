package com.dorado.controller;

import com.dorado.model.*;
import com.dorado.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final RestaurantTableRepository tableRepository;
    private final PaymentRepository paymentRepository;

    public OrderController(OrderRepository orderRepository, 
                           ProductRepository productRepository, 
                           UserRepository userRepository,
                           RestaurantTableRepository tableRepository,
                           PaymentRepository paymentRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.tableRepository = tableRepository;
        this.paymentRepository = paymentRepository;
    }

    // GET ALL ORDERS (LATEST FIRST)
    @GetMapping
    public List<Order> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc();
    }

    // GET ORDERS FOR KITCHEN (PENDING & PREPARING, excluding served items and beverages)
    @GetMapping("/kitchen")
    public List<Map<String, Object>> getKitchenOrders() {
        List<Order> orders = orderRepository.findByStatusIn(Arrays.asList("PENDING", "PREPARING"));
        List<Map<String, Object>> result = new ArrayList<>();
        for (Order order : orders) {
            List<Map<String, Object>> foodItems = new ArrayList<>();
            for (OrderItem item : order.getOrderItems()) {
                if (item.getIsServed()) continue;
                if (item.getProduct() != null && item.getProduct().getCategory() != null
                    && "Bebidas".equals(item.getProduct().getCategory().getName())) continue;
                Map<String, Object> itemMap = new LinkedHashMap<>();
                itemMap.put("id", item.getId());
                itemMap.put("quantity", item.getQuantity());
                itemMap.put("unitPrice", item.getUnitPrice());
                itemMap.put("notes", item.getNotes());
                itemMap.put("product", item.getProduct());
                foodItems.add(itemMap);
            }
            if (foodItems.isEmpty()) continue;
            Map<String, Object> orderMap = new LinkedHashMap<>();
            orderMap.put("id", order.getId());
            orderMap.put("orderType", order.getOrderType());
            orderMap.put("status", order.getStatus());
            orderMap.put("createdAt", order.getCreatedAt());
            orderMap.put("notes", order.getNotes());
            orderMap.put("table", order.getTable());
            orderMap.put("orderItems", foodItems);
            result.add(orderMap);
        }
        return result;
    }

    // GET ORDERS FOR WAITER (READY TO SERVE, excluding already-served items)
    @GetMapping("/waiter")
    public List<Map<String, Object>> getWaiterOrders() {
        List<Order> orders = orderRepository.findByOrderTypeAndStatusIn("LOCAL", Arrays.asList("READY", "SERVED"));
        List<Map<String, Object>> result = new ArrayList<>();
        for (Order order : orders) {
            List<Map<String, Object>> pendingItems = new ArrayList<>();
            for (OrderItem item : order.getOrderItems()) {
                if (item.getIsServed()) continue;
                Map<String, Object> itemMap = new LinkedHashMap<>();
                itemMap.put("id", item.getId());
                itemMap.put("quantity", item.getQuantity());
                itemMap.put("unitPrice", item.getUnitPrice());
                itemMap.put("notes", item.getNotes());
                itemMap.put("product", item.getProduct());
                pendingItems.add(itemMap);
            }
            if (pendingItems.isEmpty()) continue;
            Map<String, Object> orderMap = new LinkedHashMap<>();
            orderMap.put("id", order.getId());
            orderMap.put("orderType", order.getOrderType());
            orderMap.put("status", order.getStatus());
            orderMap.put("createdAt", order.getCreatedAt());
            orderMap.put("notes", order.getNotes());
            orderMap.put("table", order.getTable());
            orderMap.put("orderItems", pendingItems);
            result.add(orderMap);
        }
        return result;
    }

    // GET DELIVERIES FOR MOTORIST (READY TO GO, SHIPPED)
    @GetMapping("/delivery")
    public List<Order> getDeliveryOrders() {
        return orderRepository.findByOrderTypeAndStatusIn("DELIVERY", Arrays.asList("READY", "SHIPPED", "DELIVERED"));
    }

    // GET ACTIVE ORDER FOR TABLE
    @GetMapping("/active-table/{tableId}")
    public ResponseEntity<Order> getActiveTableOrder(@PathVariable Long tableId) {
        return orderRepository.findActiveOrderByTableId(tableId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET ORDERS BY CUSTOMER PHONE (for "My Orders" feature)
    @GetMapping("/my-orders")
    public List<Order> getMyOrders(@RequestParam String phone) {
        return orderRepository.findByCustomerPhoneOrderByCreatedAtDesc(phone);
    }

    // CREATE NEW ORDER
    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody OrderRequest request) {
        Order order = new Order();
        order.setOrderType(request.getOrderType());
        order.setCustomerName(request.getCustomerName());
        order.setCustomerPhone(request.getCustomerPhone());
        order.setDeliveryAddress(request.getDeliveryAddress());
        order.setNotes(request.getNotes());
        order.setStatus("PENDING");

        // Set User if present
        if (request.getUserId() != null) {
            userRepository.findById(request.getUserId()).ifPresent(order::setUser);
        }

        // Set Table if LOCAL order
        if ("LOCAL".equalsIgnoreCase(request.getOrderType())) {
            if (request.getTableId() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Table ID is required for LOCAL orders"));
            }
            Optional<RestaurantTable> tableOpt = tableRepository.findById(request.getTableId());
            if (tableOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Table not found"));
            }
            RestaurantTable table = tableOpt.get();
            order.setTable(table);
            
            // Mark table as occupied
            table.setStatus("OCCUPIED");
            tableRepository.save(table);
        }

        // Map items and calculate total
        BigDecimal total = BigDecimal.ZERO;
        List<OrderItem> items = new ArrayList<>();
        
        for (OrderItemRequest itemReq : request.getItems()) {
            Optional<Product> prodOpt = productRepository.findById(itemReq.getProductId());
            if (prodOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Product ID " + itemReq.getProductId() + " not found"));
            }
            Product prod = prodOpt.get();
            
            OrderItem item = new OrderItem();
            item.setProduct(prod);
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(prod.getPrice());
            item.setNotes(itemReq.getNotes());
            item.setOrder(order);
            item.setIsServed(false);
            
            BigDecimal itemTotal = prod.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            total = total.add(itemTotal);
            
            items.add(item);
        }
        
        order.setOrderItems(items);
        order.setTotalAmount(total);
        
        Order savedOrder = orderRepository.save(order);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedOrder);
    }

    // ADD ITEMS TO EXISTING ORDER (POST-CONSUMPTION LOCAL TABLES FLOW)
    @PostMapping("/{orderId}/items")
    public ResponseEntity<?> addItemsToOrder(@PathVariable Long orderId, @RequestBody List<OrderItemRequest> itemReqs) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Order not found"));
        }
        Order order = orderOpt.get();
        if ("COMPLETED".equals(order.getStatus()) || "CANCELLED".equals(order.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot add items to completed or cancelled orders"));
        }

        BigDecimal additionalTotal = BigDecimal.ZERO;
        for (OrderItemRequest itemReq : itemReqs) {
            Optional<Product> prodOpt = productRepository.findById(itemReq.getProductId());
            if (prodOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Product not found"));
            }
            Product prod = prodOpt.get();

            OrderItem item = new OrderItem();
            item.setProduct(prod);
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(prod.getPrice());
            item.setNotes(itemReq.getNotes());
            item.setOrder(order);
            item.setIsServed(false);

            order.addOrderItem(item);
            additionalTotal = additionalTotal.add(prod.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity())));
        }

        order.setTotalAmount(order.getTotalAmount().add(additionalTotal));
        order.setStatus("PENDING");
        
        Order updatedOrder = orderRepository.save(order);
        return ResponseEntity.ok(updatedOrder);
    }

    // UPDATE ORDER STATUS (PENDING, PREPARING, READY, SERVED, SHIPPED, DELIVERED, COMPLETED, CANCELLED)
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return orderRepository.findById(id).map(order -> {
            String newStatus = status.toUpperCase();
            order.setStatus(newStatus);
            
            // If the order is cancelled, make table available and restore stock
            if ("CANCELLED".equals(newStatus)) {
                if (order.getTable() != null) {
                    RestaurantTable table = order.getTable();
                    table.setStatus("AVAILABLE");
                    tableRepository.save(table);
                }
                for (OrderItem item : order.getOrderItems()) {
                    Product prod = item.getProduct();
                    prod.setStock(prod.getStock() + item.getQuantity());
                    productRepository.save(prod);
                }
            }

            if ("SERVED".equals(newStatus)) {
                order.getOrderItems().forEach(item -> item.setIsServed(true));
            }

            // Auto-complete DELIVERED orders that have a PAID payment
            if ("DELIVERED".equals(newStatus)) {
                java.util.Optional<Payment> paymentOpt = paymentRepository.findByOrderId(order.getId());
                if (paymentOpt.isPresent() && "PAID".equals(paymentOpt.get().getPaymentStatus())) {
                    order.setStatus("COMPLETED");
                }
            }
            
            return ResponseEntity.ok(orderRepository.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- DTOs ---

    public static class OrderRequest {
        private Long userId;
        private String orderType;
        private Long tableId;
        private String customerName;
        private String customerPhone;
        private String deliveryAddress;
        private String notes;
        private List<OrderItemRequest> items;

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public String getOrderType() { return orderType; }
        public void setOrderType(String orderType) { this.orderType = orderType; }
        public Long getTableId() { return tableId; }
        public void setTableId(Long tableId) { this.tableId = tableId; }
        public String getCustomerName() { return customerName; }
        public void setCustomerName(String customerName) { this.customerName = customerName; }
        public String getCustomerPhone() { return customerPhone; }
        public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
        public String getDeliveryAddress() { return deliveryAddress; }
        public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
        public List<OrderItemRequest> getItems() { return items; }
        public void setItems(List<OrderItemRequest> items) { this.items = items; }
    }

    public static class OrderItemRequest {
        private Long productId;
        private Integer quantity;
        private String notes;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }
}
