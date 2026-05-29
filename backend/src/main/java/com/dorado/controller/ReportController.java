package com.dorado.controller;

import com.dorado.model.Order;
import com.dorado.model.OrderItem;
import com.dorado.model.Payment;
import com.dorado.repository.OrderRepository;
import com.dorado.repository.PaymentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;

    public ReportController(OrderRepository orderRepository, PaymentRepository paymentRepository) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
    }

    @GetMapping("/sales-by-date")
    public ResponseEntity<List<Map<String, Object>>> getSalesByDate() {
        List<Order> completedOrders = orderRepository.findAll().stream()
                .filter(o -> "COMPLETED".equals(o.getStatus()))
                .collect(Collectors.toList());

        // Group by date
        Map<LocalDate, BigDecimal> dateMap = new TreeMap<>();
        
        // Initialise last 7 days to ensure we have data points even if zero
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            dateMap.put(today.minusDays(i), BigDecimal.ZERO);
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (Order order : completedOrders) {
            if (order.getCreatedAt() != null) {
                LocalDate date = order.getCreatedAt().toLocalDate();
                BigDecimal total = dateMap.getOrDefault(date, BigDecimal.ZERO);
                dateMap.put(date, total.add(order.getTotalAmount()));
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        dateMap.forEach((date, amount) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("date", date.format(formatter));
            row.put("amount", amount);
            result.add(row);
        });

        return ResponseEntity.ok(result);
    }

    @GetMapping("/sales-by-category")
    public ResponseEntity<List<Map<String, Object>>> getSalesByCategory() {
        List<Order> completedOrders = orderRepository.findAll().stream()
                .filter(o -> "COMPLETED".equals(o.getStatus()))
                .collect(Collectors.toList());

        Map<String, BigDecimal> revenueMap = new HashMap<>();
        Map<String, Integer> quantityMap = new HashMap<>();

        for (Order order : completedOrders) {
            for (OrderItem item : order.getOrderItems()) {
                String catName = item.getProduct().getCategory().getName();
                BigDecimal itemTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                
                revenueMap.put(catName, revenueMap.getOrDefault(catName, BigDecimal.ZERO).add(itemTotal));
                quantityMap.put(catName, quantityMap.getOrDefault(catName, 0) + item.getQuantity());
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        revenueMap.forEach((cat, revenue) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("categoryName", cat);
            row.put("amount", revenue);
            row.put("quantity", quantityMap.getOrDefault(cat, 0));
            result.add(row);
        });

        return ResponseEntity.ok(result);
    }

    @GetMapping("/sales-by-product")
    public ResponseEntity<List<Map<String, Object>>> getSalesByProduct() {
        List<Order> completedOrders = orderRepository.findAll().stream()
                .filter(o -> "COMPLETED".equals(o.getStatus()))
                .collect(Collectors.toList());

        Map<String, Integer> quantityMap = new HashMap<>();

        for (Order order : completedOrders) {
            for (OrderItem item : order.getOrderItems()) {
                String prodName = item.getProduct().getName();
                quantityMap.put(prodName, quantityMap.getOrDefault(prodName, 0) + item.getQuantity());
            }
        }

        // Sort by quantity desc and limit to top 5
        List<Map<String, Object>> result = quantityMap.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(5)
                .map(entry -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("productName", entry.getKey());
                    row.put("quantity", entry.getValue());
                    return row;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/payment-methods")
    public ResponseEntity<List<Map<String, Object>>> getPaymentMethods() {
        List<Payment> payments = paymentRepository.findAll().stream()
                .filter(p -> "PAID".equals(p.getPaymentStatus()))
                .collect(Collectors.toList());

        Map<String, BigDecimal> amountMap = new HashMap<>();
        Map<String, Integer> countMap = new HashMap<>();

        // Initialize default methods
        String[] methods = {"CASH", "CARD", "YAPE", "PLIN"};
        for (String m : methods) {
            amountMap.put(m, BigDecimal.ZERO);
            countMap.put(m, 0);
        }

        for (Payment p : payments) {
            String method = p.getPaymentMethod();
            amountMap.put(method, amountMap.getOrDefault(method, BigDecimal.ZERO).add(p.getAmountPaid().subtract(p.getChangeAmount())));
            countMap.put(method, countMap.getOrDefault(method, 0) + 1);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        amountMap.forEach((method, amount) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("method", method);
            row.put("amount", amount);
            row.put("count", countMap.getOrDefault(method, 0));
            result.add(row);
        });

        return ResponseEntity.ok(result);
    }
}
