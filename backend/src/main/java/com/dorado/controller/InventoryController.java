package com.dorado.controller;

import com.dorado.model.InventoryItem;
import com.dorado.model.InventoryTransaction;
import com.dorado.repository.InventoryItemRepository;
import com.dorado.repository.InventoryTransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/inventory")
@CrossOrigin(origins = "*")
public class InventoryController {

    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    public InventoryController(InventoryItemRepository inventoryItemRepository,
                               InventoryTransactionRepository inventoryTransactionRepository) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
    }

    @GetMapping
    public List<InventoryItem> getAllItems() {
        return inventoryItemRepository.findAll();
    }

    @GetMapping("/alerts")
    public List<InventoryItem> getLowStockItems() {
        return inventoryItemRepository.findLowStockItems();
    }

    @PostMapping
    public ResponseEntity<InventoryItem> createItem(@RequestBody InventoryItem item) {
        if (item.getStock() == null) {
            item.setStock(BigDecimal.ZERO);
        }
        InventoryItem saved = inventoryItemRepository.save(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventoryItem> updateItem(@PathVariable Long id, @RequestBody InventoryItem details) {
        return inventoryItemRepository.findById(id).map(item -> {
            item.setName(details.getName());
            item.setUnit(details.getUnit());
            item.setMinimumStock(details.getMinimumStock());
            return ResponseEntity.ok(inventoryItemRepository.save(item));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        return inventoryItemRepository.findById(id).map(item -> {
            inventoryItemRepository.delete(item);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/transaction")
    @Transactional
    public ResponseEntity<?> addTransaction(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        return inventoryItemRepository.findById(id).map(item -> {
            String type = (String) payload.get("transactionType"); // ENTRY, EXIT
            BigDecimal qty = new BigDecimal(payload.get("quantity").toString());
            String desc = (String) payload.get("description");

            if (qty.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body("{\"message\": \"La cantidad debe ser mayor que cero\"}");
            }

            BigDecimal currentStock = item.getStock();
            if ("ENTRY".equalsIgnoreCase(type)) {
                item.setStock(currentStock.add(qty));
            } else if ("EXIT".equalsIgnoreCase(type)) {
                if (currentStock.compareTo(qty) < 0) {
                    return ResponseEntity.badRequest().body("{\"message\": \"Stock insuficiente para realizar esta salida\"}");
                }
                item.setStock(currentStock.subtract(qty));
            } else {
                return ResponseEntity.badRequest().body("{\"message\": \"Tipo de transacción inválido (ENTRY/EXIT)\"}");
            }

            // Save item
            inventoryItemRepository.save(item);

            // Log transaction
            InventoryTransaction tx = new InventoryTransaction();
            tx.setInventoryItem(item);
            tx.setTransactionType(type.toUpperCase());
            tx.setQuantity(qty);
            tx.setDescription(desc);
            inventoryTransactionRepository.save(tx);

            return ResponseEntity.ok(item);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/transactions")
    public ResponseEntity<List<InventoryTransaction>> getItemTransactions(@PathVariable Long id) {
        if (!inventoryItemRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        List<InventoryTransaction> list = inventoryTransactionRepository.findByInventoryItemIdOrderByCreatedAtDesc(id);
        return ResponseEntity.ok(list);
    }
}
